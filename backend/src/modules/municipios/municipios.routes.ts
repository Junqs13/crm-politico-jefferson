import { Router, Request, Response } from 'express';
import { MunicipiosService } from './municipios.service.js';

const router = Router();
const service = new MunicipiosService();

router.get('/dobradas', async (req: Request, res: Response) => {
  try {
    // Trata o parâmetro para garantir que seja extraída apenas uma string válida
    const anoParam = req.query.ano;
    const anoStr = Array.isArray(anoParam) ? anoParam[0] : anoParam;
    
    const ano = parseInt(anoStr as string, 10) || 2022; 
    const dados = await service.obterMapaDobradas(ano);
    res.json(dados);
  } catch (error) {
    console.error('Erro ao buscar dados das dobradas:', error);
    res.status(500).json({ error: 'Erro ao buscar dados das dobradas' });
  }
});

export default router;