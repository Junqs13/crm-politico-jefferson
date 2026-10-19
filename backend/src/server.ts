import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import municipiosRoutes from './modules/municipios/municipios.routes.js'; // Ajuste o caminho se necessário para a sua pasta de rotas

const app = express();
const port = process.env.PORT || 3333;

// Middlewares Globais
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rota de Health Check (para testar se a API está ativa na nuvem)
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API do Mapa Eleitoral está rodando!',
    timestamp: new Date().toISOString()
  });
});

// Rotas da API de Municípios (expondo /api/municipios/dobradas)
app.use('/api/municipios', municipiosRoutes);

// Iniciando o servidor
app.listen(port, () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📊 Acesse os dados em: http://localhost:${port}/api/municipios/dobradas`);
});