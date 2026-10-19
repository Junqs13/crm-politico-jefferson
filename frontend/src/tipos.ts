/* Formato dos dados que a API devolve em /municipios/dobradas */

export interface ZonaEleitoral {
  zona: string;
  quantidade: string;
}

export interface Projecao {
  metaVotos: number;
  potencialCrescimento: number;
  prioridadeCampanha: string;
  crescimentoMetaPct?: number;
}

export interface Municipio {
  id: string;
  municipio: string;
  codigoIbge: string;
  votosJefferson: number;
  historicoJef?: Record<number, number>;
  historicoCandidatos: Record<string, Record<number, number>>;
  emendas: Record<string, number>;
  totalEmendas: number;
  totalDestinacoes: number;
  eleitorado: {
    totalEleitores: number;
    penetracao: string;
    zonas: ZonaEleitoral[];
  };
  projecao2030?: Projecao;
  /* nome antigo, enquanto o backend novo não estiver publicado */
  projecao2028?: Projecao;
}

export interface Lideranca {
  id: string;
  name: string;
  role: string;
  party: string | null;
  phone: string | null;
  alignment: string;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const ANOS_ELEICAO = [2002, 2006, 2010, 2014, 2018, 2022, 2026];
export const ANO_BASE = 2026;
export const ANO_META = 2030;

const PROJECAO_VAZIA: Projecao = { metaVotos: 0, potencialCrescimento: 0, prioridadeCampanha: 'MANUTENÇÃO', crescimentoMetaPct: 20 };

export const projecao = (c: Municipio): Projecao => c.projecao2030 ?? c.projecao2028 ?? PROJECAO_VAZIA;

export const votosJefNoAno = (c: Municipio, ano: number) => c.historicoJef?.[ano] ?? (ano === ANO_BASE ? c.votosJefferson : 0) ?? 0;
