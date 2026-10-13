import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 A iniciar a carga inicial de dados na nuvem (Render)...");

  // Caminho para o ficheiro de Emendas
  const emendasPath = path.join(__dirname, '../../Emendas. JEFFERSON CAMPOS. - Copia.xlsx');

  if (fs.existsSync(emendasPath)) {
    console.log("📊 A processar o arquivo de Emendas...");
    const workbook = XLSX.readFile(emendasPath);
    const sheetName = workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let importedCount = 0;
    for (const row of rows) {
      const municipioNome = row['Município'] || row['Municipio'];
      const valorEmpenhado = row['Empenhado'];

      if (municipioNome && typeof municipioNome === 'string') {
        // 1. Garante que o município existe
        let municipio = await prisma.municipality.findFirst({
          where: { name: municipioNome.trim() }
        });

        if (!municipio) {
          municipio = await prisma.municipality.create({
            data: {
              name: municipioNome.trim(),
              state: 'SP' // Estado padrão do projeto
            }
          });
        }

        // 2. Insere a emenda associada ao município
        if (valorEmpenhado && !isNaN(Number(valorEmpenhado))) {
          await prisma.amendment.create({
            data: {
              municipalityId: municipio.id,
              amount: Number(valorEmpenhado),
              description: `Grupo: ${row['Grupo'] || 'Geral'}`
            }
          });
          importedCount++;
        }
      }
    }
    console.log(`✅ ${importedCount} registos de emendas importados com sucesso!`);
  } else {
    console.log("⚠️ Ficheiro de Emendas não encontrado na raiz.");
  }

  console.log("🎉 Carga inicial concluída com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });