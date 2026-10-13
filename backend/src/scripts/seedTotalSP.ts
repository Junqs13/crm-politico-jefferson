import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || "postgresql://postgres:admin123@localhost:5434/mapa_eleitoral?schema=public" } },
});

async function main() {
  console.log('Iniciando expansão de dados para os 645 municípios de SP...');

  // Busca a eleição e os candidatos que criamos antes
  const election = await prisma.election.findFirst({ where: { year: 2022 } });
  const jefferson = await prisma.candidate.findUnique({ where: { tseId: 'SP-JEFFERSON-2022' } });
  const carlos = await prisma.candidate.findUnique({ where: { tseId: 'SP-CARLOS-2022' } });

  if (!election || !jefferson || !carlos) {
    throw new Error("Base não encontrada. Rode o seedElections.ts primeiro.");
  }

  // Pega todas as cidades de SP (estado 35)
  const cities = await prisma.municipality.findMany({ where: { stateId: 35 } });
  
  // Definimos a região de domínio político para gerar o mapa de calor com sentido real
  const redutoEleitoral = [
    'Sorocaba', 'Votorantim', 'Itu', 'Itapetininga', 'Tatuí', 
    'Salto', 'Itapeva', 'Ibiúna', 'Piedade', 'Porto Feliz', 'Boituva', 'Capão Bonito'
  ];

  let inseridos = 0;

  for (const city of cities) {
    let votosJeff = 0;
    let votosCarl = 0;

    // Regra de negócio estocástica para o MVP:
    if (redutoEleitoral.includes(city.name)) {
      // Força máxima no reduto (entre 5.000 e 25.000 votos por cidade)
      votosJeff = Math.floor(Math.random() * 20000) + 5000;
      votosCarl = Math.floor(Math.random() * 20000) + 5000;
    } else {
      // Votação pulverizada no resto do estado (entre 10 e 1.500 votos)
      votosJeff = Math.floor(Math.random() * 1500) + 10;
      votosCarl = Math.floor(Math.random() * 1500) + 10;
    }

    // Grava os votos de Jefferson
    await prisma.electoralResult.upsert({
      where: { candidateId_electionId_municipalityId: { candidateId: jefferson.id, electionId: election.id, municipalityId: city.id } },
      update: { votes: votosJeff },
      create: { candidateId: jefferson.id, electionId: election.id, municipalityId: city.id, votes: votosJeff }
    });

    // Grava os votos de Carlos
    await prisma.electoralResult.upsert({
      where: { candidateId_electionId_municipalityId: { candidateId: carlos.id, electionId: election.id, municipalityId: city.id } },
      update: { votes: votosCarl },
      create: { candidateId: carlos.id, electionId: election.id, municipalityId: city.id, votes: votosCarl }
    });

    inseridos++;
    if (inseridos % 100 === 0) console.log(`... ${inseridos} cidades calculadas e gravadas no banco.`);
  }

  console.log('✅ Expansão concluída! O banco de dados agora possui resultados para todas as cidades de SP.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());