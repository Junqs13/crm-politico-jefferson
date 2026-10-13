import 'dotenv/config';
import axios from 'axios';
import { PrismaClient, JobStatus } from '@prisma/client';

// Injetamos a URL de fallback diretamente caso o .env falhe no Windows
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:admin123@localhost:5434/mapa_eleitoral?schema=public"
    },
  },
});

// Tipagem baseada no retorno da API do IBGE
interface IBGEMunicipio {
  id: number;
  nome: string;
}

async function main() {
  console.log('Iniciando importação de municípios de São Paulo (IBGE)...');

  // Registra o início do Job de Importação para auditoria
  const job = await prisma.importJob.create({
    data: {
      dataset: 'IBGE_MUNICIPIOS_SP',
      source: 'IBGE API (estados/35/municipios)',
    },
  });

  try {
    // Busca apenas os municípios de SP (UF 35)
    const { data } = await axios.get<IBGEMunicipio[]>(
      'https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios'
    );

    let inserted = 0;

    for (const mun of data) {
      // O upsert garante que, se rodarmos o script duas vezes, ele atualiza em vez de duplicar
      await prisma.municipality.upsert({
        where: { ibgeCode: mun.id.toString() },
        update: { name: mun.nome },
        create: {
          ibgeCode: mun.id.toString(),
          name: mun.nome,
          stateId: 35, // Relaciona com o estado de SP criado no seed
          source: 'IBGE API',
        },
      });
      inserted++;
    }

    // Atualiza o Job informando o sucesso
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.SUCCESS,
        finishedAt: new Date(),
        recordsFound: data.length,
        recordsInserted: inserted,
      },
    });

    console.log(`✅ Importação concluída! ${inserted} municípios de SP inseridos/atualizados.`);

  } catch (error: any) {
    console.error('❌ Erro na importação:', error.message);
    
    // Atualiza o Job informando a falha
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: JobStatus.FAILED,
        finishedAt: new Date(),
        errors: { message: error.message },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

main();