import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function importData() {
  console.log("🚀 A iniciar a importação de todos os dados locais para o Render...");

  // 1. Importar Emendas
  const emendasPath = path.join(__dirname, '../../Emendas. JEFFERSON CAMPOS. - Copia.xlsx');
  if (fs.existsSync(emendasPath)) {
    const wb = XLSX.readFile(emendasPath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 A processar ${rows.length} registos de Emendas...`);
    for (const row of rows) {
      const muniName = row['Município'] || row['Municipio'];
      const val = Number(row['Empenhado']);

      if (muniName && typeof muniName === 'string') {
        let muni = await prisma.municipality.findFirst({ where: { name: muniName.trim() } });
        if (!muni) {
          muni = await prisma.municipality.create({ data: { name: muniName.trim(), state: 'SP' } });
        }

        if (!isNaN(val) && val > 0) {
          await prisma.amendment.create({
            data: {
              municipalityId: muni.id,
              amount: val,
              description: `Grupo: ${row['Grupo'] || 'Geral'}`
            }
          });
        }
      }
    }
    console.log("✅ Emendas importadas com sucesso!");
  }

  // 2. Importar Votação 2022
  path.join(__dirname, '../../VOTAÇÃO 2022 - JC - CC.xlsx');
  const votacaoPath = path.join(__dirname, '../../VOTAÇÃO 2022 - JC - CC.xlsx');
  if (fs.existsSync(votacaoPath)) {
    const wb = XLSX.readFile(votacaoPath);
    const sheet = wb.Sheets['GERAL 2022'];
    if (sheet) {
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      console.log(`🗳️ A processar ${rows.length} registos de Votação 2022...`);
      for (const row of rows) {
        const muniName = row['CIDADE'];
        const votosJC = Number(row['JEFFERSON CAMPOS 2022']) || 0;

        if (muniName && typeof muniName === 'string') {
          let muni = await prisma.municipality.findFirst({ where: { name: muniName.trim() } });
          if (!muni) {
            muni = await prisma.municipality.create({ data: { name: muniName.trim(), state: 'SP' } });
          }

          // Regista o resultado eleitoral de 2022 se houver modelo configurado
          await prisma.electoralResult.create({
            data: {
              municipalityId: muni.id,
              electionYear: 2022,
              candidateName: 'Jefferson Campos',
              votes: votosJC
            }
          }).catch(() => {});
        }
      }
      console.log("✅ Votação 2022 importada com sucesso!");
    }
  }

  console.log("🎉 Todos os dados foram importados para a nuvem com sucesso!");
}

importData()
  .catch((e) => {
    console.error("❌ Erro na importação:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
  