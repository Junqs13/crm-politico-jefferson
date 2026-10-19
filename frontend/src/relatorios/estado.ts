import { ANOS_ELEICAO, ANO_BASE, ANO_META, projecao, votosJefNoAno, type Municipio } from '../tipos';
import { COR, CORES_SERIE, Relatorio, fmtInt, fmtMoeda, fmtMoedaCurta, fmtPct, fmtSinal, type RGB } from './base';
import { ANO_ANTERIOR, penetracao, resumoEstado, textoArea, textoPrioridade, variacao } from './analise';

/* Relatório estratégico do estado inteiro, com metas para 2030 */
export function gerarRelatorioEstado(todos: Municipio[]) {
  const e = resumoEstado(todos, ANO_BASE);
  const crescimento = todos.length ? projecao(todos[0]).crescimentoMetaPct ?? 20 : 20;
  const difEstado = e.votos - e.votosAnterior;
  const pctEstado = e.votosAnterior ? (difEstado / e.votosAnterior) * 100 : 0;

  const r = new Relatorio(
    'Estado de São Paulo',
    `Metas para a eleição federal de ${ANO_META}, com base nos votos de ${ANO_BASE}`,
    `RELATÓRIO ESTRATÉGICO ${ANO_META}`
  );

  /* ---------- indicadores ---------- */
  r.secao('Resumo estadual');
  r.cartoes(
    [
      { rotulo: `Votos em ${ANO_BASE}`, valor: fmtInt(e.votos), detalhe: `${e.comVoto} de ${e.total} municípios com voto`, cor: COR.azul },
      { rotulo: `Meta para ${ANO_META}`, valor: fmtInt(e.meta), detalhe: `${ANO_BASE} + ${crescimento}% em cada cidade`, cor: COR.amareloEscuro },
      { rotulo: `Variação desde ${ANO_ANTERIOR}`, valor: fmtPct(pctEstado, 1, true), detalhe: `${fmtSinal(difEstado)} votos (${fmtInt(e.votosAnterior)} em ${ANO_ANTERIOR})`, cor: difEstado >= 0 ? COR.ganho : COR.perda },
      { rotulo: 'Penetração estadual', valor: fmtPct(e.penetracao, 2), detalhe: `${fmtInt(e.eleitores)} eleitores mapeados`, cor: COR.ganho },
      { rotulo: 'Emendas destinadas', valor: fmtMoedaCurta(e.emendas), detalhe: `${e.destinacoes} destinações em ${e.comEmenda} municípios`, cor: COR.amareloEscuro },
      { rotulo: 'Concentração', valor: fmtPct(e.concentracaoTop10, 0), detalhe: `dos votos de ${ANO_BASE} vêm das 10 maiores cidades`, cor: COR.texto },
      { rotulo: 'Maior colégio', valor: e.ordenados[0]?.municipio ?? '-', detalhe: e.ordenados[0] ? `${fmtInt(votosJefNoAno(e.ordenados[0], ANO_BASE))} votos em ${ANO_BASE}` : undefined, cor: COR.azul },
      { rotulo: 'Votos a conquistar', valor: fmtInt(Math.max(0, e.meta - e.votos)), detalhe: `para a meta de ${ANO_META}`, cor: COR.texto },
    ],
    4
  );

  /* ---------- quedas e altas ---------- */
  const comparaveis = todos
    .map((c) => ({ c, v: variacao(c, ANO_BASE, ANO_ANTERIOR) }))
    .filter((x) => x.v.anterior > 0 || x.v.atual > 0);
  const cresceram = comparaveis.filter((x) => x.v.dif > 0).length;
  const cairam = comparaveis.filter((x) => x.v.dif < 0).length;
  const perdidas = comparaveis.filter((x) => x.v.anterior > 0 && x.v.atual === 0).length;

  r.secao('Pontos principais');
  const pontos: { texto: string; cor?: RGB }[] = [
    {
      texto: `O total do estado ${difEstado < 0 ? 'caiu' : 'cresceu'} ${fmtPct(Math.abs(pctEstado))} entre ${ANO_ANTERIOR} e ${ANO_BASE}, de ${fmtInt(e.votosAnterior)} para ${fmtInt(e.votos)} votos.`,
      cor: difEstado < 0 ? COR.perda : COR.ganho,
    },
    { texto: `${cresceram} municípios cresceram e ${cairam} caíram. Em ${perdidas} municípios houve voto em ${ANO_ANTERIOR} e nenhum em ${ANO_BASE}.`, cor: COR.azul },
    { texto: `As 10 cidades com mais votos concentram ${fmtPct(e.concentracaoTop10, 0)} do total de ${ANO_BASE}. ${e.concentracaoTop10 > 40 ? 'A base depende de poucos colégios.' : 'A base está bem distribuída.'}`, cor: COR.amarelo },
    { texto: `${e.comEmenda} municípios receberam emendas, ${fmtPct((e.comEmenda / (e.total || 1)) * 100, 0)} do estado, somando ${fmtMoeda(e.emendas)}.`, cor: COR.amareloEscuro },
  ];
  r.pontos(pontos);

  /* ---------- evolução ---------- */
  r.secao('Votos de Jefferson Campos no estado por eleição', `Em amarelo, ${ANO_BASE}, a base das metas de ${ANO_META}.`);
  r.barrasVerticais(ANOS_ELEICAO.map(String), e.votosPorAno, { destaque: ANOS_ELEICAO.indexOf(ANO_BASE) });

  /* ---------- prioridades ---------- */
  r.secao('Municípios por prioridade de campanha', 'Alta oportunidade: mais de 20 mil eleitores e penetração abaixo de 2%. Reduto consolidado: penetração de 5% ou mais.');
  const corPrioridade: Record<string, RGB> = { 'ALTA OPORTUNIDADE': COR.perda, 'MANUTENÇÃO': COR.azul, 'REDUTO CONSOLIDADO': COR.ganho };
  r.barraEmpilhada(
    Object.entries(e.prioridades)
      .sort((a, b) => b[1] - a[1])
      .map(([p, n]) => ({ rotulo: textoPrioridade(p), valor: n, cor: corPrioridade[p] ?? COR.cinza }))
  );

  /* ---------- emendas ---------- */
  r.secao('Emendas por área no estado', `${fmtMoeda(e.emendas)} em ${e.destinacoes} destinações.`);
  r.barrasHorizontais(
    Object.entries(e.emendasPorArea)
      .sort((a, b) => b[1] - a[1])
      .map(([area, valor], i) => ({ rotulo: textoArea(area), valor, texto: `${fmtMoedaCurta(valor)}  (${fmtPct((valor / (e.emendas || 1)) * 100, 0)})`, cor: CORES_SERIE[i % CORES_SERIE.length] })),
    { largValor: 42 }
  );

  /* ---------- tabelas ---------- */
  const corVar = (txt: string): RGB | undefined => (txt.startsWith('+') ? COR.ganho : txt.startsWith('-') && txt !== '-' ? COR.perda : undefined);

  r.secao(`As 20 cidades com mais votos em ${ANO_BASE}`);
  const top = e.ordenados.slice(0, 20);
  const linhasTop = top.map((c, i) => {
    const v = variacao(c, ANO_BASE, ANO_ANTERIOR);
    const p = penetracao(c);
    return [
      `${i + 1}. ${c.municipio}`,
      fmtInt(v.atual),
      v.pct === null ? '-' : fmtPct(v.pct, 1, true),
      fmtInt(c.eleitorado.totalEleitores),
      p === null ? '-' : fmtPct(p, 2),
      fmtMoedaCurta(c.totalEmendas),
      fmtInt(projecao(c).metaVotos),
    ];
  });
  r.tabela(
    [
      { titulo: 'Município', largura: 30 },
      { titulo: `Votos ${ANO_BASE}`, largura: 12, alinhar: 'right' },
      { titulo: `Desde ${ANO_ANTERIOR}`, largura: 12, alinhar: 'right' },
      { titulo: 'Eleitores', largura: 14, alinhar: 'right' },
      { titulo: 'Penetração', largura: 12, alinhar: 'right' },
      { titulo: 'Emendas', largura: 13, alinhar: 'right' },
      { titulo: `Meta ${ANO_META}`, largura: 12, alinhar: 'right' },
    ],
    linhasTop,
    { corColuna: (li, col) => (col === 2 ? corVar(linhasTop[li][2]) : undefined) }
  );

  const tabelaVariacao = (titulo: string, desc: string, lista: typeof comparaveis) => {
    r.secao(titulo, desc);
    const linhas = lista.map(({ c, v }) => [c.municipio, fmtInt(v.anterior), fmtInt(v.atual), fmtSinal(v.dif), v.pct === null ? 'novo' : fmtPct(v.pct, 1, true), fmtMoedaCurta(c.totalEmendas)]);
    r.tabela(
      [
        { titulo: 'Município', largura: 32 },
        { titulo: String(ANO_ANTERIOR), largura: 12, alinhar: 'right' },
        { titulo: String(ANO_BASE), largura: 12, alinhar: 'right' },
        { titulo: 'Diferença', largura: 13, alinhar: 'right' },
        { titulo: 'Variação', largura: 12, alinhar: 'right' },
        { titulo: 'Emendas', largura: 14, alinhar: 'right' },
      ],
      linhas,
      { corColuna: (li, col) => (col === 3 || col === 4 ? corVar(linhas[li][col]) : undefined) }
    );
  };

  tabelaVariacao(
    `Maiores perdas de votos desde ${ANO_ANTERIOR}`,
    'As 12 cidades que mais perderam votos em números absolutos. São as primeiras a visitar para entender o que mudou.',
    [...comparaveis].sort((a, b) => a.v.dif - b.v.dif).filter((x) => x.v.dif < 0).slice(0, 12)
  );
  tabelaVariacao(
    `Maiores ganhos de votos desde ${ANO_ANTERIOR}`,
    'As 12 cidades que mais ganharam votos. Vale registrar o que funcionou e quem são as lideranças locais.',
    [...comparaveis].sort((a, b) => b.v.dif - a.v.dif).filter((x) => x.v.dif > 0).slice(0, 12)
  );

  r.secao('Oportunidades: grandes eleitorados com pouca presença', `Municípios com mais de 50 mil eleitores e penetração abaixo de 1% em ${ANO_BASE}, do maior para o menor eleitorado.`);
  const oportunidades = todos
    .filter((c) => c.eleitorado.totalEleitores > 50000 && (penetracao(c) ?? 0) < 1)
    .sort((a, b) => b.eleitorado.totalEleitores - a.eleitorado.totalEleitores)
    .slice(0, 15);
  if (oportunidades.length) {
    r.tabela(
      [
        { titulo: 'Município', largura: 32 },
        { titulo: 'Eleitores', largura: 15, alinhar: 'right' },
        { titulo: `Votos ${ANO_BASE}`, largura: 13, alinhar: 'right' },
        { titulo: 'Penetração', largura: 13, alinhar: 'right' },
        { titulo: 'Para chegar a 1%', largura: 15, alinhar: 'right' },
        { titulo: 'Emendas', largura: 13, alinhar: 'right' },
      ],
      oportunidades.map((c) => {
        const v = votosJefNoAno(c, ANO_BASE);
        return [c.municipio, fmtInt(c.eleitorado.totalEleitores), fmtInt(v), fmtPct(penetracao(c) ?? 0, 2), `+${fmtInt(Math.max(0, c.eleitorado.totalEleitores * 0.01 - v))}`, fmtMoedaCurta(c.totalEmendas)];
      })
    );
  } else {
    r.aviso('Nenhum município grande com penetração abaixo de 1%.');
  }

  r.secao('Maiores destinos de emendas', `Os 12 municípios que mais receberam emendas, com os votos de ${ANO_BASE} para comparar o retorno.`);
  const linhasEmendas = [...todos]
    .filter((c) => c.totalEmendas > 0)
    .sort((a, b) => b.totalEmendas - a.totalEmendas)
    .slice(0, 12)
    .map((c) => {
      const v = votosJefNoAno(c, ANO_BASE);
      const varr = variacao(c, ANO_BASE, ANO_ANTERIOR);
      return [c.municipio, fmtMoeda(c.totalEmendas), String(c.totalDestinacoes), fmtInt(v), v ? fmtMoeda(c.totalEmendas / v) : '-', varr.pct === null ? '-' : fmtPct(varr.pct, 1, true)];
    });
  r.tabela(
    [
      { titulo: 'Município', largura: 28 },
      { titulo: 'Emendas', largura: 18, alinhar: 'right' },
      { titulo: 'Destinações', largura: 11, alinhar: 'right' },
      { titulo: `Votos ${ANO_BASE}`, largura: 11, alinhar: 'right' },
      { titulo: 'Por voto', largura: 14, alinhar: 'right' },
      { titulo: `Desde ${ANO_ANTERIOR}`, largura: 12, alinhar: 'right' },
    ],
    linhasEmendas,
    { corColuna: (li, col) => (col === 5 ? corVar(linhasEmendas[li][5]) : undefined) }
  );

  r.nota(
    `Fontes: resultados eleitorais e emendas cadastrados na API Cidadania 360; eleitorado por zona do TSE (${ANO_BASE}). A meta de ${ANO_META} soma, cidade por cidade, ${crescimento}% de crescimento sobre os votos de ${ANO_BASE}. Penetração = votos ÷ eleitorado de ${ANO_BASE}.`
  );

  r.salvar(`Relatorio_Estrategico_${ANO_META}_Estado_SP.pdf`);
}
