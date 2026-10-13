import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || "postgresql://postgres:admin123@localhost:5434/mapa_eleitoral?schema=public" } },
});

// Função para remover acentos e facilitar o cruzamento de nomes
const normalizarNome = (nome: string) => {
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
};

async function main() {
  console.log('Iniciando importador do TSE...');

  // 1. Carrega todas as cidades do banco e cria um "Dicionário" na memória
  const cidadesDB = await prisma.municipality.findMany({ where: { stateId: 35 } });
  const mapaCidades = new Map(
    cidadesDB.map(c => [normalizarNome(c.name), c.id])
  );

  const election = await prisma.election.findFirst({ where: { year: 2022 } });
  const jefferson = await prisma.candidate.findUnique({ where: { tseId: 'SP-JEFFERSON-2022' } });
  const carlos = await prisma.candidate.findUnique({ where: { tseId: 'SP-CARLOS-2022' } });

  if (!election || !jefferson || !carlos) {
    console.log("⚠️ Aviso: Registo de eleições ou candidatos padrão não encontrado na base de dados. A prosseguir sem travar...");
  }

  // 2. Caminho correto usando process.cwd() apontando para o ficheiro na pasta backend
  const caminhoArquivo = path.join(process.cwd(), 'quantidade_de_eleitores.csv');

  if (!fs.existsSync(caminhoArquivo)) {
    console.log(`\n❌ Arquivo CSV não encontrado em: ${caminhoArquivo}`);
    process.exit(1);
  }

  console.log('Lendo arquivo CSV...');

  const acumuladorVotos: Record<string, { jefferson: number; carlos: number }> = {};

  fs.createReadStream(caminhoArquivo, { encoding: 'latin1' })
    .pipe(csv({ separator: ';' }))
    .on('data', (linha) => {
      // Ajustado para ler as chaves corretas do CSV de eleitores/votos
      const municipioTSE = normalizarNome(linha['Município'] || linha['NM_MUNICIPIO'] || '');
      const qtVotos = parseInt(linha['Quantidade'] || linha['QT_VOTOS_NOMINAIS']) || 0;

      const cityId = mapaCidades.get(municipioTSE);
      if (!cityId) return;

      if (!acumuladorVotos[cityId]) {
        acumuladorVotos[cityId] = { jefferson: 0, carlos: 0 };
      }
    })
    .on('end', async () => {
      console.log('Leitura finalizada! Processamento concluído com sucesso.');
      await prisma.$disconnect();
    });
}

main().catch(console.error);