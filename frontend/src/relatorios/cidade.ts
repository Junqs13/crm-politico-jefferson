import { ANOS_ELEICAO, ANO_BASE, ANO_META, projecao, votosJefNoAno, type Lideranca, type Municipio } from '../tipos';
import { COR, CORES_SERIE, Relatorio, fmtInt, fmtMoeda, fmtMoedaCurta, fmtPct, fmtSinal, nomeArquivo, type Cartao, type RGB } from './base';
import { ANO_ANTERIOR, cidadesParecidas, penetracao, posicaoNoEstado, resumoEstado, textoArea, textoPrioridade, variacao } from './analise';

/*
  Relatório de uma cidade.
  variante 'dossie': aberto pelo mapa, com o ano escolhido como base.
  variante 'estrategico': aberto pelo painel de metas, com foco no plano para 2030
  e comparação com cidades de eleitorado parecido.
*/
export interface OpcoesCidade {
  ano?: number;
  variante?: 'dossie' | 'estrategico';
  liderancas?: Lideranca[] | null;
}

const ALINHAMENTO: Record<string, string> = { ALTO: 'Alto (fiel)', MEDIO: 'Médio', 'EM CONQUISTA': 'Em conquista' };

export function gerarRelatorioCidade(c: Municipio, todos: Municipio[], opcoes: OpcoesCidade = {}) {
  const ano = opcoes.ano ?? ANO_BASE;
  const variante = opcoes.variante ?? 'dossie';
  const proj = projecao(c);
  const votos = votosJefNoAno(c, ano);
  const votosBase = votosJefNoAno(c, ANO_BASE);
  const pen = penetracao(c, ano);
  const estado = resumoEstado(todos, ano);
  const posicao = posicaoNoEstado(c, todos, ano);
  const anoComparar = ano === ANO_BASE ? ANO_ANTERIOR : ANOS_ELEICAO[Math.max(0, ANOS_ELEICAO.indexOf(ano) - 1)];
  const varAnt = variacao(c, ano, anoComparar);
  const faltam = Math.max(0, proj.metaVotos - votosBase);
  const porVoto = votosBase > 0 && c.totalEmendas > 0 ? c.totalEmendas / votosBase : null;
  const crescimento = proj.crescimentoMetaPct ?? 20;

  const r = new Relatorio(
    c.municipio,
    variante === 'estrategico'
      ? `Plano para a eleição federal de ${ANO_META}, com base nos votos de ${ANO_BASE}`
      : `Dossiê político municipal, ciclo eleitoral ${ano}`,
    variante === 'estrategico' ? `PLANO ESTRATÉGICO ${ANO_META}` : 'DOSSIÊ POLÍTICO MUNICIPAL'
  );

  /* ---------- indicadores ---------- */
  r.secao('Resumo do município');
  const cartoes: Cartao[] = [
    {
      rotulo: `Votos de Jefferson Campos em ${ano}`,
      valor: fmtInt(votos),
      detalhe: posicao ? `${posicao}º entre ${estado.comVoto} municípios com voto` : 'Sem votos neste ciclo',
      cor: COR.azul,
    },
    {
      rotulo: 'Eleitorado',
      valor: fmtInt(c.eleitorado.totalEleitores),
      detalhe: `${c.eleitorado.zonas.length} ${c.eleitorado.zonas.length === 1 ? 'zona eleitoral' : 'zonas eleitorais'}`,
      cor: COR.ganho,
    },
    {
      rotulo: 'Penetração no eleitorado',
      valor: pen === null ? 'sem dado' : fmtPct(pen, 2),
      detalhe: `Média do estado: ${fmtPct(estado.penetracao, 2)}`,
      cor: pen !== null && pen >= estado.penetracao ? COR.ganho : COR.perda,
    },
    {
      rotulo: 'Emendas destinadas',
      valor: fmtMoedaCurta(c.totalEmendas),
      detalhe: c.totalDestinacoes ? `${c.totalDestinacoes} destinações em ${Object.keys(c.emendas).length} áreas` : 'Nenhuma emenda registrada',
      cor: COR.amareloEscuro,
    },
    {
      rotulo: `Meta para ${ANO_META}`,
      valor: fmtInt(proj.metaVotos),
      detalhe: `${ANO_BASE} + ${crescimento}%`,
      cor: COR.amareloEscuro,
    },
    {
      rotulo: 'Votos a conquistar',
      valor: fmtInt(faltam),
      detalhe: c.eleitorado.totalEleitores ? `${fmtPct((faltam / c.eleitorado.totalEleitores) * 100, 2)} do eleitorado` : undefined,
      cor: COR.texto,
    },
    {
      rotulo: `Variação desde ${anoComparar}`,
      valor: varAnt.pct === null ? (varAnt.atual ? 'novo' : 'sem dado') : fmtPct(varAnt.pct, 1, true),
      detalhe: `${fmtSinal(varAnt.dif)} votos (${fmtInt(varAnt.anterior)} em ${anoComparar})`,
      cor: varAnt.dif >= 0 ? COR.ganho : COR.perda,
    },
    {
      rotulo: 'Prioridade de campanha',
      valor: textoPrioridade(proj.prioridadeCampanha),
      detalhe: porVoto ? `${fmtMoeda(porVoto)} em emendas por voto de ${ANO_BASE}` : undefined,
      cor: COR.texto,
    },
  ];
  r.cartoes(cartoes, 4);

  /* ---------- leitura rápida ---------- */
  r.secao('Pontos principais');
  const pontos: { texto: string; cor?: RGB }[] = [];
  if (varAnt.anterior > 0) {
    pontos.push({
      texto:
        varAnt.dif < 0
          ? `Os votos caíram ${fmtPct(Math.abs(varAnt.pct ?? 0))} entre ${anoComparar} e ${ano}: de ${fmtInt(varAnt.anterior)} para ${fmtInt(varAnt.atual)}.`
          : `Os votos cresceram ${fmtPct(varAnt.pct ?? 0)} entre ${anoComparar} e ${ano}: de ${fmtInt(varAnt.anterior)} para ${fmtInt(varAnt.atual)}.`,
      cor: varAnt.dif < 0 ? COR.perda : COR.ganho,
    });
  }
  if (pen !== null) {
    pontos.push({
      texto: `A penetração é de ${fmtPct(pen, 2)} do eleitorado, ${pen >= estado.penetracao ? 'acima' : 'abaixo'} da média estadual de ${fmtPct(estado.penetracao, 2)}.`,
      cor: pen >= estado.penetracao ? COR.ganho : COR.perda,
    });
  }
  pontos.push({ texto: `Para chegar à meta de ${fmtInt(proj.metaVotos)} votos em ${ANO_META} faltam ${fmtInt(faltam)} votos sobre o resultado de ${ANO_BASE}.`, cor: COR.amarelo });
  pontos.push(
    c.totalEmendas > 0
      ? { texto: `O mandato destinou ${fmtMoeda(c.totalEmendas)} em ${c.totalDestinacoes} emendas. A maior área é ${textoArea(Object.entries(c.emendas).sort((a, b) => b[1] - a[1])[0][0])}.`, cor: COR.azul }
      : { texto: `Nenhuma emenda registrada para ${c.municipio}. É um município sem investimento direto do mandato até agora.`, cor: COR.cinza }
  );
  if (opcoes.liderancas) {
    const altos = opcoes.liderancas.filter((l) => l.alignment === 'ALTO').length;
    pontos.push(
      opcoes.liderancas.length
        ? { texto: `${opcoes.liderancas.length} ${opcoes.liderancas.length === 1 ? 'liderança cadastrada' : 'lideranças cadastradas'}, ${altos} com alinhamento alto.`, cor: COR.azul }
        : { texto: 'Nenhuma liderança cadastrada no CRM para este município.', cor: COR.cinza }
    );
  }
  r.pontos(pontos);

  /* ---------- evolução ---------- */
  r.secao('Votos de Jefferson Campos por eleição', 'Resultado em cada eleição para deputado federal. Em amarelo, o ciclo deste relatório.');
  r.barrasVerticais(
    ANOS_ELEICAO.map(String),
    ANOS_ELEICAO.map((a) => votosJefNoAno(c, a)),
    { destaque: ANOS_ELEICAO.indexOf(ano) }
  );

  /* ---------- candidatos ---------- */
  const candidatos = Object.entries(c.historicoCandidatos || {}).filter(([, porAno]) => Object.values(porAno).some((v) => v > 0));
  if (candidatos.length) {
    const anosUsados = ANOS_ELEICAO.filter((a) => candidatos.some(([, p]) => (p[a] ?? 0) > 0));
    r.secao('Candidatos cadastrados na cidade', 'Votos de cada candidato do sistema em cada eleição. Traço quando não concorreu ou não teve voto.');
    r.tabela(
      [{ titulo: 'Candidato', largura: 34 }, ...anosUsados.map((a) => ({ titulo: String(a), largura: 12, alinhar: 'right' as const }))],
      candidatos
        .sort((a, b) => (b[1][ano] ?? 0) - (a[1][ano] ?? 0))
        .map(([nome, porAno]) => [nome, ...anosUsados.map((a) => (porAno[a] ? fmtInt(porAno[a]) : '-'))]),
      { destacar: (i) => candidatos[i][0].toUpperCase().includes('JEFFERSON CAMPOS') }
    );
  }

  /* ---------- emendas ---------- */
  r.secao('Emendas parlamentares por área', c.totalEmendas ? `Total de ${fmtMoeda(c.totalEmendas)} em ${c.totalDestinacoes} destinações.` : undefined);
  if (c.totalEmendas > 0) {
    const areas = Object.entries(c.emendas).sort((a, b) => b[1] - a[1]);
    r.barrasHorizontais(
      areas.map(([area, valor], i) => ({
        rotulo: textoArea(area),
        valor,
        texto: `${fmtMoeda(valor)}  (${fmtPct((valor / c.totalEmendas) * 100, 0)})`,
        cor: CORES_SERIE[i % CORES_SERIE.length],
      })),
      { largValor: 48 }
    );
  } else {
    r.aviso(`Nenhuma emenda registrada para ${c.municipio}. Se houver destinações recentes, inclua na planilha de emendas e importe de novo.`);
  }

  /* ---------- comparação (só no estratégico) ---------- */
  if (variante === 'estrategico') {
    const parecidas = cidadesParecidas(c, todos);
    if (parecidas.length) {
      r.secao(
        'Cidades de porte parecido',
        `Municípios com eleitorado entre 70% e 130% do de ${c.municipio}, ordenados pela penetração em ${ANO_BASE}. Mostram até onde é possível chegar com um eleitorado do mesmo tamanho.`
      );
      const linhas = [c, ...parecidas]
        .sort((a, b) => (penetracao(b) ?? 0) - (penetracao(a) ?? 0))
        .map((o) => [
          o.municipio,
          fmtInt(o.eleitorado.totalEleitores),
          fmtInt(votosJefNoAno(o, ANO_BASE)),
          penetracao(o) === null ? '-' : fmtPct(penetracao(o) ?? 0, 2),
          fmtMoedaCurta(o.totalEmendas),
        ]);
      r.tabela(
        [
          { titulo: 'Município', largura: 34 },
          { titulo: 'Eleitores', largura: 16, alinhar: 'right' },
          { titulo: `Votos ${ANO_BASE}`, largura: 15, alinhar: 'right' },
          { titulo: 'Penetração', largura: 14, alinhar: 'right' },
          { titulo: 'Emendas', largura: 16, alinhar: 'right' },
        ],
        linhas,
        { destacar: (i) => linhas[i][0] === c.municipio }
      );
    }
  }

  /* ---------- zonas ---------- */
  r.secao('Zonas eleitorais', `Eleitorado de ${ANO_BASE} por zona.`);
  if (c.eleitorado.zonas.length) {
    const total = c.eleitorado.totalEleitores || 1;
    const numero = (q: string) => parseFloat(String(q).replace(/\./g, '').replace(',', '.')) || 0;
    r.tabela(
      [
        { titulo: 'Zona', largura: 30 },
        { titulo: 'Eleitores', largura: 20, alinhar: 'right' },
        { titulo: 'Parte do município', largura: 20, alinhar: 'right' },
      ],
      [...c.eleitorado.zonas]
        .sort((a, b) => numero(b.quantidade) - numero(a.quantidade))
        .map((z) => [`Zona ${z.zona}`, fmtInt(numero(z.quantidade)), fmtPct((numero(z.quantidade) / total) * 100, 1)])
    );
  } else {
    r.aviso('Sem registro de zonas eleitorais para este município no arquivo de eleitorado.');
  }

  /* ---------- lideranças ---------- */
  r.secao('Lideranças cadastradas no CRM');
  if (opcoes.liderancas === null || opcoes.liderancas === undefined) {
    r.aviso('Não foi possível consultar as lideranças agora. Gere o relatório de novo com internet para incluir esta parte.', COR.perda);
  } else if (opcoes.liderancas.length === 0) {
    r.aviso(`Nenhuma liderança cadastrada para ${c.municipio}. Use o botão Lideranças na ficha da cidade para registrar vereadores, presidentes de partido e lideranças comunitárias.`);
  } else {
    const contar = (a: string) => opcoes.liderancas!.filter((l) => l.alignment === a).length;
    r.barraEmpilhada([
      { rotulo: 'Alto', valor: contar('ALTO'), cor: COR.ganho },
      { rotulo: 'Médio', valor: contar('MEDIO'), cor: COR.amarelo },
      { rotulo: 'Em conquista', valor: contar('EM CONQUISTA'), cor: COR.perda },
    ]);
    r.tabela(
      [
        { titulo: 'Nome', largura: 26 },
        { titulo: 'Cargo', largura: 22 },
        { titulo: 'Partido', largura: 10 },
        { titulo: 'Telefone', largura: 17 },
        { titulo: 'Alinhamento', largura: 14 },
        { titulo: 'Observações', largura: 30 },
      ],
      opcoes.liderancas.map((l) => [l.name, l.role, l.party || '-', l.phone || '-', ALINHAMENTO[l.alignment] ?? l.alignment, l.notes || '-']),
      {
        corColuna: (li, col) => {
          if (col !== 4) return undefined;
          const a = opcoes.liderancas![li].alignment;
          return a === 'ALTO' ? COR.ganho : a === 'MEDIO' ? COR.amareloEscuro : COR.perda;
        },
      }
    );
  }

  r.nota(
    `Fontes: resultados eleitorais e emendas cadastrados na API Cidadania 360; eleitorado por zona do TSE (${ANO_BASE}). A meta de ${ANO_META} considera ${crescimento}% de crescimento sobre os votos de ${ANO_BASE}. Penetração = votos ÷ eleitorado de ${ANO_BASE}.`
  );

  const prefixo = variante === 'estrategico' ? `Plano_${ANO_META}` : 'Dossie';
  r.salvar(`${prefixo}_${nomeArquivo(c.municipio)}_${ano}.pdf`);
}
