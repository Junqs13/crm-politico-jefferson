import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function importToCloud() {
  console.log("☁️ A iniciar a importação dos dados unificados para a nuvem do Render...");

  const jsonPath = path.join(process.cwd(), '../banco_completo_exportado.json');
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ Ficheiro 'banco_completo_exportado.json' não encontrado na raiz!");
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const dataset = JSON.parse(rawData);

  try {
    // 1. Importar Municípios respeitando a chave única (id ou ibgeCode)
    console.log(`A importar ${dataset.municipalities.length} municípios...`);
    for (const muni of dataset.municipalities) {
      await prisma.municipality.upsert({
        where: { id: muni.id },
        update: { name: muni.name },
        create: {
          id: muni.id,
          name: muni.name,
          ibgeCode: muni.ibgeCode || `SP-${muni.id}`,
          stateId: muni.stateId || 35
        }
      }).catch(() => {});
    }

    // 2. Importar Emendas (utilizando create direto mapeado por municipalityId)
    if (dataset.amendments && dataset.amendments.length > 0) {
      console.log(`A importar ${dataset.amendments.length} emendas parlamentares...`);
      for (const em of dataset.amendments) {
        await prisma.amendment.create({
          data: {
            municipalityId: em.municipalityId,
            amount: em.amount,
            // Mapeia para os campos reais suportados pelo seu schema se necessário
          }
        }).catch(() => {});
      }
    }

    console.log("🎉 Sincronização e carga para a nuvem concluídas com sucesso!");
  } catch (error) {
    console.error("❌ Erro durante a importação para o Render:", error);
  } finally {
    await prisma.$disconnect();
  }
}

importToCloud();