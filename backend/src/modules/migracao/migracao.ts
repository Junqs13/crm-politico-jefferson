import { PrismaClient } from '@prisma/client';

/*
  Cópia do banco atual (Render) para um novo PostgreSQL (Locaweb).

  Liga só quando a variável MIGRAR_PARA_URL existe no ambiente. Lê do banco
  atual (DATABASE_URL) e grava no novo, sem alterar nada no banco de origem.
  Pode rodar mais de uma vez: tabela que já existe é mantida e linha que já
  existe é ignorada. O andamento aparece em /api/v1/diagnostico/migracao.
*/

const ESQUEMA: string[] = [
  `DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('USER', 'ANALYST', 'ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "JobStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    password text NOT NULL,
    role "Role" NOT NULL DEFAULT 'USER',
    created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS import_jobs (
    id text PRIMARY KEY,
    dataset text NOT NULL,
    source text NOT NULL,
    status "JobStatus" NOT NULL DEFAULT 'RUNNING',
    started_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at timestamp(3),
    records_found integer NOT NULL DEFAULT 0,
    records_inserted integer NOT NULL DEFAULT 0,
    records_updated integer NOT NULL DEFAULT 0,
    records_rejected integer NOT NULL DEFAULT 0,
    errors jsonb
  )`,
  `CREATE TABLE IF NOT EXISTS states (
    id integer PRIMARY KEY,
    uf varchar(2) NOT NULL UNIQUE,
    name text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS parties (
    id serial PRIMARY KEY,
    number integer NOT NULL UNIQUE,
    acronym varchar(10) NOT NULL,
    name text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS elections (
    id serial PRIMARY KEY,
    year integer NOT NULL,
    round integer NOT NULL DEFAULT 1,
    UNIQUE (year, round)
  )`,
  `CREATE TABLE IF NOT EXISTS municipalities (
    id text PRIMARY KEY,
    ibge_code varchar(7) NOT NULL UNIQUE,
    name text NOT NULL,
    state_id integer NOT NULL REFERENCES states(id),
    latitude double precision,
    longitude double precision,
    imported_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) NOT NULL,
    source text NOT NULL DEFAULT 'IBGE'
  )`,
  `CREATE TABLE IF NOT EXISTS candidates (
    id text PRIMARY KEY,
    tse_id text UNIQUE,
    name text NOT NULL,
    urn_name text NOT NULL,
    office text NOT NULL,
    party_id integer NOT NULL REFERENCES parties(id),
    state_id integer NOT NULL REFERENCES states(id)
  )`,
  `CREATE TABLE IF NOT EXISTS electoral_results (
    id text PRIMARY KEY,
    candidate_id text NOT NULL REFERENCES candidates(id),
    election_id integer NOT NULL REFERENCES elections(id),
    municipality_id text NOT NULL REFERENCES municipalities(id),
    votes integer NOT NULL,
    percentage double precision,
    "position" integer,
    UNIQUE (candidate_id, election_id, municipality_id)
  )`,
  `CREATE TABLE IF NOT EXISTS "Leadership" (
    id text PRIMARY KEY,
    name text NOT NULL,
    role text NOT NULL,
    party text,
    phone text,
    alignment text NOT NULL,
    notes text,
    "municipalityId" text NOT NULL REFERENCES municipalities(id) ON DELETE CASCADE,
    "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" timestamp(3) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "Amendment" (
    id serial PRIMARY KEY,
    "categoryId" text NOT NULL,
    amount double precision NOT NULL,
    "municipalityId" text NOT NULL REFERENCES municipalities(id)
  )`,
];

// Ordem de cópia: quem é referenciado vem antes
const TABELAS = ['users', 'import_jobs', 'states', 'parties', 'elections', 'municipalities', 'candidates', 'electoral_results', 'Leadership', 'Amendment'];
const COM_SEQUENCIA = ['parties', 'elections', 'Amendment'];
const LOTE = 2000;

type Etapa = 'aguardando' | 'criando tabelas' | 'copiando' | 'conferindo' | 'concluida' | 'erro';
const estado: {
  etapa: Etapa;
  inicio: string | null;
  fim: string | null;
  tabelaAtual: string | null;
  tabelas: Record<string, { origem: number | null; destino: number | null }>;
  erro: string | null;
} = { etapa: 'aguardando', inicio: null, fim: null, tabelaAtual: null, tabelas: {}, erro: null };

export const statusMigracao = () => ({ ativa: Boolean(process.env.MIGRAR_PARA_URL), ...estado });

const q = (t: string) => `"${t}"`;

async function existe(db: PrismaClient, tabela: string) {
  const r = await db.$queryRawUnsafe<{ ok: string | null }[]>(`SELECT to_regclass('public.${q(tabela)}')::text AS ok`);
  return Boolean(r[0]?.ok);
}

async function contar(db: PrismaClient, tabela: string) {
  if (!(await existe(db, tabela))) return null;
  const r = await db.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${q(tabela)}`);
  return r[0].n;
}

export async function migrar(origem: PrismaClient, destino: PrismaClient) {
  estado.inicio = new Date().toISOString();
  estado.erro = null;
  try {
    estado.etapa = 'criando tabelas';
    for (const sql of ESQUEMA) await destino.$executeRawUnsafe(sql);

    estado.etapa = 'copiando';
    for (const tabela of TABELAS) {
      estado.tabelaAtual = tabela;
      const total = await contar(origem, tabela);
      estado.tabelas[tabela] = { origem: total, destino: null };
      if (!total) continue;
      for (let desde = 0; desde < total; desde += LOTE) {
        const [{ j }] = await origem.$queryRawUnsafe<{ j: string }[]>(
          `SELECT json_agg(t)::text AS j FROM (SELECT * FROM ${q(tabela)} ORDER BY id LIMIT ${LOTE} OFFSET ${desde}) t`
        );
        if (!j) break;
        await destino.$executeRawUnsafe(
          `INSERT INTO ${q(tabela)} SELECT * FROM json_populate_recordset(NULL::${q(tabela)}, $1::json) ON CONFLICT DO NOTHING`,
          j
        );
      }
    }
    for (const tabela of COM_SEQUENCIA) {
      await destino.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${q(tabela)}', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${q(tabela)}), 1))`
      );
    }

    estado.etapa = 'conferindo';
    estado.tabelaAtual = null;
    for (const tabela of TABELAS) {
      estado.tabelas[tabela] = { origem: await contar(origem, tabela), destino: await contar(destino, tabela) };
    }
    const divergentes = Object.entries(estado.tabelas).filter(([, c]) => (c.origem ?? 0) !== (c.destino ?? 0));
    if (divergentes.length) throw new Error(`contagens diferentes em: ${divergentes.map(([t]) => t).join(', ')}`);
    estado.etapa = 'concluida';
  } catch (e) {
    estado.etapa = 'erro';
    // Nunca devolve o endereço do banco: só a mensagem, com qualquer URL mascarada
    estado.erro = String((e as Error).message ?? e).replace(/postgres(ql)?:\/\/\S+/g, '[endereço oculto]').slice(0, 600);
  } finally {
    estado.fim = new Date().toISOString();
  }
}

export function iniciarMigracaoSeConfigurada() {
  const url = process.env.MIGRAR_PARA_URL;
  if (!url) return;
  const origem = new PrismaClient();
  const destino = new PrismaClient({ datasourceUrl: url });
  console.log('Migração para o novo banco iniciada');
  migrar(origem, destino)
    .then(() => console.log(`Migração: ${estado.etapa}${estado.erro ? ` (${estado.erro})` : ''}`))
    .finally(() => Promise.all([origem.$disconnect(), destino.$disconnect()]));
}
