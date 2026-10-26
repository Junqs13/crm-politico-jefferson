import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import municipiosRoutes from './modules/municipios/municipios.routes.js';
import votacaoRoutes from './modules/votacao/votacao.routes.js';
import { LeadershipsService, limparDados, validar, type DadosLideranca } from './modules/leaderships/leaderships.service.js';

const app = express();
const leadershipsService = new LeadershipsService();

// Middlewares Globais
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(cors());
app.use(express.json());

// Rota Raiz e Health Check
app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'API CRM Político Jefferson Campos Online!' });
});

app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'API do Mapa Eleitoral está rodando!',
    timestamp: new Date().toISOString(),
  });
});

// TESTE PROVISÓRIO: verifica se o PostgreSQL da Locaweb aceita conexão vinda do Render.
// Não usa usuário nem senha: só abre a porta e pergunta se o servidor aceita SSL.
app.get('/api/v1/diagnostico/locaweb', async (_req: Request, res: Response) => {
  const host = 'appcrmpolitico.postgresql.dbaas.com.br';
  const porta = 5432;
  const { lookup } = await import('node:dns/promises');
  const net = await import('node:net');
  const resultado: Record<string, unknown> = { host, porta };
  try {
    resultado.ips = (await lookup(host, { all: true })).map((a) => a.address);
  } catch (e) {
    resultado.dns = `falhou: ${(e as Error).message}`;
    return res.json(resultado);
  }
  const inicio = Date.now();
  resultado.conexao = await new Promise<string>((ok) => {
    const s = net.createConnection({ host, port: porta });
    const fim = (txt: string) => { s.destroy(); ok(txt); };
    s.setTimeout(10000, () => fim('tempo esgotado (porta bloqueada para acesso externo)'));
    s.on('error', (e) => fim(`erro: ${e.message}`));
    s.on('connect', () => {
      const req = Buffer.alloc(8);
      req.writeInt32BE(8, 0);
      req.writeInt32BE(80877103, 4); // pedido de SSL do protocolo PostgreSQL
      s.write(req);
    });
    s.once('data', (d) => {
      const c = String.fromCharCode(d[0]);
      fim(c === 'S' ? 'aberta, PostgreSQL respondeu e aceita SSL' : c === 'N' ? 'aberta, PostgreSQL respondeu sem SSL' : `aberta, resposta inesperada (${c})`);
    });
  });
  resultado.ms = Date.now() - inicio;
  res.json(resultado);
});

// Rotas de Municípios
app.use('/api/municipios', municipiosRoutes);

// Resultado oficial de 2026 (TSE), por cidade e zona
app.use('/api/votacao/2026', votacaoRoutes);
app.use('/municipios', municipiosRoutes);

// Controladores de Lideranças com tratamento estrito de tipos (evita erro de string | string[])
const listarLiderancas = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.municipalityId;
    const municipalityId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

    const lista = await leadershipsService.listarPorMunicipio(municipalityId);
    res.json(lista);
  } catch (error) {
    console.error('Erro ao listar lideranças:', error);
    res.status(500).json({ error: 'Erro ao listar lideranças' });
  }
};

const criarLideranca = async (req: Request, res: Response) => {
  try {
    const dados = limparDados(req.body);
    const erro = validar(dados);
    if (erro) {
      res.status(400).json({ error: erro });
      return;
    }
    const nova = await leadershipsService.criar(dados as DadosLideranca);
    res.status(201).json(nova);
  } catch (error) {
    console.error('Erro ao criar liderança:', error);
    res.status(500).json({ error: 'Erro ao criar liderança' });
  }
};

const atualizarLideranca = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);
    const dados = limparDados(req.body, true);
    const erro = validar(dados, true);
    if (erro) {
      res.status(400).json({ error: erro });
      return;
    }
    const atualizada = await leadershipsService.atualizar(id, dados);
    res.json(atualizada);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'Liderança não encontrada' });
      return;
    }
    console.error('Erro ao atualizar liderança:', error);
    res.status(500).json({ error: 'Erro ao atualizar liderança' });
  }
};

const removerLideranca = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : (rawId as string);

    await leadershipsService.remover(id);
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao remover liderança:', error);
    res.status(500).json({ error: 'Erro ao remover liderança' });
  }
};

// Registo das rotas de Lideranças com e sem prefixo /api
app.get('/api/leaderships/:municipalityId', listarLiderancas);
app.get('/leaderships/:municipalityId', listarLiderancas);
app.post('/api/leaderships', criarLideranca);
app.post('/leaderships', criarLideranca);
app.put('/api/leaderships/:id', atualizarLideranca);
app.put('/leaderships/:id', atualizarLideranca);
app.delete('/api/leaderships/:id', removerLideranca);
app.delete('/leaderships/:id', removerLideranca);

export default app;
