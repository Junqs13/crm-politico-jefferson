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
  console.log('--- INICIANDO IMPORTAÇÃO FASE B ---');

  const cidadesDB = await prisma.municipality.findMany({ where: { stateId: 35 } });
  const mapaCidades = new Map(cidadesDB.map(c => [normalizarNome(c.name), c.id]));

  const jefferson = await prisma.candidate.findUnique({ where: { tseId: 'SP-JEFFERSON-2022' } });
  const carlos = await prisma.candidate.findUnique({ where: { tseId: 'SP-CARLOS-2022' } });

  const eleicao2022 = await prisma.election.upsert({
    where: { year_round: { year: 2022, round: 1 } },
    update: {},
    create: { year: 2022, round: 1 }
  });

  // 1. IMPORTAR VOTAÇÃO 2022
  console.log('\nImportando Votos de 2022...');
  const caminhoVotos = path.resolve(process.cwd(), 'VOTAÇÃO 2022 - JC - CC.xlsx');
  const wbVotos = xlsx.readFile(caminhoVotos);
  const dataVotos = xlsx.utils.sheet_to_json(wbVotos.Sheets[wbVotos.SheetNames[0]], { header: 1 }) as any[][];
  
  let salvos2022 = 0;
  for (let i = 1; i < dataVotos.length; i++) {
    const row = dataVotos[i];
    const nomeCidade = row[3]; // Coluna CIDADE
    const votosJef = parseInt(row[4]) || 0; // JEFFERSON
    const votosCar = parseInt(row[5]) || 0; // CARLOS

    const cityId = mapaCidades.get(normalizarNome(String(nomeCidade)));
    if (cityId) {
      if (votosJef > 0) {
        await prisma.electoralResult.upsert({
          where: { candidateId_electionId_municipalityId: { candidateId: jefferson!.id, electionId: eleicao2022.id, municipalityId: cityId } },
          update: { votes: votosJef }, create: { candidateId: jefferson!.id, electionId: eleicao2022.id, municipalityId: cityId, votes: votosJef }
        });
      }
      if (votosCar > 0) {
        await prisma.electoralResult.upsert({
          where: { candidateId_electionId_municipalityId: { candidateId: carlos!.id, electionId: eleicao2022.id, municipalityId: cityId } },
          update: { votes: votosCar }, create: { candidateId: carlos!.id, electionId: eleicao2022.id, municipalityId: cityId, votes: votosCar }
        });
      }
      salvos2022++;
    }
  }
  console.log(`✅ ${salvos2022} cidades processadas para 2022.`);

  // 2. IMPORTAR EMENDAS
  console.log('\nImportando Emendas...');
  await prisma.amendment.deleteMany({}); // Limpa emendas antigas para não duplicar

  const caminhoEmendas = path.resolve(process.cwd(), 'Emendas. JEFFERSON CAMPOS. - Copia.xlsx');
  const wbEmendas = xlsx.readFile(caminhoEmendas);
  const dataEmendas = xlsx.utils.sheet_to_json(wbEmendas.Sheets[wbEmendas.SheetNames[0]], { header: 1 }) as any[][];

  let salvosEmendas = 0;
  for (let i = 1; i < dataEmendas.length; i++) {
    const row = dataEmendas[i];
    const categoria = row[0]; // Grupo
    const nomeCidade = row[1]; // Município
    const valor = parseFloat(row[2]); // Empenhado

    if (!nomeCidade || isNaN(valor) || !categoria) continue;

    const cityId = mapaCidades.get(normalizarNome(String(nomeCidade)));
    if (cityId) {
      await prisma.amendment.create({
        data: {
          categoryId: categoria.toUpperCase(),
          amount: valor,
          municipalityId: cityId
        }
      });
      salvosEmendas++;
    }
  }
  console.log(`✅ ${salvosEmendas} emendas importadas.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());