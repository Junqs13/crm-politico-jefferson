import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || "postgresql://postgres:admin123@localhost:5434/mapa_eleitoral?schema=public" } },
});

async function exportAll() {
  console.log("📦 A exportar todos os dados da base de dados local...");

  try {
    const municipalities = await prisma.municipality.findMany();
    const amendments = await prisma.amendment.findMany();
    const electoralResults = await prisma.electoralResult.findMany();
    const candidates = await prisma.candidate.findMany();
    const elections = await prisma.election.findMany();
    const parties = await prisma.party.findMany();
    const leaderships = await prisma.leadership.findMany();

    const fullDataset = {
      exportedAt: new Date().toISOString(),
      municipalities,
      amendments,
      electoralResults,
      candidates,
      elections,
      parties,
leaderships
    };

    const outputPath = path.join(process.cwd(), '../banco_completo_exportado.json');
    fs.writeFileSync(outputPath, JSON.stringify(fullDataset, null, 2), 'utf-8');

    console.log(`✅ Base de dados exportada com sucesso para: ${outputPath}`);
  } catch (error) {
    console.error("❌ Erro ao exportar dados:", error);
  } finally {
    await prisma.$disconnect();
  }
}

exportAll();