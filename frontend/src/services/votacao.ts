import { api } from './api';

/* Resultado oficial de 2026 (TSE) servido pela API em /votacao/2026 */

export type Cargo = 'federal' | 'estadual' | 'governador' | 'senador';

export interface CandidatoResumo {
  id: string;
  numero: number;
  cargo: Cargo;
  nomeUrna: string;
  partido: string;
  federacao: string | null;
  situacao: string;
  votos: number;
}

export interface LinhaRanking extends CandidatoResumo {
  posicao: number | null;
  pct: number;
}

export interface RankingMunicipio {
  municipio: { ibge: string; nome: string };
  cargo: Cargo;
  zona: number | null;
  partido: string | null;
  zonas: number[];
  totalValidos: number;
  candidatosComVoto: number;
  ranking: LinhaRanking[];
  destaque: LinhaRanking | null;
}

export interface ZonasMunicipio {
  municipio: { ibge: string; nome: string };
  cargo: Cargo;
  candidato: CandidatoResumo | null;
  zonas: {
    zona: number;
    totalValidos: number;
    lider: (CandidatoResumo & { pct: number }) | null;
    candidato: { votos: number; pct: number; posicao: number | null } | null;
  }[];
}

export interface VotosCandidato {
  candidato: CandidatoResumo;
  cidadesComVoto: number;
  municipios: { ibge: string; nome: string; votos: number; pct: number; posicao: number }[];
}

export interface Concorrencia {
  alvo: CandidatoResumo;
  partido: string;
  cargo: Cargo;
  cidadesComVotoAlvo: number;
  alvoLideraPartido: number;
  candidatosDoPartido: number;
  concorrentes: (CandidatoResumo & {
    cidadesNaFrente: number;
    cidadesAtras: number;
    ondeMaisTira: { ibge: string; nome: string; votos: number; votosAlvo: number; diferenca: number }[];
  })[];
}

export interface AliadosMunicipio {
  municipio: { ibge: string; nome: string };
  porCargo: { cargo: Cargo; totalValidos: number; candidatos: LinhaRanking[] }[];
}

export interface AliadosEstado {
  minimoVotos: number;
  candidatos: (CandidatoResumo & {
    cidadesComVoto: number;
    cidadesCom5pct: number;
    maisForteEm: { ibge: string; nome: string; votos: number; pct: number }[];
  })[];
}

// Os dados de 2026 não mudam: cada consulta é feita uma vez por sessão
const cache = new Map<string, Promise<unknown>>();
function buscar<T>(url: string): Promise<T> {
  const salvo = cache.get(url);
  if (salvo) return salvo as Promise<T>;
  const p = api.get<T>(`/votacao/2026${url}`).then((r) => r.data);
  cache.set(url, p);
  p.catch(() => cache.delete(url));
  return p;
}

export const NUMERO_JEFFERSON = 2274;

export const votacao = {
  ranking: (ibge: string, cargo: Cargo, limite = 10, extra: { partido?: string; destaque?: string } = {}) => {
    const q = new URLSearchParams({ cargo, limite: String(limite) });
    if (extra.partido) q.set('partido', extra.partido);
    if (extra.destaque) q.set('destaque', extra.destaque);
    return buscar<RankingMunicipio>(`/municipios/${ibge}?${q}`);
  },
  zonas: (ibge: string, cargo: Cargo = 'federal', candidato?: string) =>
    buscar<ZonasMunicipio>(`/municipios/${ibge}/zonas?cargo=${cargo}${candidato ? `&candidato=${candidato}` : ''}`),
  candidatos: (busca: string, cargo?: Cargo, limite = 12) =>
    buscar<CandidatoResumo[]>(`/candidatos?${new URLSearchParams({ busca, limite: String(limite), ...(cargo ? { cargo } : {}) })}`),
  votosDoCandidato: (id: string) => buscar<VotosCandidato>(`/candidatos/${id}/municipios`),
  concorrencia: (cidades = 5) => buscar<Concorrencia>(`/concorrencia?cidades=${cidades}`),
  aliadosCidade: (ibge: string, limite = 6) => buscar<AliadosMunicipio>(`/aliados?ibge=${ibge}&limite=${limite}`),
  aliadosEstado: (limite = 60, minimo = 15000) => buscar<AliadosEstado>(`/aliados?limite=${limite}&minimo=${minimo}`),
};

export const SITUACAO_TEXTO: Record<string, string> = {
  ELEITO: 'Eleito',
  'ELEITO POR QP': 'Eleito',
  'ELEITO POR MÉDIA': 'Eleito por média',
  SUPLENTE: 'Suplente',
  'NÃO ELEITO': 'Não eleito',
};
export const textoSituacao = (s: string) => SITUACAO_TEXTO[s] ?? s;
export const eleito = (s: string) => s.startsWith('ELEITO');

/* Nome da urna em caixa alta vira nome próprio: "LUCAS PAVANATO" -> "Lucas Pavanato" */
const MINUSC = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
export const nomeProprio = (t: string) =>
  t
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => (i > 0 && MINUSC.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');

/* Tudo de 2026 que os relatórios usam. Cada parte que falhar vem como null. */
const ouNulo = <T,>(p: Promise<T>) => p.catch(() => null);
export const carregarTseCidade = async (ibge: string) => {
  const [federal, estadual, pl, zonas, aliados] = await Promise.all([
    ouNulo(votacao.ranking(ibge, 'federal', 10)),
    ouNulo(votacao.ranking(ibge, 'estadual', 10)),
    ouNulo(votacao.ranking(ibge, 'federal', 40, { partido: 'PL' })),
    ouNulo(votacao.zonas(ibge, 'federal')),
    ouNulo(votacao.aliadosCidade(ibge, 6)),
  ]);
  return { federal, estadual, pl, zonas, aliados };
};
export const carregarTseEstado = async () => {
  const [concorrencia, aliados] = await Promise.all([ouNulo(votacao.concorrencia(3)), ouNulo(votacao.aliadosEstado(25, 15000))]);
  return { concorrencia, aliados };
};
