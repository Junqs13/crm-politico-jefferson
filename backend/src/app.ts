import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const port = process.env.PORT || 3333;

// Middlewares Globais
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rota de Health Check (para testarmos se a API está viva)
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API do Mapa Eleitoral está rodando!',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🚀 Servidor backend rodando na porta ${port}`);
});