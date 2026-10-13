import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Injetamos a URL de fallback diretamente caso o .env falhe no Windows
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:admin123@localhost:5434/mapa_eleitoral?schema=public"
    },
  },
});

async function main() {
  console.log('Iniciando cadastro do Estado-alvo...');

  // Inserimos apenas SP (Código IBGE 35)
  await prisma.state.upsert({
    where: { id: 35 },
    update: {},
    create: {
      id: 35,
      uf: 'SP',
      name: 'São Paulo',
    },
  });

  console.log('✅ Estado de SP cadastrado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro no seed de estado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });