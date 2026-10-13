import { Router } from 'express';
import { MunicipiosService } from './municipios.service.js';

const router = Router();
const service = new MunicipiosService();

router.get('/dobradas', async (req, res) => {
  try {
    // Pega o ano da URL (ex: ?ano=2018), se não vier, usa 2022 como padrão
    const ano = parseInt(req.query.ano as string) || 2022; 
    const dados = await service.obterMapaDobradas(ano);
    res.json(dados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar dados das dobradas' });
  }
});

export default router;