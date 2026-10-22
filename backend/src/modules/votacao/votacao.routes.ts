import { Router, Request, Response } from 'express';
import { VotacaoService, cargoValido } from './votacao.service.js';
import { obterBase } from './votacao.dados.js';

/*
  Resultado oficial de 2026 em SP (TSE). Rotas, todas GET e só leitura:

  /api/votacao/2026                               fonte e totais por cargo
  /api/votacao/2026/candidatos?cargo=&busca=&limite=   lista de candidatos com votos no estado
  /api/votacao/2026/candidatos/:id/municipios          votos de um candidato em cada cidade
  /api/votacao/2026/municipios/:ibge?cargo=&limite=&destaque=&zona=   ranking da cidade
  /api/votacao/2026/municipios/:ibge/zonas?cargo=&candidato=           resultado por zona
  /api/votacao/2026/concorrencia?candidato=&cidades=                   colegas de partido x alvo
  /api/votacao/2026/aliados?ibge=&limite=&minimo=                      não eleitos com votação forte

  cargo: federal | estadual | governador | senador. No cargo federal, o destaque
  padrão é Jefferson Campos (2274).
*/

const router = Router();
const service = new VotacaoService();

const texto = (v: unknown) => (Array.isArray(v) ? String(v[0] ?? '') : v === undefined ? '' : String(v));
const inteiro = (v: unknown, padrao: number, max: number) => {
  const n = parseInt(texto(v), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : padrao;
};
const param = (req: Request, nome: string) => texto(req.params[nome]);

// Dados fechados de eleição: podem ficar em cache por 1 hora no navegador
const cache = (res: Response) => res.set('Cache-Control', 'public, max-age=3600');

const responder = (fn: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
  try {
    const dados = await fn(req, res);
    if (res.headersSent) return;
    if (dados === null) {
      res.status(404).json({ error: 'Não encontrado' });
      return;
    }
    cache(res);
    res.json(dados);
  } catch (error) {
    console.error('Erro na votação 2026:', error);
    res.status(500).json({ error: 'Erro ao consultar a votação de 2026' });
  }
};

router.get('/', responder(() => service.fonte()));

router.get(
  '/candidatos',
  responder(async (req) => service.candidatos(cargoValido(texto(req.query.cargo)), texto(req.query.busca), inteiro(req.query.limite, 50, 3000)))
);

router.get('/candidatos/:id/municipios', responder(async (req) => service.votosDoCandidato(param(req, 'id'))));

router.get(
  '/municipios/:ibge',
  responder(async (req, res) => {
    const cargo = cargoValido(texto(req.query.cargo) || 'federal');
    if (!cargo) {
      res.status(400).json({ error: 'cargo deve ser federal, estadual, governador ou senador' });
      return undefined;
    }
    const zona = texto(req.query.zona) ? inteiro(req.query.zona, 0, 100000) : undefined;
    const destaque = texto(req.query.destaque) || undefined;
    const partido = texto(req.query.partido) || undefined;
    return service.rankingMunicipio(param(req, 'ibge'), cargo, inteiro(req.query.limite, 10, 2000), destaque, zona, partido);
  })
);

router.get(
  '/municipios/:ibge/zonas',
  responder(async (req, res) => {
    const cargo = cargoValido(texto(req.query.cargo) || 'federal');
    if (!cargo) {
      res.status(400).json({ error: 'cargo deve ser federal, estadual, governador ou senador' });
      return undefined;
    }
    return service.zonasDoMunicipio(param(req, 'ibge'), cargo, texto(req.query.candidato) || undefined);
  })
);

router.get(
  '/concorrencia',
  responder(async (req) => service.concorrenciaPartido(texto(req.query.candidato) || undefined, inteiro(req.query.cidades, 5, 50)))
);

router.get(
  '/aliados',
  responder(async (req) =>
    service.aliados({ ibge: texto(req.query.ibge) || undefined, limite: inteiro(req.query.limite, 30, 500), minimoVotos: inteiro(req.query.minimo, 15000, 10000000) })
  )
);

// Carrega os dados logo ao subir o servidor, para a primeira consulta não esperar
export const preCarregarVotacao = () => {
  obterBase().catch((e) => console.error('Não foi possível carregar a votação de 2026:', e));
};

export default router;
