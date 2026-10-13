import { PrismaClient } from '@prisma/client';

// Usamos a mesma URL direta para evitar problemas no Windows
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:admin123@localhost:5434/mapa_eleitoral?schema=public"
    },
  },
});

async function main() {
  console.log('Iniciando ambiente eleitoral base...');

  // 1. Criar Eleição 2022
  const election = await prisma.election.upsert({
    where: { year_round: { year: 2022, round: 1 } },
    update: {},
    create: { year: 2022, round: 1 }
  });

  // 2. Criar Partido (Ambos disputaram pelo PL em 2022)
  const partyPL = await prisma.party.upsert({
    where: { number: 22 },
    update: {},
    create: { number: 22, acronym: 'PL', name: 'Partido Liberal' }
  });

  // 3. Criar os Candidatos Alvo
  const jefferson = await prisma.candidate.upsert({
    where: { tseId: 'SP-JEFFERSON-2022' }, 
    update: {},
    create: {
      tseId: 'SP-JEFFERSON-2022',
      name: 'Jefferson Campos',
      urnName: 'JEFFERSON CAMPOS',
      office: 'Deputado Federal',
      partyId: partyPL.id,
      stateId: 35 // SP
    }
  });

  const carlos = await prisma.candidate.upsert({
    where: { tseId: 'SP-CARLOS-2022' },
    update: {},
    create: {
      tseId: 'SP-CARLOS-2022',
      name: 'Carlos Cezar',
      urnName: 'CARLOS CEZAR',
      office: 'Deputado Estadual',
      partyId: partyPL.id,
      stateId: 35 // SP
    }
  });

  // 4. Buscar cidades-chave para injetar os resultados simulados
  const cityNames = ['Sorocaba', 'Votorantim', 'Itu', 'Itapetininga', 'Campinas'];
  const cities = await prisma.municipality.findMany({
    where: { name: { in: cityNames }, stateId: 35 }
  });

  // 5. Matriz de votação fictícia (baseada em força regional)
  const simulacaoVotos = {
    'Sorocaba': { jefferson: 45000, carlos: 52000 },
    'Votorantim': { jefferson: 8500, carlos: 9200 },
    'Itu': { jefferson: 3200, carlos: 3500 },
    'Itapetininga': { jefferson: 5100, carlos: 4800 },
    'Campinas': { jefferson: 1200, carlos: 900 }
  };

  let resultsInserted = 0;

  for (const city of cities) {
    // TypeScript type-safe casting
    const votos = simulacaoVotos[city.name as keyof typeof simulacaoVotos];
    if (!votos) continue;

    // Inserir votos para Jefferson Campos
    await prisma.electoralResult.upsert({
      where: {
        candidateId_electionId_municipalityId: {
          candidateId: jefferson.id,
          electionId: election.id,
          municipalityId: city.id
        }
      },
      update: { votes: votos.jefferson },
      create: {
        candidateId: jefferson.id,
        electionId: election.id,
        municipalityId: city.id,
        votes: votos.jefferson,
        percentage: 15.0, // Dado simulado
        position: 1       // Dado simulado
      }
    });

    // Inserir votos para Carlos Cezar
    await prisma.electoralResult.upsert({
      where: {
        candidateId_electionId_municipalityId: {
          candidateId: carlos.id,
          electionId: election.id,
          municipalityId: city.id
        }
      },
      update: { votes: votos.carlos },
      create: {
        candidateId: carlos.id,
        electionId: election.id,
        municipalityId: city.id,
        votes: votos.carlos,
        percentage: 16.5,
        position: 1
      }
    });

    resultsInserted += 2;
  }

  console.log(`✅ Seed Concluído: Eleição 2022 criada. Perfis ativados e ${resultsInserted} resultados gravados!`);
}

main()
  .catch((e) => {
    console.error('Erro no seed eleitoral:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });