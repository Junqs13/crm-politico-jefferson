import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

/*
  Importa os vereadores eleitos (planilha CLAUD_VEREADORES_ELEITOS) como lideranças do CRM.

  Regras:
  - Status APOIA -> alinhamento ALTO (fiel). Qualquer outro status ou vazio -> EM CONQUISTA.
  - Observações: votos do vereador e o candidato escrito na planilha.
  - A cidade é encontrada pelo código do IBGE.
  - Pode rodar mais de uma vez: se já existir uma liderança com o mesmo nome
    na mesma cidade, os dados são atualizados em vez de duplicados.

  Uso (na pasta backend, com DATABASE_URL apontando para o banco desejado):
    npx tsx src/scripts/importarVereadores.ts            -> mostra o que vai fazer, sem gravar
    npx tsx src/scripts/importarVereadores.ts --gravar   -> grava no banco
*/

interface Registro {
  municipio: string;
  ibgeCode: string;
  name: string;
  role: string;
  party: string | null;
  phone: string | null;
  alignment: 'ALTO' | 'EM CONQUISTA';
  notes: string;
  statusPlanilha: string;
}

const prisma = new PrismaClient();
const gravar = process.argv.includes('--gravar');

const chave = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

async function main() {
  const arquivo = path.resolve(process.cwd(), 'dados', 'vereadores_eleitos.json');
  const registros: Registro[] = JSON.parse(fs.readFileSync(arquivo, 'utf-8'));
  console.log(`${registros.length} vereadores na planilha. Modo: ${gravar ? 'GRAVAR' : 'simulação (use --gravar para gravar)'}`);

  const municipios = await prisma.municipality.findMany({
    where: { ibgeCode: { in: [...new Set(registros.map((r) => r.ibgeCode))] } },
    select: { id: true, ibgeCode: true, name: true },
  });
  const porIbge = new Map(municipios.map((m) => [m.ibgeCode, m]));

  let criados = 0;
  let atualizados = 0;
  const semCidade: string[] = [];

  for (const r of registros) {
    const m = porIbge.get(r.ibgeCode);
    if (!m) {
      semCidade.push(`${r.name} (${r.municipio})`);
      continue;
    }
    const existentes = await prisma.leadership.findMany({ where: { municipalityId: m.id }, select: { id: true, name: true } });
    const igual = existentes.find((e) => chave(e.name) === chave(r.name));
    const dados = { name: r.name, role: r.role, party: r.party, phone: r.phone, alignment: r.alignment, notes: r.notes };

    if (igual) {
      atualizados++;
      if (gravar) await prisma.leadership.update({ where: { id: igual.id }, data: dados });
    } else {
      criados++;
      if (gravar) await prisma.leadership.create({ data: { ...dados, municipalityId: m.id } });
    }
  }

  console.log(`${gravar ? 'Criados' : 'Seriam criados'}: ${criados}`);
  console.log(`${gravar ? 'Atualizados' : 'Seriam atualizados'} (já existiam): ${atualizados}`);
  if (semCidade.length) console.log(`Cidade não encontrada no banco (${semCidade.length}): ${semCidade.join(', ')}`);
}

main()
  .catch((e) => {
    console.error('Erro na importação:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
