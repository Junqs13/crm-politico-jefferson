import express from 'express';
import cors from 'cors';
import municipiosRoutes from './modules/municipios/municipios.routes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/municipios', municipiosRoutes);

// Iniciando o servidor
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Acesse os dados em: http://localhost:${PORT}/api/municipios/dobradas`);
});