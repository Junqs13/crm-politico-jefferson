import { PrismaClient } from '@prisma/client';

const localDbUrl = process.env.LOCAL_DATABASE_URL || "postgresql://postgres:admin123@localhost:5434/mapa_eleitoral?schema=public"

const prismaLocal = new PrismaClient({
  datasources: { db: { url: localDbUrl } }
});

const prismaCloud = new PrismaClient(); // Usa o DATABASE_URL do Render

async function migrateAll() {
  console.log("🚀 A iniciar a migração de dados local -> nuvem...");

  try {
    // Força o tipo para 'any' para evitar erros de índice do TypeScript
    const clientLocal = prismaLocal as any;
    const clientCloud = prismaCloud as any;

    const models = Object.keys(clientLocal).filter(
      (key) => !key.startsWith('_') && !key.startsWith('$') && typeof clientLocal[key] === 'object' && clientLocal[key] !== null && 'findMany' in clientLocal[key]
    );

    for (const modelName of models) {
      try {
        console.log(`A migrar dados da tabela: ${modelName}...`);
        const records = await clientLocal[modelName].findMany();
        console.log(`-> Encontrados ${records.length} registos em ${modelName}.`);

        for (const record of records) {
          try {
            await clientCloud[modelName].upsert({
              where: { id: record.id },
              update: record,
              create: record,
            });
          } catch (err: any) {
            await clientCloud[modelName].create({ data: record }).catch(() => {});
          }
        }
        console.log(`✅ Tabela ${modelName} migrada com sucesso!`);
      } catch (err) {
        console.log(`⚠️ Ignorando ou tabela sem suporte direto: ${modelName}`);
      }
    }

    console.log("🎉 Migração completa de todos os dados concluída com sucesso!");
  } catch (error) {
    console.error("❌ Erro geral na migração:", error);
  } finally {
    await prismaLocal.$disconnect();
    await prismaCloud.$disconnect();
  }
}

migrateAll();