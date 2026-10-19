import { ANOS_ELEICAO, ANO_BASE, projecao, votosJefNoAno, type Municipio } from '../tipos';

/* Cálculos usados pelos relatórios. Só fatos tirados dos dados: nada estimado. */

export const ANO_ANTERIOR = 2022;

export const penetracao = (c: Municipio, ano = ANO_BASE) => {
  const e = c.eleitorado.totalEleitores;
  const v = votosJefNoAno(c, ano);
  return e > 0 ? (v / e) * 100 : null;
};

export const variacao = (c: Municipio, ano = ANO_BASE, antes = ANO_ANTERIOR) => {
  const atual = votosJefNoAno(c, ano);
  const anterior = votosJefNoAno(c, antes);
  return { atual, anterior, dif: atual - anterior, pct: anterior > 0 ? ((atual - anterior) / anterior) * 100 : null };
};

export const anosComVotos = (c: Municipio) => ANOS_ELEICAO.filter((a) => votosJefNoAno(c, a) > 0);

export function resumoEstado(todos: Municipio[], ano = ANO_BASE) {
  const votosPorAno = ANOS_ELEICAO.map((a) => todos.reduce((s, c) => s + votosJefNoAno(c, a), 0));
  const votos = todos.reduce((s, c) => s + votosJefNoAno(c, ano), 0);
  const eleitores = todos.reduce((s, c) => s + c.eleitorado.totalEleitores, 0);
  const comVoto = todos.filter((c) => votosJefNoAno(c, ano) > 0).length;
  const emendas = todos.reduce((s, c) => s + c.totalEmendas, 0);
  const destinacoes = todos.reduce((s, c) => s + c.totalDestinacoes, 0);
  const comEmenda = todos.filter((c) => c.totalEmendas > 0).length;
  const meta = todos.reduce((s, c) => s + projecao(c).metaVotos, 0);
  const emendasPorArea: Record<string, number> = {};
  todos.forEach((c) => Object.entries(c.emendas).forEach(([k, v]) => (emendasPorArea[k] = (emendasPorArea[k] || 0) + v)));
  const prioridades: Record<string, number> = {};
  todos.forEach((c) => {
    const p = projecao(c).prioridadeCampanha;
    prioridades[p] = (prioridades[p] || 0) + 1;
  });
  const ordenados = [...todos].sort((a, b) => votosJefNoAno(b, ano) - votosJefNoAno(a, ano));
  const top10 = ordenados.slice(0, 10).reduce((s, c) => s + votosJefNoAno(c, ano), 0);
  return {
    votosPorAno,
    votos,
    eleitores,
    comVoto,
    total: todos.length,
    emendas,
    destinacoes,
    comEmenda,
    meta,
    emendasPorArea,
    prioridades,
    ordenados,
    concentracaoTop10: votos > 0 ? (top10 / votos) * 100 : 0,
    penetracao: eleitores > 0 ? (votos / eleitores) * 100 : 0,
    votosAnterior: todos.reduce((s, c) => s + votosJefNoAno(c, ANO_ANTERIOR), 0),
  };
}

export const posicaoNoEstado = (c: Municipio, todos: Municipio[], ano = ANO_BASE) => {
  const v = votosJefNoAno(c, ano);
  if (!v) return null;
  return todos.filter((o) => votosJefNoAno(o, ano) > v).length + 1;
};

/* Cidades com eleitorado parecido (de 70% a 130%), para comparar desempenho */
export const cidadesParecidas = (c: Municipio, todos: Municipio[], limite = 8) => {
  const e = c.eleitorado.totalEleitores;
  if (!e) return [];
  return todos
    .filter((o) => o.id !== c.id && o.eleitorado.totalEleitores >= e * 0.7 && o.eleitorado.totalEleitores <= e * 1.3)
    .sort((a, b) => (penetracao(b) ?? 0) - (penetracao(a) ?? 0))
    .slice(0, limite);
};

export const TEXTO_PRIORIDADE: Record<string, string> = {
  'ALTA OPORTUNIDADE': 'Alta oportunidade',
  'REDUTO CONSOLIDADO': 'Reduto consolidado',
  'MANUTENÇÃO': 'Manutenção',
};

export const textoPrioridade = (p: string) => TEXTO_PRIORIDADE[p] ?? p;

export const textoArea = (a: string) => {
  const t = a.toLowerCase();
  const mapa: Record<string, string> = { saude: 'Saúde', infra: 'Infraestrutura', social: 'Assistência social', esporte: 'Esporte', turismo: 'Turismo', tecnologia: 'Tecnologia', 'segurança': 'Segurança', 'meio ambiente': 'Meio ambiente', educacao: 'Educação', cultura: 'Cultura' };
  return mapa[t] ?? t.charAt(0).toUpperCase() + t.slice(1);
};
