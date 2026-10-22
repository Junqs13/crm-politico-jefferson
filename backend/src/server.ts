import app from './app.js';
import { preCarregarVotacao } from './modules/votacao/votacao.routes.js';

const port = Number(process.env.PORT) || 3333;

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${port}`);
  console.log(`📊 Rota ativa: http://localhost:${port}/api/municipios/dobradas`);
  preCarregarVotacao();
});
