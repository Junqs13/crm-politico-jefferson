import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import municipiosRoutes from './modules/municipios/municipios.routes.js';
import { LeadershipsService } from './modules/leaderships/leaderships.service.js';

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

// Rotas de Municípios
app.use('/api/municipios', municipiosRoutes);
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
    const nova = await leadershipsService.criar(req.body);
    res.status(201).json(nova);
  } catch (error) {
    console.error('Erro ao criar liderança:', error);
    res.status(500).json({ error: 'Erro ao criar liderança' });
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
app.delete('/api/leaderships/:id', removerLideranca);
app.delete('/leaderships/:id', removerLideranca);

export default app;
