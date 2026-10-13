import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import path from 'path';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || "postgresql://postgres:admin123@localhost:5434/mapa_eleitoral?schema=public" } },
});

// Função para limpar o nome da cidade e garantir o cruzamento perfeito com o banco
const normalizarNome = (nome: string) => {
  if (!nome) return '';
  let n = nome.replace(/^SP\s*-\s*/i, '');
  return n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
};

async function main() {
  console.log('Iniciando importação do Histórico Excel (2002-2018)...');

  const cidadesDB = await prisma.municipality.findMany({ where: { stateId: 35 } });
  const mapaCidades = new Map(cidadesDB.map(c => [normalizarNome(c.name), c.id]));

  const jefferson = await prisma.candidate.findUnique({ where: { tseId: 'SP-JEFFERSON-2022' } });
  const carlos = await prisma.candidate.findUnique({ where: { tseId: 'SP-CARLOS-2022' } });
  
  if (!jefferson || !carlos) throw new Error("Candidatos não encontrados! Rode o seedElections.ts primeiro.");

  const anos = [2002, 2006, 2010, 2014, 2018];
  const eleicoes: Record<number, any> = {};
  for (const ano of anos) {
    eleicoes[ano] = await prisma.election.upsert({
      where: { year_round: { year: ano, round: 1 } },
      update: {},
      create: { year: ano, round: 1 }
    });
  }

  const caminhoArquivo = path.resolve(process.cwd(), 'Cidades e votos JC - CC - 2002 - 2018.xlsx');
  console.log(`A ler o ficheiro: ${caminhoArquivo}`);
  
  // Utilizando a biblioteca corretamente agora
  const workbook = xlsx.readFile(caminhoArquivo);

  const processarColuna = async (sheetName: string, candidateId: string, colCidade: number, colVoto: number, ano: number) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    let salvos = 0;
    
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      
      const nomeCidade = row[colCidade];
      const votos = parseInt(row[colVoto]);
      
      if (!nomeCidade || isNaN(votos) || votos === 0) continue;
      if (typeof nomeCidade === 'string' && nomeCidade.toUpperCase().includes('TOTAL')) continue;

      const cityId = mapaCidades.get(normalizarNome(String(nomeCidade)));
      if (cityId) {
        await prisma.electoralResult.upsert({
          where: { candidateId_electionId_municipalityId: { candidateId, electionId: eleicoes[ano].id, municipalityId: cityId } },
          update: { votes: votos },
          create: { candidateId, electionId: eleicoes[ano].id, municipalityId: cityId, votes: votos }
        });
        salvos++;
      }
    }
    console.log(`✅ ${ano} - ${sheetName}: ${salvos} cidades processadas.`);
  };

  console.log('\n--- Processando Jefferson Campos ---');
  await processarColuna('JEFFERSON CAMPOS', jefferson.id, 0, 1, 2018);
  await processarColuna('JEFFERSON CAMPOS', jefferson.id, 3, 4, 2014);
  await processarColuna('JEFFERSON CAMPOS', jefferson.id, 6, 7, 2010);
  await processarColuna('JEFFERSON CAMPOS', jefferson.id, 9, 10, 2006);
  await processarColuna('JEFFERSON CAMPOS', jefferson.id, 12, 13, 2002);

  console.log('\n--- Processando Carlos Cezar ---');
  await processarColuna('CARLOS CEZAR', carlos.id, 0, 1, 2018);
  await processarColuna('CARLOS CEZAR', carlos.id, 3, 4, 2014);
  await processarColuna('CARLOS CEZAR', carlos.id, 6, 7, 2010);

  console.log('\n🚀 Importação do Histórico Excel concluída com sucesso!');
}

main().catch(console.error).finally(() => prisma.$disconnect());