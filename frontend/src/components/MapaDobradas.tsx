import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { List, X, ChevronDown, ChevronUp, FileText, Users, MessageCircle, Search, Layers } from 'lucide-react';
import { api, getDobradas } from '../services/api';
import type { Lideranca } from '../tipos';
import { rastrear } from '../services/carregamento';
import { PainelCRM } from './PainelCRM';
import { ModalZonas, type ZonaEleitoral } from './ModalZonas';
import { RankingCidade } from './votacao/RankingCidade';
import { ZonasCidade } from './votacao/ZonasCidade';
import { AliadosCidade } from './votacao/AliadosCidade';
import { BuscaCandidato } from './votacao/BuscaCandidato';
import { useDados } from './votacao/useDados';
import { votacao, nomeProprio, textoSituacao, carregarTseCidade, type CandidatoResumo } from '../services/votacao';

interface MunicipioDado {
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
}

const GEOJSON_SP = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-35-mun.json';

const normalizar = (texto: string) => {
  if (!texto) return '';
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim();
};

const combina = (consulta: string) => typeof window !== 'undefined' && !!window.matchMedia?.(consulta).matches;

type ModoCor = 'votos' | 'penetracao' | 'comparar' | 'candidato';
type AbaFicha = 'resumo' | 'ranking' | 'zonas' | 'aliados';

const ABAS_FICHA: [AbaFicha, string][] = [
  ['resumo', 'Resumo'],
  ['ranking', 'Ranking 2026'],
  ['zonas', 'Zonas'],
  ['aliados', 'Aliados'],
];

const SEM_DADO = '#334155';

/* Cada modo tem suas faixas: a cor vem da primeira faixa que o valor alcança */
const FAIXAS: Record<ModoCor, { min: number; cor: string; texto: string }[]> = {
  votos: [
    { min: 20000, cor: '#1e3a8a', texto: 'Reduto forte (mais de 20 mil)' },
    { min: 5000, cor: '#2563eb', texto: 'Consolidada (5 mil a 20 mil)' },
    { min: 1000, cor: '#3b82f6', texto: 'Média (1 mil a 5 mil)' },
    { min: -Infinity, cor: '#93c5fd', texto: 'Baixa (até 1 mil)' },
  ],
  penetracao: [
    { min: 5, cor: '#1e3a8a', texto: '5% ou mais do eleitorado' },
    { min: 2, cor: '#2563eb', texto: '2% a 5%' },
    { min: 1, cor: '#3b82f6', texto: '1% a 2%' },
    { min: -Infinity, cor: '#93c5fd', texto: 'Menos de 1%' },
  ],
  // Verde-azulado para ganho e laranja para perda: legível também para daltônicos
  comparar: [
    { min: 25, cor: '#0d9488', texto: 'Cresceu 25% ou mais' },
    { min: 0.0001, cor: '#5eead4', texto: 'Cresceu até 25%' },
    { min: -0.0001, cor: '#64748b', texto: 'Sem variação' },
    { min: -25, cor: '#fdba74', texto: 'Caiu até 25%' },
    { min: -Infinity, cor: '#ea580c', texto: 'Caiu 25% ou mais' },
  ],
  // % dos votos válidos do cargo na cidade, em 2026
  candidato: [
    { min: 15, cor: '#4c1d95', texto: '15% ou mais dos votos da cidade' },
    { min: 5, cor: '#7c3aed', texto: '5% a 15%' },
    { min: 2, cor: '#a78bfa', texto: '2% a 5%' },
    { min: 0.5, cor: '#c4b5fd', texto: '0,5% a 2%' },
    { min: -Infinity, cor: '#ede9fe', texto: 'Menos de 0,5%' },
  ],
};

const corDaFaixa = (modo: ModoCor, valor: number | null) => {
  if (valor === null) return SEM_DADO;
  return FAIXAS[modo].find((f) => valor >= f.min)?.cor ?? SEM_DADO;
};

const formatarPct = (v: number, sinal = false) =>
  `${sinal && v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/* Enquadra o estado ao carregar e voa até a cidade escolhida, deixando espaço para a ficha */
function AjustarMapa({ geo, alvo }: { geo: any; alvo: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (!geo) return;
    const deitado = combina('(max-height: 520px) and (orientation: landscape) and (max-width: 1023px)');
    const lateral = combina('(min-width: 1024px)') || deitado;
    const celular = combina('(max-width: 767px)');
    const altura = map.getSize().y;

    if (alvo) {
      const feature = geo.features?.find((f: any) => normalizar(f.properties?.name) === alvo);
      if (!feature) return;
      map.flyToBounds(L.geoJSON(feature).getBounds(), {
        paddingTopLeft: [20, celular ? 110 : 20],
        paddingBottomRight: lateral ? [deitado ? Math.round(map.getSize().x * 0.56) + 20 : 440, 20] : [20, Math.round(altura * (celular ? 0.66 : 0.55))],
        maxZoom: 10,
        duration: 0.6,
      });
    } else {
      map.fitBounds(L.geoJSON(geo).getBounds(), {
        paddingTopLeft: [12, celular ? 64 : 12],
        paddingBottomRight: [12, 12],
      });
    }
  }, [geo, alvo, map]);

  return null;
}

export function MapaDobradas() {
  const anosDisponiveis = [2002, 2006, 2010, 2014, 2018, 2022, 2026];
  const [dados, setDados] = useState<MunicipioDado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(2026);
  const [pesquisa, setPesquisa] = useState('');
  const [cidadeDestaque, setCidadeDestaque] = useState<MunicipioDado | null>(null);
  const [modalZonasAberto, setModalZonasAberto] = useState<boolean>(false);
  const [crmAberto, setCrmAberto] = useState<boolean>(false);
  const [listaAberta, setListaAberta] = useState(false);
  const [fichaMinimizada, setFichaMinimizada] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [legendaAberta, setLegendaAberta] = useState(() => combina('(min-width: 768px)'));
  const [modoCor, setModoCor] = useState<ModoCor>('votos');
  const [anoComparar, setAnoComparar] = useState<number>(2022);
  const [abaFicha, setAbaFicha] = useState<AbaFicha>('resumo');
  const [candidatoMapa, setCandidatoMapa] = useState<CandidatoResumo | null>(null);

  useEffect(() => {
    let ativo = true;
    getDobradas(anoSelecionado)
      .then((res: MunicipioDado[]) => {
        if (!ativo) return;
        if (!Array.isArray(res)) {
          setErroCarga(true);
          return;
        }
        setErroCarga(false);
        setDados(res);
        // Mantém a cidade aberta com os números do novo ano
        setCidadeDestaque((atual) => (atual ? res.find((c) => c.id === atual.id) ?? atual : atual));
      })
      .catch((err: any) => {
        console.error('Erro ao buscar dobradas:', err);
        if (ativo) setErroCarga(true);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [anoSelecionado, tentativa]);

  const tentarDeNovo = () => {
    setCarregando(true);
    setErroCarga(false);
    setTentativa((t) => t + 1);
  };

  useEffect(() => {
    rastrear(axios.get(GEOJSON_SP))
      .then((res: any) => setGeoJsonData(res.data))
      .catch((err: any) => console.error('Erro ao carregar GeoJSON', err));
  }, []);

  const dadosPorNome = useMemo(() => {
    const mapa = new Map<string, MunicipioDado>();
    dados.forEach((d) => mapa.set(normalizar(d.municipio), d));
    return mapa;
  }, [dados]);

  // O clique no mapa lê sempre os dados mais recentes, mesmo depois de trocar o ano
  const dadosPorNomeRef = useRef(dadosPorNome);
  useEffect(() => {
    dadosPorNomeRef.current = dadosPorNome;
  }, [dadosPorNome]);

  const cidadesOrdenadas = useMemo(() => [...dados].sort((a, b) => b.votosJefferson - a.votosJefferson), [dados]);
  const posicao = useMemo(() => new Map(cidadesOrdenadas.map((c, i) => [c.id, i + 1])), [cidadesOrdenadas]);
  const termo = normalizar(pesquisa);
  const cidadesFiltradas = termo ? cidadesOrdenadas.filter((c) => normalizar(c.municipio).includes(termo)) : cidadesOrdenadas;

  const trocarAno = (ano: number) => {
    if (ano === anoSelecionado) return;
    setCarregando(true);
    setErroCarga(false);
    setAnoSelecionado(ano);
  };

  const selecionarCidade = (c: MunicipioDado) => {
    setCidadeDestaque(c);
    setFichaMinimizada(false);
    setListaAberta(false);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const [gerandoPdf, setGerandoPdf] = useState(false);

  // Dossiê da cidade: busca as lideranças e carrega o gerador de PDF só agora
  const exportarFichaPDF = async () => {
    if (!cidadeDestaque || gerandoPdf) return;
    setGerandoPdf(true);
    try {
      const liderancas = await api
        .get<Lideranca[]>(`/leaderships/${cidadeDestaque.id}`)
        .then((r) => r.data)
        .catch(() => null);
      const [{ gerarRelatorioCidade }, tse] = await Promise.all([rastrear(import('../relatorios')), carregarTseCidade(cidadeDestaque.codigoIbge)]);
      gerarRelatorioCidade(cidadeDestaque, dados, { ano: anoSelecionado, variante: 'dossie', liderancas, tse });
    } catch (err) {
      console.error('Erro ao gerar o dossiê:', err);
      window.alert('Não foi possível gerar o PDF. Tente de novo.');
    } finally {
      setGerandoPdf(false);
    }
  };

  const compartilharWhatsApp = () => {
    if (!cidadeDestaque) return;
    const texto = encodeURIComponent(
      `📊 *Dossiê Político - ${cidadeDestaque.municipio} (SP)*\n\n` +
        `👤 *Jefferson Campos (${anoSelecionado})*: ${cidadeDestaque.votosJefferson.toLocaleString('pt-BR')} votos\n` +
        `📋 *Eleitores (Zonas)*: ${cidadeDestaque.eleitorado.totalEleitores.toLocaleString('pt-BR')} (Penetração: ${cidadeDestaque.eleitorado.penetracao})\n` +
        `💰 *Total de Emendas*: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cidadeDestaque.totalEmendas)}\n\n` +
        `_Relatório gerado pela API Cidadania 360._`
    );
    window.open(`https://api.whatsapp.com/send?text=${texto}`, '_blank');
  };

  // No celular a faixa de anos rola de lado: mantém o ano escolhido à vista
  const anosMobileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const faixa = anosMobileRef.current;
    const ativo = faixa?.querySelector<HTMLElement>('.ano.is-ativo');
    if (faixa && ativo && faixa.scrollWidth > faixa.clientWidth) {
      faixa.scrollLeft = ativo.offsetLeft - faixa.clientWidth / 2 + ativo.offsetWidth / 2;
    }
  }, [anoSelecionado]);

  const nomeDestaque = cidadeDestaque ? normalizar(cidadeDestaque.municipio) : null;

  // Tela 2: modo "Candidato". Começa com Jefferson Campos e troca pela busca.
  const escolherModo = (m: ModoCor) => {
    setModoCor(m);
    if (m === 'candidato' && !candidatoMapa) {
      votacao
        .candidatos('2274', 'federal', 1)
        .then((r) => r[0] && setCandidatoMapa((atual) => atual ?? r[0]))
        .catch(() => {});
    }
  };
  const votosCand = useDados(candidatoMapa ? `cand-${candidatoMapa.id}` : 'cand-nenhum', () =>
    candidatoMapa ? votacao.votosDoCandidato(candidatoMapa.id) : Promise.resolve(null)
  );
  const votosCandPorIbge = useMemo(() => {
    const mapa = new Map<string, { votos: number; pct: number; posicao: number }>();
    votosCand.dados?.municipios.forEach((m) => mapa.set(m.ibge, m));
    return mapa;
  }, [votosCand.dados]);
  const modoCandidato = modoCor === 'candidato' && !!candidatoMapa;

  // No modo candidato a lista segue os votos dele, e o número ao lado é a posição da cidade para ele
  const ordemCandidato = useMemo(() => {
    const ordem = [...dados].sort((a, b) => (votosCandPorIbge.get(b.codigoIbge)?.votos ?? 0) - (votosCandPorIbge.get(a.codigoIbge)?.votos ?? 0));
    return new Map(ordem.map((c, i) => [c.id, i + 1]));
  }, [dados, votosCandPorIbge]);
  const listaVisivel = modoCandidato
    ? [...cidadesFiltradas].sort((a, b) => (ordemCandidato.get(a.id) ?? 0) - (ordemCandidato.get(b.id) ?? 0))
    : cidadesFiltradas;
  const posicaoNaLista = (c: MunicipioDado) => (modoCandidato ? (votosCandPorIbge.has(c.codigoIbge) ? ordemCandidato.get(c.id) : null) : posicao.get(c.id));
  const votoCandDestaque = modoCandidato && cidadeDestaque ? votosCandPorIbge.get(cidadeDestaque.codigoIbge) : undefined;

  // Ano de comparação: nunca o mesmo ano da base; se coincidir, usa o ciclo anterior
  const idxBase = anosDisponiveis.indexOf(anoSelecionado);
  const cicloAnterior = idxBase > 0 ? anosDisponiveis[idxBase - 1] : anosDisponiveis[1];
  const anoComp = anoComparar !== anoSelecionado ? anoComparar : cicloAnterior;

  const penetracaoDe = (c: MunicipioDado) =>
    c.eleitorado.totalEleitores > 0 && c.votosJefferson > 0 ? (c.votosJefferson / c.eleitorado.totalEleitores) * 100 : null;

  // Variação dos votos de Jefferson Campos entre o ano base e o ano de comparação
  const variacaoDe = (c: MunicipioDado) => {
    const atual = c.historicoJef?.[anoSelecionado] ?? c.votosJefferson ?? 0;
    const antes = c.historicoJef?.[anoComp] ?? 0;
    if (!atual && !antes) return null;
    const pct = antes ? ((atual - antes) / antes) * 100 : 100;
    return { atual, antes, dif: atual - antes, pct };
  };

  const valorDoModo = (c: MunicipioDado | undefined): number | null => {
    if (!c) return null;
    if (modoCor === 'votos') return c.votosJefferson > 0 ? c.votosJefferson : null;
    if (modoCor === 'penetracao') return penetracaoDe(c);
    if (modoCor === 'candidato') return votosCandPorIbge.get(c.codigoIbge)?.pct ?? null;
    return variacaoDe(c)?.pct ?? null;
  };

  const detalheLista = (c: MunicipioDado) => {
    if (modoCandidato) {
      const v = votosCandPorIbge.get(c.codigoIbge);
      return v ? `${v.votos.toLocaleString('pt-BR')} votos, ${formatarPct(v.pct)} da cidade` : 'Sem votos';
    }
    const votos = `${c.votosJefferson.toLocaleString('pt-BR')} votos`;
    if (modoCor === 'penetracao') {
      const p = penetracaoDe(c);
      return p === null ? votos : `${votos}, ${formatarPct(p)} do eleitorado`;
    }
    if (modoCor === 'comparar') {
      const v = variacaoDe(c);
      if (!v) return votos;
      return v.antes ? `${votos}, ${formatarPct(v.pct, true)} sobre ${anoComp}` : `${votos}, sem votos em ${anoComp}`;
    }
    return votos;
  };

  const variacaoDestaque = cidadeDestaque && modoCor === 'comparar' ? variacaoDe(cidadeDestaque) : null;

  const mapStyle = (feature: any) => {
    const nomeFeature = normalizar(feature.properties.name);
    const fillColor = corDaFaixa(modoCor, valorDoModo(dadosPorNome.get(nomeFeature)));

    const isSelecionada = nomeDestaque === nomeFeature;
    return {
      fillColor,
      weight: isSelecionada ? 3 : 1,
      opacity: 1,
      color: isSelecionada ? '#facc15' : '#1e293b',
      fillOpacity: 0.8,
    };
  };

  const seletorAnos = (
    <div className="anos" role="group" aria-label="Ciclo eleitoral" ref={anosMobileRef}>
      {anosDisponiveis.map((ano) => (
        <button
          key={ano}
          className={`ano ${anoSelecionado === ano ? 'is-ativo' : ''}`}
          aria-pressed={anoSelecionado === ano}
          onClick={() => trocarAno(ano)}
        >
          {ano}
        </button>
      ))}
    </div>
  );

  const statusLista = carregando
    ? `Carregando votos de ${anoSelecionado}...`
    : erroCarga
    ? 'O servidor não respondeu.'
    : modoCandidato
    ? `${cidadesFiltradas.length} municípios, votos de ${nomeProprio(candidatoMapa!.nomeUrna)} em 2026`
    : `${cidadesFiltradas.length} municípios, votos de ${anoSelecionado}`;

  const avisoErro = erroCarga && !carregando && (
    <div className="aviso-erro" role="alert">
      <p>O servidor não respondeu. Confira a internet e tente de novo.</p>
      <button className="btn btn--primario" onClick={tentarDeNovo}>
        Tentar de novo
      </button>
    </div>
  );

  return (
    <div className="mapa">
      {/* LISTA DE MUNICÍPIOS (lateral no tablet e desktop, tela cheia no celular) */}
      <aside className={`mapa-lista ${listaAberta ? 'is-aberta' : ''}`} aria-label="Lista de municípios">
        <div className="mapa-lista__cab">
          <h2>Mapa Eleitoral - SP</h2>
          <button className="btn-icone mapa-lista__fechar" onClick={() => setListaAberta(false)} aria-label="Voltar ao mapa">
            <X size={18} />
          </button>
        </div>

        <div className="mapa-lista__bloco bloco-anos">
          <p className="rotulo-peq">Ciclo eleitoral base</p>
          {seletorAnos}
        </div>

        <div className="mapa-lista__bloco">
          <label className="busca">
            <Search size={16} />
            <input
              type="search"
              enterKeyHint="search"
              placeholder="Pesquisar município"
              aria-label="Pesquisar município"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
            />
          </label>
        </div>

        <div className="mapa-lista__total">{statusLista}</div>

        <div className="lista-cidades" aria-busy={carregando}>
          {avisoErro}
          {carregando && dados.length === 0 &&
            Array.from({ length: 8 }).map((_, i) => <div key={i} className="esqueleto esqueleto--cidade" />)}
          {!carregando && !erroCarga && termo && cidadesFiltradas.length === 0 && (
            <p className="texto-vazio" style={{ padding: '8px 4px' }}>
              Nenhum município com "{pesquisa}". Confira a grafia ou apague a busca.
            </p>
          )}
          {listaVisivel.map((c) => {
            const pos = posicaoNaLista(c);
            return (
              <button key={c.id} className={`cidade ${cidadeDestaque?.id === c.id ? 'is-ativo' : ''}`} onClick={() => selecionarCidade(c)}>
                <span>
                  <span className="cidade__nome">{c.municipio}</span>
                  <span className="cidade__votos num">{detalheLista(c)}</span>
                </span>
                <span className="cidade__pos num">{pos ? `${pos}º` : '-'}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* MAPA */}
      <section className="mapa-area">
        <div className="topo-mobile">
          {seletorAnos}
          <button className="btn btn--primario btn-lista" onClick={() => setListaAberta(true)}>
            <List size={18} /> Lista
          </button>
        </div>

        {erroCarga && !carregando && <div className="aviso-mapa">{avisoErro}</div>}

        <div className="legenda">
          <button className="legenda__titulo" onClick={() => setLegendaAberta((v) => !v)} aria-expanded={legendaAberta}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} /> Cores:{' '}
              {modoCor === 'votos'
                ? 'votos'
                : modoCor === 'penetracao'
                ? 'penetração'
                : modoCor === 'candidato'
                ? candidatoMapa
                  ? nomeProprio(candidatoMapa.nomeUrna)
                  : 'candidato'
                : `${anoSelecionado} x ${anoComp}`}
            </span>
            {legendaAberta ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {legendaAberta && (
            <div className="legenda__itens">
              <div className="modo-cor" role="group" aria-label="Colorir o mapa por">
                {(
                  [
                    ['votos', 'Votos'],
                    ['penetracao', 'Penetração'],
                    ['comparar', 'Comparar'],
                    ['candidato', 'Candidato'],
                  ] as [ModoCor, string][]
                ).map(([m, rotulo]) => (
                  <button key={m} className={modoCor === m ? 'is-ativo' : ''} aria-pressed={modoCor === m} onClick={() => escolherModo(m)}>
                    {rotulo}
                  </button>
                ))}
              </div>

              {modoCor === 'comparar' && (
                <label className="modo-cor__comparar">
                  {anoSelecionado} comparado com
                  <select className="campo" value={anoComp} onChange={(e) => setAnoComparar(Number(e.target.value))}>
                    {anosDisponiveis
                      .filter((a) => a !== anoSelecionado)
                      .map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                  </select>
                </label>
              )}

              {modoCor === 'candidato' && (
                <div className="modo-cand">
                  {candidatoMapa && (
                    <div className="modo-cand__atual">
                      <strong>{nomeProprio(candidatoMapa.nomeUrna)}</strong>
                      <span>
                        {candidatoMapa.partido} · {candidatoMapa.numero} · {candidatoMapa.votos.toLocaleString('pt-BR')} votos · {textoSituacao(candidatoMapa.situacao)}
                      </span>
                      {votosCand.carregando && <span className="modo-cand__status">Carregando votos por cidade...</span>}
                      {votosCand.erro && (
                        <button className="btn" onClick={votosCand.tentarDeNovo}>
                          Tentar de novo
                        </button>
                      )}
                    </div>
                  )}
                  <BuscaCandidato
                    aoEscolher={(c) => {
                      setCandidatoMapa(c);
                      // no celular a legenda cobre o mapa: fecha para mostrar o resultado
                      if (combina('(max-width: 767px)')) setLegendaAberta(false);
                    }}
                  />
                </div>
              )}

              {FAIXAS[modoCor].map((l) => (
                <div key={l.cor} className="legenda__item">
                  <span className="legenda__cor" style={{ backgroundColor: l.cor }} />
                  {l.texto}
                </div>
              ))}
              <div className="legenda__item">
                <span className="legenda__cor" style={{ backgroundColor: SEM_DADO }} />
                {modoCor === 'comparar' ? 'Sem votos nos dois anos' : 'Sem votos'}
              </div>
              {modoCor === 'penetracao' && <p className="legenda__nota">Votos do ano escolhido sobre o eleitorado de 2026.</p>}
              {modoCor === 'comparar' && <p className="legenda__nota">Votos de Jefferson Campos em cada ano.</p>}
              {modoCor === 'candidato' && <p className="legenda__nota">Resultado oficial do TSE de 2026. Vale para qualquer cargo.</p>}
            </div>
          )}
        </div>

        {/* FICHA DO MUNICÍPIO */}
        {cidadeDestaque && (
          <div className={`ficha ${fichaMinimizada ? 'is-min' : ''}`} role="dialog" aria-label={`Ficha de ${cidadeDestaque.municipio}`}>
            <div className="ficha__alca" onClick={() => setFichaMinimizada((v) => !v)} />
            <div className="ficha__cab">
              <div className="ficha__cab-texto">
                <p className="rotulo-peq">Visão político municipal</p>
                <h2 className="ficha__nome">
                  {cidadeDestaque.municipio} <span className="ficha__uf">SP</span>
                </h2>
                <p className="ficha__resumo num">
                  {cidadeDestaque.votosJefferson.toLocaleString('pt-BR')} votos em {anoSelecionado}
                </p>
                {votoCandDestaque !== undefined || (modoCandidato && cidadeDestaque) ? (
                  <p className="ficha__variacao num is-cand">
                    {votoCandDestaque
                      ? `${nomeProprio(candidatoMapa!.nomeUrna)}: ${votoCandDestaque.votos.toLocaleString('pt-BR')} votos, ${formatarPct(votoCandDestaque.pct)}, ${votoCandDestaque.posicao}º na cidade`
                      : `${nomeProprio(candidatoMapa!.nomeUrna)} não teve votos aqui`}
                  </p>
                ) : null}
                {variacaoDestaque && (
                  <p className={`ficha__variacao num ${variacaoDestaque.dif > 0 ? 'is-alta' : variacaoDestaque.dif < 0 ? 'is-baixa' : ''}`}>
                    {variacaoDestaque.antes
                      ? `${variacaoDestaque.dif > 0 ? '+' : ''}${variacaoDestaque.dif.toLocaleString('pt-BR')} votos (${formatarPct(variacaoDestaque.pct, true)}) sobre ${anoComp}, quando teve ${variacaoDestaque.antes.toLocaleString('pt-BR')}`
                      : `Sem votos registrados em ${anoComp}`}
                  </p>
                )}
              </div>
              <div className="ficha__cab-botoes">
                <button
                  className="btn-icone ficha__min"
                  onClick={() => setFichaMinimizada((v) => !v)}
                  aria-label={fichaMinimizada ? 'Expandir ficha' : 'Minimizar ficha'}
                >
                  {fichaMinimizada ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                <button className="btn-icone" onClick={() => setCidadeDestaque(null)} aria-label="Fechar ficha">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="ficha__abas" role="tablist" aria-label="Seções da ficha">
              {ABAS_FICHA.map(([aba, rotulo]) => (
                <button key={aba} role="tab" aria-selected={abaFicha === aba} className={abaFicha === aba ? 'is-ativo' : ''} onClick={() => setAbaFicha(aba)}>
                  {rotulo}
                </button>
              ))}
            </div>

            <div className={`ficha__corpo ${abaFicha !== 'resumo' ? 'ficha__corpo--lista' : ''}`} role="tabpanel">
              {abaFicha === 'ranking' && <RankingCidade key={cidadeDestaque.codigoIbge} ibge={cidadeDestaque.codigoIbge} nome={cidadeDestaque.municipio} />}
              {abaFicha === 'zonas' && <ZonasCidade ibge={cidadeDestaque.codigoIbge} nome={cidadeDestaque.municipio} />}
              {abaFicha === 'aliados' && <AliadosCidade ibge={cidadeDestaque.codigoIbge} municipioId={cidadeDestaque.id} nome={cidadeDestaque.municipio} />}
              {abaFicha === 'resumo' && (
              <>
              <button className="cartao cartao--botao" onClick={() => setModalZonasAberto(true)} title="Ver o eleitorado por zona eleitoral">
                <div className="cartao__linha">
                  <div>
                    <p className="rotulo-peq">Eleitores (ver zonas) 📋</p>
                    <p className="cartao__valor num" style={{ color: 'var(--green)' }}>
                      {cidadeDestaque.eleitorado.totalEleitores.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="rotulo-peq">Penetração</p>
                    <p className="cartao__valor num" style={{ color: 'var(--blue-l)' }}>
                      {cidadeDestaque.eleitorado.penetracao}
                    </p>
                  </div>
                </div>
              </button>

              <div className="cartao">
                <h3 className="cartao__titulo" style={{ color: 'var(--accent)' }}>Total de emendas destinadas</h3>
                <p className="cartao__valor num" style={{ marginTop: 0 }}>{formatCurrency(cidadeDestaque.totalEmendas)}</p>
                <p className="cartao__nota">
                  {cidadeDestaque.totalDestinacoes} destinações em {Object.keys(cidadeDestaque.emendas).length} áreas.
                </p>
                {Object.entries(cidadeDestaque.emendas)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, val]) => (
                    <div key={cat} className="barra-cat">
                      <div className="barra-cat__topo">
                        <span>{cat}</span>
                        <strong className="num">{formatCurrency(val as number)}</strong>
                      </div>
                      <div className="barra">
                        <div style={{ width: `${((val as number) / (cidadeDestaque.totalEmendas || 1)) * 100}%` }} />
                      </div>
                    </div>
                  ))}
              </div>

              <div className="cartao cartao--largo">
                <h3 className="cartao__titulo" style={{ color: 'var(--blue-l)' }}>Histórico por candidato e ano</h3>
                {cidadeDestaque.historicoCandidatos &&
                  Object.entries(cidadeDestaque.historicoCandidatos).map(([candName, anosVotos]) => (
                    <div key={candName} className="hist-cand">
                      <strong>{candName}</strong>
                      <div className="hist-anos">
                        {anosDisponiveis.map((ano) => {
                          const v = anosVotos[ano];
                          if (v === undefined || v === 0) return null;
                          return (
                            <div key={ano} className="hist-ano num">
                              <span>{ano}:</span> <b>{v.toLocaleString('pt-BR')}</b>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
              </>
              )}
            </div>

            <div className="ficha__acoes">
              <button className="btn acao acao--pdf" onClick={exportarFichaPDF} disabled={gerandoPdf}>
                <FileText size={16} /> {gerandoPdf ? 'Gerando...' : 'PDF'}
              </button>
              <button className="btn acao acao--crm" onClick={() => setCrmAberto(true)}>
                <Users size={16} /> Lideranças
              </button>
              <button className="btn acao acao--zap" onClick={compartilharWhatsApp}>
                <MessageCircle size={16} /> WhatsApp
              </button>
            </div>
          </div>
        )}

        <MapContainer
          center={[-22.3, -48.6]}
          zoom={6}
          zoomSnap={0.25}
          zoomControl={false}
          preferCanvas
          style={{ height: '100%', width: '100%' }}
        >
          <ZoomControl position="bottomright" />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          {geoJsonData && (
            <GeoJSON
              key="sp"
              data={geoJsonData}
              style={mapStyle}
              onEachFeature={(feature, layer) => {
                const nomeFeature = normalizar(feature.properties.name);
                layer.on({
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    const dadosCidade = dadosPorNomeRef.current.get(nomeFeature);
                    if (dadosCidade) selecionarCidade(dadosCidade);
                  },
                });
                // No toque não existe "passar o mouse": o nome aparece na ficha
                if (combina('(hover: hover)')) {
                  layer.bindTooltip(`<strong>${feature.properties.name}</strong>`, { sticky: true });
                }
              }}
            />
          )}
          <AjustarMapa geo={geoJsonData} alvo={nomeDestaque} />
        </MapContainer>
      </section>

      {modalZonasAberto && cidadeDestaque && (
        <ModalZonas
          municipio={cidadeDestaque.municipio}
          zonas={cidadeDestaque.eleitorado.zonas}
          onClose={() => setModalZonasAberto(false)}
        />
      )}

      {crmAberto && cidadeDestaque && (
        <PainelCRM municipioId={cidadeDestaque.id} municipioNome={cidadeDestaque.municipio} onClose={() => setCrmAberto(false)} />
      )}
    </div>
  );
}
