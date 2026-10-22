import { CARGOS, obterBase, type BaseVotacao, type Candidato, type Cargo } from './votacao.dados.js';

/* Consultas sobre o resultado de 2026. Só leitura, sobre os dados em memória. */

export const NUMERO_JEFFERSON = 2274;

const resumo = (c: Candidato) => ({
  id: c.id,
  numero: c.numero,
  cargo: c.cargo,
  nomeUrna: c.nomeUrna,
  partido: c.partido,
  federacao: c.federacao,
  situacao: c.situacao,
  votos: c.votos,
});

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const pct = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 10000) / 100 : 0);

export const cargoValido = (c: unknown): Cargo | null => (CARGOS.includes(c as Cargo) ? (c as Cargo) : null);

function jefferson(base: BaseVotacao) {
  return base.candidatos.findIndex((c) => c.cargo === 'federal' && c.numero === NUMERO_JEFFERSON);
}

function municipioInfo(base: BaseVotacao, ibge: string) {
  return { ibge, nome: base.nomeMunicipio.get(ibge) ?? ibge };
}

/* Soma de votos por candidato num município (opcionalmente numa zona) */
function somaNoMunicipio(base: BaseVotacao, m: number, cargo: Cargo, zona?: number) {
  const soma = new Map<number, number>();
  let total = 0;
  for (let i = base.inicioMunicipio[m]; i < base.inicioMunicipio[m + 1]; i++) {
    if (zona !== undefined && base.zona[i] !== zona) continue;
    const c = base.cand[i];
    if (base.candidatos[c].cargo !== cargo) continue;
    soma.set(c, (soma.get(c) ?? 0) + base.votos[i]);
    total += base.votos[i];
  }
  const ordenado = [...soma.entries()].sort((a, b) => b[1] - a[1]);
  return { ordenado, total };
}

export class VotacaoService {
  async fonte() {
    const base = await obterBase();
    const totais = Object.fromEntries(
      CARGOS.map((cargo) => [cargo, base.candidatos.filter((c) => c.cargo === cargo).reduce((s, c) => s + c.votos, 0)])
    );
    return { fonte: base.fonte, candidatos: base.candidatos.length, municipios: base.municipios.length, votosValidos: totais };
  }

  async candidatos(cargo: Cargo | null, busca: string, limite: number) {
    const base = await obterBase();
    const termo = semAcento(busca.trim());
    return base.candidatos
      .filter((c) => (!cargo || c.cargo === cargo) && (!termo || semAcento(`${c.nomeUrna} ${c.nome} ${c.partido} ${c.numero}`).includes(termo)))
      .slice(0, limite)
      .map(resumo);
  }

  async rankingMunicipio(ibge: string, cargo: Cargo, limite: number, destaqueId?: string, zona?: number, partido?: string) {
    const base = await obterBase();
    const m = base.idxMunicipio.get(ibge);
    if (m === undefined) return null;
    const { ordenado, total } = somaNoMunicipio(base, m, cargo, zona);

    // posição sempre no ranking geral da cidade; o filtro por partido só escolhe quem aparece
    const linha = ([c, v]: [number, number], i: number) => ({ posicao: i + 1, ...resumo(base.candidatos[c]), votos: v, pct: pct(v, total) });
    const sigla = partido ? semAcento(partido) : null;
    const ranking = ordenado
      .map((par, i) => ({ par, i }))
      .filter(({ par }) => !sigla || semAcento(base.candidatos[par[0]].partido) === sigla)
      .slice(0, limite)
      .map(({ par, i }) => linha(par, i));

    // Destaque: candidato pedido, ou Jefferson Campos quando o cargo é federal
    const alvo = destaqueId !== undefined ? base.porId.get(destaqueId) : cargo === 'federal' ? jefferson(base) : -1;
    let destaque = null;
    if (alvo !== undefined && alvo >= 0 && base.candidatos[alvo].cargo === cargo) {
      const pos = ordenado.findIndex(([c]) => c === alvo);
      destaque = pos >= 0 ? linha(ordenado[pos], pos) : { posicao: null, ...resumo(base.candidatos[alvo]), votos: 0, pct: 0 };
    }

    return {
      municipio: municipioInfo(base, ibge),
      cargo,
      zona: zona ?? null,
      partido: partido ?? null,
      zonas: base.zonasPorMunicipio[m],
      totalValidos: total,
      candidatosComVoto: ordenado.length,
      ranking,
      destaque,
    };
  }

  async votosDoCandidato(id: string) {
    const base = await obterBase();
    const c = base.porId.get(id);
    if (c === undefined) return null;
    const cand = base.candidatos[c];

    const porMun = new Map<number, number>();
    for (const i of base.linhasPorCandidato[c]) porMun.set(base.mun[i], (porMun.get(base.mun[i]) ?? 0) + base.votos[i]);

    const municipios = [...porMun.entries()]
      .map(([m, v]) => {
        const { ordenado, total } = somaNoMunicipio(base, m, cand.cargo);
        return {
          ...municipioInfo(base, base.municipios[m]),
          votos: v,
          pct: pct(v, total),
          posicao: ordenado.findIndex(([x]) => x === c) + 1,
        };
      })
      .sort((a, b) => b.votos - a.votos);

    return { candidato: resumo(cand), cidadesComVoto: municipios.length, municipios };
  }

  /*
    Concorrência dentro do partido: para cada candidato do mesmo partido e cargo do alvo
    (padrão: Jefferson Campos, PL, federal), em quantas cidades ficou à frente do alvo
    e onde tirou mais votos que ele.
  */
  async concorrenciaPartido(alvoId?: string, limiteCidades = 5) {
    const base = await obterBase();
    const alvo = alvoId !== undefined ? base.porId.get(alvoId) ?? -1 : jefferson(base);
    if (alvo < 0) return null;
    const a = base.candidatos[alvo];

    const porMun = (c: number) => {
      const mapa = new Float64Array(base.municipios.length);
      for (const i of base.linhasPorCandidato[c]) mapa[base.mun[i]] += base.votos[i];
      return mapa;
    };
    const votosAlvo = porMun(alvo);
    const colegas = base.candidatos
      .map((c, i) => ({ c, i }))
      .filter(({ c, i }) => i !== alvo && c.cargo === a.cargo && c.partido === a.partido && c.votos > 0);

    const lista = colegas.map(({ c, i }) => {
      const v = porMun(i);
      let naFrente = 0;
      let atras = 0;
      const diferencas: { m: number; dif: number; votos: number; alvo: number }[] = [];
      for (let m = 0; m < v.length; m++) {
        if (!v[m] && !votosAlvo[m]) continue;
        if (v[m] > votosAlvo[m]) {
          naFrente++;
          diferencas.push({ m, dif: v[m] - votosAlvo[m], votos: v[m], alvo: votosAlvo[m] });
        } else if (v[m] < votosAlvo[m]) atras++;
      }
      diferencas.sort((x, y) => y.dif - x.dif);
      return {
        ...resumo(c),
        cidadesNaFrente: naFrente,
        cidadesAtras: atras,
        ondeMaisTira: diferencas.slice(0, limiteCidades).map((d) => ({
          ...municipioInfo(base, base.municipios[d.m]),
          votos: d.votos,
          votosAlvo: d.alvo,
          diferenca: d.dif,
        })),
      };
    });
    lista.sort((x, y) => y.votos - x.votos);

    // cidades em que o alvo é o mais votado do partido
    let alvoLideraPartido = 0;
    let cidadesComVotoAlvo = 0;
    for (let m = 0; m < base.municipios.length; m++) {
      if (!votosAlvo[m]) continue;
      cidadesComVotoAlvo++;
      const { ordenado } = somaNoMunicipio(base, m, a.cargo);
      const primeiroDoPartido = ordenado.find(([c]) => base.candidatos[c].partido === a.partido);
      if (primeiroDoPartido && primeiroDoPartido[0] === alvo) alvoLideraPartido++;
    }

    return {
      alvo: resumo(a),
      partido: a.partido,
      cargo: a.cargo,
      cidadesComVotoAlvo,
      alvoLideraPartido,
      candidatosDoPartido: lista.length + 1,
      concorrentes: lista,
    };
  }

  /*
    Aliados para 2030: candidatos a deputado (federal e estadual) que não se elegeram
    mas tiveram votação forte. Por cidade, os mais votados entre os não eleitos.
    No estado, os não eleitos com mais votos e as cidades onde são mais fortes.
  */
  async aliados(opcoes: { ibge?: string; limite: number; minimoVotos: number }) {
    const base = await obterBase();
    const naoEleito = (c: Candidato) => (c.situacao === 'SUPLENTE' || c.situacao === 'NÃO ELEITO') && (c.cargo === 'federal' || c.cargo === 'estadual');

    if (opcoes.ibge) {
      const m = base.idxMunicipio.get(opcoes.ibge);
      if (m === undefined) return null;
      const porCargo = (['federal', 'estadual'] as Cargo[]).map((cargo) => {
        const { ordenado, total } = somaNoMunicipio(base, m, cargo);
        return {
          cargo,
          totalValidos: total,
          candidatos: ordenado
            .map(([c, v], i) => ({ posicao: i + 1, c, v }))
            .filter(({ c }) => naoEleito(base.candidatos[c]))
            .slice(0, opcoes.limite)
            .map(({ posicao, c, v }) => ({ posicao, ...resumo(base.candidatos[c]), votos: v, pct: pct(v, total) })),
        };
      });
      return { municipio: municipioInfo(base, opcoes.ibge), porCargo };
    }

    // total de válidos por município e cargo, para calcular a força local
    const totalMun: Record<Cargo, Float64Array> = {
      federal: new Float64Array(base.municipios.length),
      estadual: new Float64Array(base.municipios.length),
      governador: new Float64Array(base.municipios.length),
      senador: new Float64Array(base.municipios.length),
    };
    for (let i = 0; i < base.votos.length; i++) totalMun[base.candidatos[base.cand[i]].cargo][base.mun[i]] += base.votos[i];

    const lista = base.candidatos
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => naoEleito(c) && c.votos >= opcoes.minimoVotos)
      .map(({ c, i }) => {
        const v = new Float64Array(base.municipios.length);
        for (const k of base.linhasPorCandidato[i]) v[base.mun[k]] += base.votos[k];
        const cidades = [];
        for (let m = 0; m < v.length; m++) if (v[m]) cidades.push({ m, votos: v[m], pct: pct(v[m], totalMun[c.cargo][m]) });
        cidades.sort((x, y) => y.votos - x.votos);
        return {
          ...resumo(c),
          cidadesComVoto: cidades.length,
          cidadesCom5pct: cidades.filter((x) => x.pct >= 5).length,
          maisForteEm: cidades.slice(0, 3).map((x) => ({ ...municipioInfo(base, base.municipios[x.m]), votos: x.votos, pct: x.pct })),
        };
      })
      .sort((x, y) => y.votos - x.votos)
      .slice(0, opcoes.limite);
    return { minimoVotos: opcoes.minimoVotos, candidatos: lista };
  }

  async zonasDoMunicipio(ibge: string, cargo: Cargo, candidatoId?: string) {
    const base = await obterBase();
    const m = base.idxMunicipio.get(ibge);
    if (m === undefined) return null;
    const alvo = candidatoId !== undefined ? base.porId.get(candidatoId) : cargo === 'federal' ? jefferson(base) : undefined;
    const zonas = base.zonasPorMunicipio[m].map((z) => {
      const { ordenado, total } = somaNoMunicipio(base, m, cargo, z);
      const pos = alvo !== undefined ? ordenado.findIndex(([c]) => c === alvo) : -1;
      const lider = ordenado[0];
      return {
        zona: z,
        totalValidos: total,
        lider: lider ? { ...resumo(base.candidatos[lider[0]]), votos: lider[1], pct: pct(lider[1], total) } : null,
        candidato: alvo !== undefined && alvo >= 0 ? { votos: pos >= 0 ? ordenado[pos][1] : 0, pct: pos >= 0 ? pct(ordenado[pos][1], total) : 0, posicao: pos >= 0 ? pos + 1 : null } : null,
      };
    });
    return {
      municipio: municipioInfo(base, ibge),
      cargo,
      candidato: alvo !== undefined && alvo >= 0 ? resumo(base.candidatos[alvo]) : null,
      zonas,
    };
  }
}
