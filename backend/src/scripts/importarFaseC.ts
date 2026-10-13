import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

const normalizarNome = (nome: string) => {
  if (!nome) return '';
  let n = nome.replace(/^SP\s*-\s*/i, '');
  return n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
};

async function main() {
  console.log('--- INICIANDO IMPORTAÇÃO FASE C (TODOS OS CANDIDATOS) ---');

  const cidadesDB = await prisma.municipality.findMany({ where: { stateId: 35 } });
  const mapaCidades = new Map(cidadesDB.map(c => [normalizarNome(c.name), c.id]));

  // Garante que todos os candidatos existem no banco
  const candidatosInfo = [
    { tseId: 'SP-JEFFERSON-2022', name: 'Jefferson Campos', urnName: 'JEFFERSON CAMPOS', office: 'Deputado Federal', partyNumber: 22 },
    { tseId: 'SP-CARLOS-2022', name: 'Carlos Cezar', urnName: 'CARLOS CEZAR', office: 'Deputado Estadual', partyNumber: 22 },
    { tseId: 'SP-WALDIR-2010', name: 'Waldir Agnello', urnName: 'WALDIR AGNELLO', office: 'Deputado Estadual', partyNumber: 22 },
    { tseId: 'SP-CELSO-2014', name: 'Celso Nascimento', urnName: 'CELSO NASCIMENTO', office: 'Deputado Estadual', partyNumber: 22 },
    { tseId: 'SP-SUELEI-2026', name: 'Suélei Gonçalves', urnName: 'SUÉLEI GONÇALVES', office: 'Deputada Estadual', partyNumber: 22 },
    { tseId: 'SP-LUCAS-2026', name: 'Lucas Flores', urnName: 'LUCAS FLORES', office: 'Deputado Estadual', partyNumber: 22 },
  ];

  // Garante partido PL (22)
  const party = await prisma.party.upsert({
    where: { number: 22 },
    update: {},
    create: { number: 22, acronym: 'PL', name: 'Partido Liberal' }
  });

  const candMap = new Map();
  for (const c of candidatosInfo) {
    const cand = await prisma.candidate.upsert({
      where: { tseId: c.tseId },
      update: { name: c.name, urnName: c.urnName },
      create: { tseId: c.tseId, name: c.name, urnName: c.urnName, office: c.office, partyId: party.id, stateId: 35 }
    });
    candMap.set(c.name, cand.id);
  }

  // Cria as eleições necessárias (2002 a 2026)
  const anos = [2002, 2006, 2010, 2014, 2018, 2022, 2026];
  const eleicoes: Record<number, any> = {};
  for (const ano of anos) {
    eleicoes[ano] = await prisma.election.upsert({
      where: { year_round: { year: ano, round: 1 } },
      update: {},
      create: { year: ano, round: 1 }
    });
  }

  // 1. IMPORTAR CELSO E WALDIR (CELSO WALDIR.xlsx)
  console.log('\nImportando Waldir Agnello e Celso Nascimento (2002-2014)...');
  const wbCW = xlsx.readFile(path.resolve(process.cwd(), 'CELSO WALDIR.xlsx'));
  const dataCW = xlsx.utils.sheet_to_json(wbCW.Sheets['CIDADES']) as any[];

  for (const row of dataCW) {
    const nomeCidade = row['CIDADE'];
    const cityId = mapaCidades.get(normalizarNome(String(nomeCidade)));
    if (!cityId) continue;

    // Waldir Agnello (2002, 2006, 2010)
    if (row['WALDIR AGNELO 2002']) {
      await gravarResultado(candMap.get('Waldir Agnello'), eleicoes[2002].id, cityId, row['WALDIR AGNELO 2002']);
    }
    if (row['WALDIR AGNELO 2006']) {
      await gravarResultado(candMap.get('Waldir Agnello'), eleicoes[2006].id, cityId, row['WALDIR AGNELO 2006']);
    }
    if (row['WALDIR AGNELO 2010']) {
      await gravarResultado(candMap.get('Waldir Agnello'), eleicoes[2010].id, cityId, row['WALDIR AGNELO 2010']);
    }

    // Celso Nascimento (2010, 2014)
    if (row['CELSO NASCIMENTO 2010']) {
      await gravarResultado(candMap.get('Celso Nascimento'), eleicoes[2010].id, cityId, row['CELSO NASCIMENTO 2010']);
    }
    if (row['CELSO NASCIMENTO 2014']) {
      await gravarResultado(candMap.get('Celso Nascimento'), eleicoes[2014].id, cityId, row['CELSO NASCIMENTO 2014']);
    }
  }

  // 2. IMPORTAR 2026 (2026.xlsx)
  console.log('\nImportando Dados de 2026...');
  const wb2026 = xlsx.readFile(path.resolve(process.cwd(), '2026.xlsx'));

  const processarAba2026 = async (sheetName: string, candName: string) => {
    const sheet = wb2026.Sheets[sheetName];
    if (!sheet) return;
    const df = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    const candId = candMap.get(candName);

    // Varre tabela 1 (col 0 e 1) e tabela 2 (col 3 e 4)
    for (let i = 8; i < df.length; i++) {
      // Tabela esquerda
      if (df[i][0] && df[i][1] !== undefined) {
        const cityId = mapaCidades.get(normalizarNome(String(df[i][0])));
        const votos = parseInt(df[i][1]) || 0;
        if (cityId && votos > 0) await gravarResultado(candId, eleicoes[2026].id, cityId, votos);
      }
      // Tabela direita
      if (df[i][3] && df[i][4] !== undefined) {
        const cityId = mapaCidades.get(normalizarNome(String(df[i][3])));
        const votos = parseInt(df[i][4]) || 0;
        if (cityId && votos > 0) await gravarResultado(candId, eleicoes[2026].id, cityId, votos);
      }
    }
  };

  await processarAba2026('Jefferson Campos', 'Jefferson Campos');
  await processarAba2026('Suélei Gonçalves', 'Suélei Gonçalves');
  await processarAba2026('Lucas Flores', 'Lucas Flores');

  console.log('\n🚀 Importação da Fase C concluída com sucesso!');
}

async function gravarResultado(candidateId: string, electionId: number, municipalityId: string, votes: number) {
  if (!candidateId || isNaN(votes) || votes === 0) return;
  await prisma.electoralResult.upsert({
    where: { candidateId_electionId_municipalityId: { candidateId, electionId, municipalityId } },
    update: { votes },
    create: { candidateId, electionId, municipalityId, votes }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());