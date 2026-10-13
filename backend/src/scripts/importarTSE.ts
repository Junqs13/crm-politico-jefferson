import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || "postgresql://postgres:admin123@localhost:5434/mapa_eleitoral?schema=public" } },
});

// Função para remover acentos e facilitar o cruzamento de nomes (Ex: "SÃO PAULO" vira "SAO PAULO")
const normalizarNome = (nome: string) => {
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
};

async function main() {
  console.log('Iniciando importador do TSE...');

  // 1. Carrega todas as cidades do banco e cria um "Dicionário" na memória para busca super rápida
  const cidadesDB = await prisma.municipality.findMany({ where: { stateId: 35 } });
  const mapaCidades = new Map(
    cidadesDB.map(c => [normalizarNome(c.name), c.id])
  );

  const election = await prisma.election.findFirst({ where: { year: 2022 } });
  const jefferson = await prisma.candidate.findUnique({ where: { tseId: 'SP-JEFFERSON-2022' } });
  const carlos = await prisma.candidate.findUnique({ where: { tseId: 'SP-CARLOS-2022' } });

  if (!election || !jefferson || !carlos) throw new Error("Base não encontrada.");

  // 2. Caminho onde o arquivo CSV do TSE vai ficar salvo
  // Exemplo: colocaremos o arquivo na raiz do backend com o nome 'vota_sp_2022.csv'
  const caminhoArquivo = path.resolve(__dirname, '../../../vota_sp_2022.csv');

  if (!fs.existsSync(caminhoArquivo)) {
    console.log(`\n❌ Arquivo CSV não encontrado em: ${caminhoArquivo}`);
    console.log(`Por favor, coloque o arquivo baixado do TSE na pasta raiz do 'backend' com o nome 'vota_sp_2022.csv'`);
    process.exit(1);
  }

  console.log('Lendo arquivo CSV...');

  // Estrutura para acumular os votos antes de salvar no banco
  const acumuladorVotos: Record<string, { jefferson: number; carlos: number }> = {};

  fs.createReadStream(caminhoArquivo, { encoding: 'latin1' }) // TSE costuma usar codificação latin1
    .pipe(csv({ separator: ';' })) // TSE usa ponto e vírgula como separador
    .on('data', (linha) => {
      // Essas são as colunas padrão dos arquivos do TSE (Boletim de Urna / Votação Seção)
      const cargo = linha['DS_CARGO'];
      const nomeUrna = linha['NM_URNA_CANDIDATO'];
      const municipioTSE = normalizarNome(linha['NM_MUNICIPIO']);
      const qtVotos = parseInt(linha['QT_VOTOS_NOMINAIS']) || 0;

      const cityId = mapaCidades.get(municipioTSE);
      if (!cityId) return; // Se não achou a cidade, ignora

      if (!acumuladorVotos[cityId]) {
        acumuladorVotos[cityId] = { jefferson: 0, carlos: 0 };
      }

      // Se for voto do Jefferson
      if (cargo === 'Deputado Federal' && nomeUrna === 'JEFFERSON CAMPOS') {
        acumuladorVotos[cityId].jefferson += qtVotos;
      }

      // Se for voto do Carlos
      if (cargo === 'Deputado Estadual' && nomeUrna === 'CARLOS CEZAR') {
        acumuladorVotos[cityId].carlos += qtVotos;
      }
    })
    .on('end', async () => {
      console.log('Leitura finalizada! Salvando votos processados no banco de dados...');
      let salvos = 0;

      for (const [cityId, votos] of Object.entries(acumuladorVotos)) {
        if (votos.jefferson > 0) {
          await prisma.electoralResult.upsert({
            where: { candidateId_electionId_municipalityId: { candidateId: jefferson.id, electionId: election.id, municipalityId: cityId } },
            update: { votes: votos.jefferson },
            create: { candidateId: jefferson.id, electionId: election.id, municipalityId: cityId, votes: votos.jefferson }
          });
        }
        if (votos.carlos > 0) {
          await prisma.electoralResult.upsert({
            where: { candidateId_electionId_municipalityId: { candidateId: carlos.id, electionId: election.id, municipalityId: cityId } },
            update: { votes: votos.carlos },
            create: { candidateId: carlos.id, electionId: election.id, municipalityId: cityId, votes: votos.carlos }
          });
        }
        salvos++;
      }
      
      console.log(`✅ Importação Oficial concluída! Votos computados em ${salvos} cidades.`);
      await prisma.$disconnect();
    });
}

main().catch(console.error);