import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import jsPDF from 'jspdf';
import { List, X, ChevronDown, ChevronUp, FileText, Users, MessageCircle, Search, Layers } from 'lucide-react';
import { getDobradas } from '../services/api';
import { PainelCRM } from './PainelCRM';
import { ModalZonas, type ZonaEleitoral } from './ModalZonas';

interface MunicipioDado {
  id: string;
  municipio: string;
  codigoIbge: string;
  votosJefferson: number;
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

const CORES_LEGENDA = [
  { cor: '#1e3a8a', texto: 'Reduto forte (> 20 mil)' },
  { cor: '#2563eb', texto: 'Consolidada (5 mil a 20 mil)' },
  { cor: '#3b82f6', texto: 'Média (1 mil a 5 mil)' },
  { cor: '#93c5fd', texto: 'Baixa (até 1 mil)' },
  { cor: '#334155', texto: 'Sem votos' },
];

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
  const [legendaAberta, setLegendaAberta] = useState(() => combina('(min-width: 768px)'));

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
  }, [anoSelecionado]);

  useEffect(() => {
    axios
      .get(GEOJSON_SP)
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

  const exportarFichaPDF = () => {
    if (!cidadeDestaque) return;
    const pdf = new jsPDF('p', 'mm', 'a4');

    const corPrimaria = [15, 23, 42];
    const corDestaque = [59, 130, 246];
    const corAmarelo = [250, 204, 21];
    const corCinzaFundo = [241, 245, 249];

    pdf.setFillColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    pdf.rect(0, 0, 210, 35, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(`EXTRATO POLÍTICO MUNICIPAL - JEFFERSON CAMPOS`, 14, 15);
    pdf.setFontSize(12);
    pdf.setTextColor(corAmarelo[0], corAmarelo[1], corAmarelo[2]);
    pdf.text(`${cidadeDestaque.municipio.toUpperCase()} - SP (Ciclo ${anoSelecionado})`, 14, 25);

    let y = 45;
    pdf.setFillColor(corCinzaFundo[0], corCinzaFundo[1], corCinzaFundo[2]);
    pdf.roundedRect(14, y, 56, 22, 3, 3, 'F');
    pdf.roundedRect(77, y, 56, 22, 3, 3, 'F');
    pdf.roundedRect(140, y, 56, 22, 3, 3, 'F');

    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`VOTOS (${anoSelecionado})`, 18, y + 6);
    pdf.text(`ELEITORADO TOTAL`, 81, y + 6);
    pdf.text(`EMENDAS DESTINADAS`, 144, y + 6);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(corDestaque[0], corDestaque[1], corDestaque[2]);
    pdf.text(`${cidadeDestaque.votosJefferson.toLocaleString('pt-BR')} votos`, 18, y + 16);
    pdf.setTextColor(22, 163, 74);
    pdf.text(`${cidadeDestaque.eleitorado.totalEleitores.toLocaleString('pt-BR')}`, 81, y + 16);
    pdf.setTextColor(202, 138, 4);
    pdf.text(`${formatCurrency(cidadeDestaque.totalEmendas)}`, 144, y + 16);

    y += 32;
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    pdf.text(`Distribuição de Emendas por Área`, 14, y);

    y += 6;
    const emendasObj = Object.entries(cidadeDestaque.emendas);
    if (emendasObj.length === 0) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Sem registo de emendas para este município.`, 14, y + 6);
      y += 10;
    } else {
      emendasObj
        .sort((a: any, b: any) => b[1] - a[1])
        .forEach(([cat, val]) => {
          const valorNum = val as number;
          const percent = valorNum / (cidadeDestaque.totalEmendas || 1);

          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(50, 50, 50);
          pdf.text(`${cat.toUpperCase()}: ${formatCurrency(valorNum)}`, 14, y + 6);

          pdf.setFillColor(226, 232, 240);
          pdf.roundedRect(110, y + 2, 86, 4, 1, 1, 'F');
          pdf.setFillColor(corDestaque[0], corDestaque[1], corDestaque[2]);
          pdf.roundedRect(110, y + 2, Math.max(4, 86 * percent), 4, 1, 1, 'F');

          y += 10;
        });
    }

    y += 10;
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    pdf.text(`Evolução Histórica por Candidato`, 14, y);

    y += 6;
    if (cidadeDestaque.historicoCandidatos) {
      Object.entries(cidadeDestaque.historicoCandidatos).forEach(([candName, anosVotos]) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(corDestaque[0], corDestaque[1], corDestaque[2]);
        pdf.text(`${candName}`, 14, y + 5);
        y += 7;

        pdf.setFont('helvetica', 'normal');
        let xOffset = 14;
        anosDisponiveis.forEach((ano) => {
          const v = anosVotos[ano];
          if (v !== undefined && v > 0) {
            if (xOffset > 170) {
              xOffset = 14;
              y += 7;
            }
            pdf.setFillColor(241, 245, 249);
            pdf.roundedRect(xOffset, y, 26, 10, 2, 2, 'F');
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`${ano}`, xOffset + 2, y + 4);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(15, 23, 42);
            pdf.text(`${v.toLocaleString('pt-BR')}`, xOffset + 2, y + 8.5);
            xOffset += 28;
          }
        });
        y += 12;
      });
    }

    pdf.save(`Dossie_Politico_${cidadeDestaque.municipio}.pdf`);
  };

  const compartilharWhatsApp = () => {
    if (!cidadeDestaque) return;
    const texto = encodeURIComponent(
      `📊 *Dossiê Político - ${cidadeDestaque.municipio} (SP)*\n\n` +
        `👤 *Jefferson Campos (${anoSelecionado})*: ${cidadeDestaque.votosJefferson.toLocaleString('pt-BR')} votos\n` +
        `📋 *Eleitores (Zonas)*: ${cidadeDestaque.eleitorado.totalEleitores.toLocaleString('pt-BR')} (Penetração: ${cidadeDestaque.eleitorado.penetracao})\n` +
        `💰 *Total de Emendas*: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cidadeDestaque.totalEmendas)}\n\n` +
        `_Relatório gerado pelo CRM & BI Político._`
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

  const mapStyle = (feature: any) => {
    const nomeFeature = normalizar(feature.properties.name);
    const dadosCidade = dadosPorNome.get(nomeFeature);
    let fillColor = '#334155';

    if (dadosCidade && dadosCidade.votosJefferson > 0) {
      const v = dadosCidade.votosJefferson;
      if (v > 20000) fillColor = '#1e3a8a';
      else if (v > 5000) fillColor = '#2563eb';
      else if (v > 1000) fillColor = '#3b82f6';
      else fillColor = '#93c5fd';
    }

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
    ? 'Carregando dados...'
    : erroCarga
    ? 'Não foi possível carregar os dados. Verifique a conexão.'
    : `${cidadesFiltradas.length} municípios · votos de ${anoSelecionado}`;

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

        <div className="lista-cidades">
          {cidadesFiltradas.map((c) => (
            <button key={c.id} className={`cidade ${cidadeDestaque?.id === c.id ? 'is-ativo' : ''}`} onClick={() => selecionarCidade(c)}>
              <span>
                <span className="cidade__nome">{c.municipio}</span>
                <span className="cidade__votos num">{c.votosJefferson.toLocaleString('pt-BR')} votos</span>
              </span>
              <span className="cidade__pos num">{posicao.get(c.id)}º</span>
            </button>
          ))}
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

        <div className="legenda">
          <button className="legenda__titulo" onClick={() => setLegendaAberta((v) => !v)} aria-expanded={legendaAberta}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} /> Legenda
            </span>
            {legendaAberta ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {legendaAberta && (
            <div className="legenda__itens">
              {CORES_LEGENDA.map((l) => (
                <div key={l.cor} className="legenda__item">
                  <span className="legenda__cor" style={{ backgroundColor: l.cor }} />
                  {l.texto}
                </div>
              ))}
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

            <div className="ficha__corpo">
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
            </div>

            <div className="ficha__acoes">
              <button className="btn acao acao--pdf" onClick={exportarFichaPDF}>
                <FileText size={16} /> PDF
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
