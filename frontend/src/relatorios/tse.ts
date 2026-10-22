import { nomeProprio, textoSituacao, eleito, NUMERO_JEFFERSON, type AliadosEstado, type AliadosMunicipio, type Concorrencia, type LinhaRanking, type RankingMunicipio, type ZonasMunicipio } from '../services/votacao';
import { COR, Relatorio, fmtInt, fmtPct, type RGB } from './base';

/* Seções dos relatórios com o resultado oficial de 2026 (TSE) */

export interface TseCidade {
  federal: RankingMunicipio | null;
  estadual: RankingMunicipio | null;
  pl: RankingMunicipio | null;
  zonas: ZonasMunicipio | null;
  aliados: AliadosMunicipio | null;
}

export interface TseEstado {
  concorrencia: Concorrencia | null;
  aliados: AliadosEstado | null;
}

const FONTE = 'Fonte: TSE, votação nominal por município e zona, Eleições Gerais 2026, 1º turno.';
const ehJC = (l: { numero: number; cargo: string }) => l.cargo === 'federal' && l.numero === NUMERO_JEFFERSON;
const pct = (v: number) => fmtPct(v, 1);
const corSituacao = (s: string): RGB | undefined => (eleito(s) ? COR.ganho : undefined);

/* Frase para os pontos principais: posição de Jefferson na cidade e no PL */
export function pontoPosicao(t: TseCidade, nome: string): string | null {
  const d = t.federal?.destaque;
  if (!t.federal || !d) return null;
  const pl = t.pl?.ranking ?? [];
  const noPL = pl.findIndex(ehJC);
  const base = d.posicao
    ? `Em 2026 Jefferson foi o ${d.posicao}º federal mais votado em ${nome}, entre ${fmtInt(t.federal.candidatosComVoto)} com voto, com ${pct(d.pct)} dos votos válidos.`
    : `Jefferson não teve voto em ${nome} em 2026.`;
  const lider = t.federal.ranking[0];
  const liderTxt = lider && !ehJC(lider) ? ` O mais votado foi ${nomeProprio(lider.nomeUrna)} (${lider.partido}, ${pct(lider.pct)}).` : '';
  const plTxt = noPL > 0 ? ` Dentro do PL ele ficou em ${noPL + 1}º.` : noPL === 0 ? ' Foi o federal do PL mais votado na cidade.' : '';
  return base + liderTxt + plTxt;
}

function tabelaRanking(r: Relatorio, dados: RankingMunicipio, limite: number) {
  const linhas: LinhaRanking[] = dados.ranking.slice(0, limite);
  const d = dados.destaque;
  if (d && !linhas.some((l) => l.id === d.id)) linhas.push(d);
  const valores = linhas.map((l) => [
    l.posicao ? `${l.posicao}º` : '-',
    nomeProprio(l.nomeUrna),
    l.partido,
    textoSituacao(l.situacao),
    fmtInt(l.votos),
    pct(l.pct),
  ]);
  r.tabela(
    [
      { titulo: 'Pos.', largura: 7, alinhar: 'right' },
      { titulo: 'Candidato', largura: 32 },
      { titulo: 'Partido', largura: 14 },
      { titulo: 'Situação', largura: 15 },
      { titulo: 'Votos', largura: 12, alinhar: 'right' },
      { titulo: '% da cidade', largura: 12, alinhar: 'right' },
    ],
    valores,
    {
      destacar: (i) => ehJC(linhas[i]),
      corColuna: (i, col) => (col === 3 ? corSituacao(linhas[i].situacao) : undefined),
    }
  );
}

export function secaoRankingCidade(r: Relatorio, t: TseCidade, nome: string) {
  if (t.federal) {
    r.secao(`Deputado federal em ${nome}: os mais votados em 2026`, `${fmtInt(t.federal.totalValidos)} votos válidos entre ${fmtInt(t.federal.candidatosComVoto)} candidatos. Em amarelo, Jefferson Campos.`);
    tabelaRanking(r, t.federal, 10);
  }
  if (t.pl && t.pl.ranking.length) {
    const pl = t.pl.ranking;
    const noPL = pl.findIndex(ehJC);
    r.secao(
      `Federais do PL em ${nome}`,
      noPL < 0
        ? 'Jefferson não teve voto aqui. A posição é a do ranking geral da cidade.'
        : `Jefferson foi o ${noPL + 1}º do partido na cidade. A posição é a do ranking geral da cidade.`
    );
    const linhas = pl.slice(0, Math.max(6, noPL + 1));
    r.tabela(
      [
        { titulo: 'Pos.', largura: 8, alinhar: 'right' },
        { titulo: 'Candidato', largura: 40 },
        { titulo: 'Situação', largura: 18 },
        { titulo: 'Votos', largura: 14, alinhar: 'right' },
        { titulo: '% da cidade', largura: 14, alinhar: 'right' },
      ],
      linhas.map((l) => [`${l.posicao}º`, nomeProprio(l.nomeUrna), textoSituacao(l.situacao), fmtInt(l.votos), pct(l.pct)]),
      { destacar: (i) => ehJC(linhas[i]), corColuna: (i, col) => (col === 2 ? corSituacao(linhas[i].situacao) : undefined) }
    );
  }
  if (t.estadual) {
    r.secao(`Deputado estadual em ${nome}: os mais votados em 2026`, `${fmtInt(t.estadual.totalValidos)} votos válidos entre ${fmtInt(t.estadual.candidatosComVoto)} candidatos.`);
    tabelaRanking(r, t.estadual, 10);
  }
}

export function secaoZonasCidade(r: Relatorio, t: TseCidade, nome: string) {
  if (!t.zonas || t.zonas.zonas.length === 0) return;
  const zonas = [...t.zonas.zonas].sort((a, b) => (b.candidato?.pct ?? 0) - (a.candidato?.pct ?? 0));
  r.secao(`Voto de Jefferson por zona em ${nome}`, 'Da zona onde ele foi melhor para a pior, com o federal mais votado de cada zona.');
  r.barrasHorizontais(
    zonas.map((z) => ({
      rotulo: `Zona ${z.zona}`,
      valor: z.candidato?.pct ?? 0,
      texto: `${fmtInt(z.candidato?.votos ?? 0)} votos, ${pct(z.candidato?.pct ?? 0)}${z.candidato?.posicao ? `, ${z.candidato.posicao}º` : ''}`,
      cor: COR.amarelo,
    })),
    { largRotulo: 26, largValor: 46 }
  );
  r.tabela(
    [
      { titulo: 'Zona', largura: 10 },
      { titulo: 'Válidos', largura: 13, alinhar: 'right' },
      { titulo: 'Jefferson', largura: 13, alinhar: 'right' },
      { titulo: 'Pos.', largura: 8, alinhar: 'right' },
      { titulo: 'Mais votado na zona', largura: 42 },
    ],
    zonas.map((z) => [
      String(z.zona),
      fmtInt(z.totalValidos),
      `${fmtInt(z.candidato?.votos ?? 0)} (${pct(z.candidato?.pct ?? 0)})`,
      z.candidato?.posicao ? `${z.candidato.posicao}º` : '-',
      z.lider ? `${nomeProprio(z.lider.nomeUrna)} (${z.lider.partido}), ${pct(z.lider.pct)}` : '-',
    ])
  );
}

export function secaoAliadosCidade(r: Relatorio, t: TseCidade, nome: string) {
  if (!t.aliados) return;
  const linhas = t.aliados.porCargo.flatMap((g) => g.candidatos.map((c) => ({ ...c, cargoTxt: g.cargo === 'federal' ? 'Federal' : 'Estadual' })));
  r.secao(`Aliados para 2030: não eleitos com voto forte em ${nome}`, 'Candidatos a deputado que tiveram boa votação na cidade em 2026 e não se elegeram. Têm base local e podem somar na próxima eleição.');
  if (!linhas.length) {
    r.aviso('Nenhum candidato não eleito com votação relevante nesta cidade.');
    return;
  }
  r.tabela(
    [
      { titulo: 'Cargo', largura: 12 },
      { titulo: 'Candidato', largura: 32 },
      { titulo: 'Partido', largura: 15 },
      { titulo: 'Situação', largura: 13 },
      { titulo: 'Votos', largura: 11, alinhar: 'right' },
      { titulo: '%', largura: 9, alinhar: 'right' },
      { titulo: 'Pos.', largura: 8, alinhar: 'right' },
    ],
    linhas.map((l) => [l.cargoTxt, nomeProprio(l.nomeUrna), l.partido, textoSituacao(l.situacao), fmtInt(l.votos), pct(l.pct), `${l.posicao}º`])
  );
}

export function notaFonte(r: Relatorio) {
  r.nota(FONTE);
}

/* ---------- estado ---------- */

export function secaoConcorrenciaEstado(r: Relatorio, t: TseEstado) {
  const c = t.concorrencia;
  if (!c) return;
  r.secao(
    'Concorrência dentro do PL',
    `O PL teve ${c.candidatosDoPartido} candidatos a federal. Jefferson teve voto em ${fmtInt(c.cidadesComVotoAlvo)} cidades e foi o mais votado do partido em ${c.alvoLideraPartido === 0 ? 'nenhuma' : fmtInt(c.alvoLideraPartido)}. Abaixo, os 15 colegas mais votados e onde cada um mais tirou voto dele.`
  );
  const lista = c.concorrentes.slice(0, 15);
  r.tabela(
    [
      { titulo: 'Candidato', largura: 26 },
      { titulo: 'Votos', largura: 12, alinhar: 'right' },
      { titulo: 'Situação', largura: 12 },
      { titulo: 'À frente em', largura: 11, alinhar: 'right' },
      { titulo: 'Atrás em', largura: 10, alinhar: 'right' },
      { titulo: 'Maiores vantagens sobre Jefferson', largura: 42 },
    ],
    lista.map((x) => [
      nomeProprio(x.nomeUrna),
      fmtInt(x.votos),
      textoSituacao(x.situacao),
      `${fmtInt(x.cidadesNaFrente)} cid.`,
      `${fmtInt(x.cidadesAtras)} cid.`,
      x.ondeMaisTira.map((o) => `${o.nome} (+${fmtInt(o.diferenca)})`).join(', ') || '-',
    ]),
    { corColuna: (i, col) => (col === 2 ? corSituacao(lista[i].situacao) : col === 3 && lista[i].cidadesNaFrente > lista[i].cidadesAtras ? COR.perda : undefined) }
  );
}

export function secaoAliadosEstado(r: Relatorio, t: TseEstado) {
  const a = t.aliados;
  if (!a || !a.candidatos.length) return;
  r.secao(
    'Aliados para 2030: não eleitos com votação forte',
    `Os 25 candidatos a deputado não eleitos com mais votos (mínimo de ${fmtInt(a.minimoVotos)}). "5%+" conta as cidades onde tiveram 5% ou mais dos votos válidos do cargo.`
  );
  const lista = a.candidatos.slice(0, 25);
  r.tabela(
    [
      { titulo: 'Candidato', largura: 22 },
      { titulo: 'Cargo', largura: 10 },
      { titulo: 'Partido', largura: 17 },
      { titulo: 'Votos', largura: 11, alinhar: 'right' },
      { titulo: '5%+', largura: 6, alinhar: 'right' },
      { titulo: 'Mais forte em', largura: 44 },
    ],
    lista.map((c) => [
      nomeProprio(c.nomeUrna),
      c.cargo === 'federal' ? 'Federal' : 'Estadual',
      c.partido,
      fmtInt(c.votos),
      String(c.cidadesCom5pct),
      c.maisForteEm.map((m) => `${m.nome} (${pct(m.pct)})`).join(', '),
    ])
  );
}
