import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { PrismaClient } from '@prisma/client';

/*
  Resultado oficial de 2026 (TSE, votação nominal por município e zona, SP, 1º turno).
  O arquivo dados/votacao_2026_sp.json.gz vai junto com o backend e é carregado na memória
  na primeira consulta: são dados fechados, que não mudam, e assim não ocupam o banco.
*/

export type Cargo = 'federal' | 'estadual' | 'governador' | 'senador';
export const CARGOS: Cargo[] = ['federal', 'estadual', 'governador', 'senador'];

export interface Candidato {
  id: string; // SQ_CANDIDATO do TSE
  numero: number;
  cargo: Cargo;
  nomeUrna: string;
  nome: string;
  partido: string;
  federacao: string | null;
  situacao: string;
  votos: number; // válidos
  votosNominais: number; // inclui anulados sub judice
  destinacao: string;
}

export interface BaseVotacao {
  fonte: string;
  candidatos: Candidato[];
  porId: Map<string, number>;
  municipios: string[]; // código IBGE por índice
  zonasPorMunicipio: number[][];
  nomeMunicipio: Map<string, string>;
  idxMunicipio: Map<string, number>;
  // linhas de voto, ordenadas por município e zona
  mun: Int32Array;
  zona: Int32Array;
  cand: Int32Array;
  votos: Int32Array;
  inicioMunicipio: Int32Array; // linha onde começa cada município (tamanho = municípios + 1)
  linhasPorCandidato: Int32Array[];
}

const ARQUIVO = path.resolve(process.cwd(), 'dados', 'votacao_2026_sp.json.gz');
let carregando: Promise<BaseVotacao> | null = null;

async function nomesDosMunicipios(): Promise<Map<string, string>> {
  try {
    const prisma = new PrismaClient();
    const lista = await prisma.municipality.findMany({ select: { ibgeCode: true, name: true } });
    await prisma.$disconnect();
    return new Map(lista.map((m) => [m.ibgeCode, m.name]));
  } catch (e) {
    console.warn('Votação 2026: nomes de municípios indisponíveis, usando só o código IBGE', e);
    return new Map();
  }
}

async function carregar(): Promise<BaseVotacao> {
  const inicio = Date.now();
  const bruto = JSON.parse(zlib.gunzipSync(fs.readFileSync(ARQUIVO)).toString('utf-8'));

  const candidatos: Candidato[] = bruto.candidatos.map((c: any[]) => ({
    id: c[0],
    numero: c[1],
    cargo: c[2],
    nomeUrna: c[3],
    nome: c[4],
    partido: c[5],
    federacao: c[6],
    situacao: c[7],
    votos: c[8],
    votosNominais: c[9],
    destinacao: c[10],
  }));

  const municipios: string[] = bruto.municipios.map((m: any[]) => m[0]);
  const zonasPorMunicipio: number[][] = bruto.municipios.map((m: any[]) => m[1]);
  const [mun, zona, cand, votos] = (bruto.votos as number[][]).map((col) => Int32Array.from(col));

  const inicioMunicipio = new Int32Array(municipios.length + 1);
  for (let i = 0, m = 0; m <= municipios.length; m++) {
    while (i < mun.length && mun[i] < m) i++;
    inicioMunicipio[m] = i;
  }

  const contagem = new Int32Array(candidatos.length);
  for (let i = 0; i < cand.length; i++) contagem[cand[i]]++;
  const linhasPorCandidato = candidatos.map((_, i) => new Int32Array(contagem[i]));
  const pos = new Int32Array(candidatos.length);
  for (let i = 0; i < cand.length; i++) linhasPorCandidato[cand[i]][pos[cand[i]]++] = i;

  const base: BaseVotacao = {
    fonte: bruto.fonte,
    candidatos,
    porId: new Map(candidatos.map((c, i) => [c.id, i])),
    municipios,
    zonasPorMunicipio,
    nomeMunicipio: await nomesDosMunicipios(),
    idxMunicipio: new Map(municipios.map((m, i) => [m, i])),
    mun,
    zona,
    cand,
    votos,
    inicioMunicipio,
    linhasPorCandidato,
  };
  console.log(`📥 Votação 2026 carregada: ${candidatos.length} candidatos, ${votos.length} linhas, em ${Date.now() - inicio} ms`);
  return base;
}

export function obterBase(): Promise<BaseVotacao> {
  if (!carregando) {
    carregando = carregar().catch((e) => {
      carregando = null;
      throw e;
    });
  }
  return carregando;
}

export const existeArquivo = () => fs.existsSync(ARQUIVO);
