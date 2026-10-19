import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import jsPDF from 'jspdf';
import { getDobradas } from '../services/api';
import { PainelCRM } from './PainelCRM';

interface ZonaEleitoral {
  zona: string;
  quantidade: string;
}

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

export function MapaDobradas() {
  const anosDisponiveis = [2002, 2006, 2010, 2014, 2018, 2022, 2026];
  const [dados, setDados] = useState<MunicipioDado[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(2026);
  const [pesquisa, setPesquisa] = useState('');
  const [cidadeDestaque, setCidadeDestaque] = useState<MunicipioDado | null>(null);
  const [modalZonasAberto, setModalZonasAberto] = useState<boolean>(false);
  const [crmAberto, setCrmAberto] = useState<boolean>(false);
  const fichaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDobradas(anoSelecionado)
      .then((res: any) => setDados(res))
      .catch((err: any) => console.error(err));

    axios.get('https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-35-mun.json')
      .then((res: any) => setGeoJsonData(res.data))
      .catch((err: any) => console.error("Erro ao carregar GeoJSON", err));
  }, [anoSelecionado]);

  const normalizar = (texto: string) => {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  };

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
    pdf.setFont("helvetica", "bold");
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
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(corDestaque[0], corDestaque[1], corDestaque[2]);
    pdf.text(`${cidadeDestaque.votosJefferson.toLocaleString('pt-BR')} votos`, 18, y + 16);
    pdf.setTextColor(22, 163, 74);
    pdf.text(`${cidadeDestaque.eleitorado.totalEleitores.toLocaleString('pt-BR')}`, 81, y + 16);
    pdf.setTextColor(202, 138, 4);
    pdf.text(`${formatCurrency(cidadeDestaque.totalEmendas)}`, 144, y + 16);

    y += 32;
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    pdf.text(`Distribuição de Emendas por Área`, 14, y);

    y += 6;
    const emendasObj = Object.entries(cidadeDestaque.emendas);
    if (emendasObj.length === 0) {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Sem registo de emendas para este município.`, 14, y + 6);
      y += 10;
    } else {
      emendasObj.sort((a: any, b: any) => b[1] - a[1]).forEach(([cat, val]) => {
        const valorNum = val as number;
        const percent = (valorNum / (cidadeDestaque.totalEmendas || 1));
        
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
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
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
    pdf.text(`Evolução Histórica por Candidato`, 14, y);

    y += 6;
    if (cidadeDestaque.historicoCandidatos) {
      Object.entries(cidadeDestaque.historicoCandidatos).forEach(([candName, anosVotos]) => {
        if (y > 270) { pdf.addPage(); y = 20; }

        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(corDestaque[0], corDestaque[1], corDestaque[2]);
        pdf.text(`${candName}`, 14, y + 5);
        y += 7;

        pdf.setFont("helvetica", "normal");
        let xOffset = 14;
        anosDisponiveis.forEach(ano => {
          const v = anosVotos[ano];
          if (v !== undefined && v > 0) {
            if (xOffset > 170) { xOffset = 14; y += 7; }
            pdf.setFillColor(241, 245, 249);
            pdf.roundedRect(xOffset, y, 26, 10, 2, 2, 'F');
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`${ano}`, xOffset + 2, y + 4);
            pdf.setFont("helvetica", "bold");
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

  const mapStyle = (feature: any) => {
    const nomeFeature = normalizar(feature.properties.name);
    const dadosCidade = dados.find(d => normalizar(d.municipio) === nomeFeature);
    let fillColor = '#334155';
    
    if (dadosCidade && dadosCidade.votosJefferson > 0) {
      const v = dadosCidade.votosJefferson;
      if (v > 20000) fillColor = '#1e3a8a';
      else if (v > 5000) fillColor = '#2563eb';
      else if (v > 1000) fillColor = '#3b82f6';
      else fillColor = '#93c5fd';
    }

    const isSelecionada = cidadeDestaque && normalizar(cidadeDestaque.municipio) === nomeFeature;
    return { 
      fillColor, weight: isSelecionada ? 3 : 1, opacity: 1, 
      color: isSelecionada ? '#facc15' : '#1e293b', fillOpacity: 0.8 
    };
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', height: 'calc(100vh - 60px)', width: '100vw', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#0f172a', color: '#f8fafc', overflow: 'hidden' }}>
      
      {/* SIDEBAR RESPONSIVA */}
      <div style={{ width: 'clamp(280px, 30vw, 380px)', minWidth: '260px', backgroundColor: '#1e293b', display: 'flex', flexDirection: 'column', zIndex: 1000, borderRight: '1px solid #334155', height: '100%' }}>
        <div style={{ padding: '16px', backgroundColor: '#0f172a' }}>
          <h2 style={{ margin: 0, fontSize: '16px', color: '#facc15' }}>Mapa Eleitoral - SP</h2>
        </div>
        
        <div style={{ padding: '12px', borderBottom: '1px solid #334155' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Ciclo Eleitoral Base</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {anosDisponiveis.map(ano => (
              <button key={ano} onClick={() => setAnoSelecionado(ano)}
                style={{
                  padding: '5px 8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px',
                  backgroundColor: anoSelecionado === ano ? '#facc15' : '#334155',
                  color: anoSelecionado === ano ? '#0f172a' : '#cbd5e1'
                }}>
                {ano}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px' }}>
          <input type="text" placeholder="🔍 Pesquisar município..." 
            value={pesquisa} onChange={(e) => setPesquisa(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#334155', color: 'white', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ padding: '0 12px', overflowY: 'auto', flex: 1 }}>
          {dados.filter(c => c.municipio.toLowerCase().includes(pesquisa.toLowerCase()))
            .sort((a, b) => b.votosJefferson - a.votosJefferson)
            .map(c => (
            <div key={c.id} onClick={() => setCidadeDestaque(c)}
              style={{ 
                marginBottom: '6px', padding: '10px', borderRadius: '6px', cursor: 'pointer',
                backgroundColor: cidadeDestaque?.id === c.id ? '#3b82f6' : '#334155',
              }}>
              <strong style={{ fontSize: '13px', display: 'block' }}>{c.municipio}</strong>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Jefferson Campos: {c.votosJefferson.toLocaleString('pt-BR')} v.</span>
            </div>
          ))}
        </div>
      </div>

      {/* MAPA & FICHA MASTER RESPONSIVOS */}
      <div style={{ flex: 1, position: 'relative', minWidth: '300px', height: '100%' }}>
        
        {/* LEGENDA DE CORES DO MAPA */}
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', zIndex: 1000, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', border: '1px solid #334155', fontSize: '11px', maxWidth: '240px' }}>
          <strong style={{ display: 'block', marginBottom: '6px', color: '#facc15', textTransform: 'uppercase' }}>Legenda de Força</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}><span style={{ width: '12px', height: '12px', backgroundColor: '#1e3a8a', display: 'inline-block', borderRadius: '2px' }}></span> Reduto Forte (&gt; 20k)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}><span style={{ width: '12px', height: '12px', backgroundColor: '#2563eb', display: 'inline-block', borderRadius: '2px' }}></span> Consolidada (5k - 20k)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}><span style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', display: 'inline-block', borderRadius: '2px' }}></span> Média (1k - 5k)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', backgroundColor: '#334155', display: 'inline-block', borderRadius: '2px' }}></span> Sem Votos</div>
        </div>

        {cidadeDestaque && (
          <div style={{ position: 'absolute', top: '15px', right: '15px', width: 'clamp(300px, 35vw, 450px)', zIndex: 2000, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', borderRadius: '12px', overflow: 'hidden', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* CONTAINER DA FICHA */}
            <div ref={fichaRef} style={{ backgroundColor: '#0f172a', padding: '20px', color: '#f8fafc', overflowY: 'auto', flex: 1 }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>VISÃO Político Municipal</p>
              <h1 style={{ margin: '0 0 12px 0', fontSize: '24px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {cidadeDestaque.municipio} <span style={{ fontSize: '11px', backgroundColor: '#facc15', color: '#0f172a', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>SP</span>
              </h1>
              
              {/* VOTOS DO ANO SELECIONADO */}
              <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Votação em {anoSelecionado}</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '22px', color: '#60a5fa' }}>{cidadeDestaque.votosJefferson.toLocaleString('pt-BR')} votos</h2>
              </div>

              {/* ELEITORADO E PENETRAÇÃO (CLICÁVEL PARA ZONAS) */}
              <div 
                onClick={() => setModalZonasAberto(true)}
                style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '12px', cursor: 'pointer', border: '1px solid #334155' }}
                title="Clique para ver o detalhamento por zona eleitoral"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Eleitores (Zonas) 📋</span>
                    <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#4ade80' }}>{cidadeDestaque.eleitorado.totalEleitores.toLocaleString('pt-BR')}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Penetração</span>
                    <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#60a5fa' }}>{cidadeDestaque.eleitorado.penetracao}</h3>
                  </div>
                </div>
              </div>

              {/* EMENDAS */}
              <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#facc15' }}>Total de Emendas Destinadas</h3>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{formatCurrency(cidadeDestaque.totalEmendas)}</p>
                <p style={{ margin: '3px 0 10px 0', fontSize: '10px', color: '#94a3b8' }}>{cidadeDestaque.totalDestinacoes} destinações em {Object.keys(cidadeDestaque.emendas).length} áreas.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(cidadeDestaque.emendas).sort((a,b) => b[1] - a[1]).map(([cat, val]) => (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                        <span>{cat}</span>
                        <strong style={{ color: '#facc15' }}>{formatCurrency(val as number)}</strong>
                      </div>
                      <div style={{ width: '100%', height: '3px', backgroundColor: '#334155', borderRadius: '2px' }}>
                        <div style={{ width: `${((val as number) / (cidadeDestaque.totalEmendas || 1)) * 100}%`, height: '100%', backgroundColor: '#facc15' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* HISTÓRICO DE CANDIDATOS */}
              <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#60a5fa' }}>Histórico por Candidato e Ano</h3>
                
                {cidadeDestaque.historicoCandidatos && Object.entries(cidadeDestaque.historicoCandidatos).map(([candName, anosVotos]) => (
                  <div key={candName} style={{ marginBottom: '10px', borderBottom: '1px solid #334155', paddingBottom: '6px' }}>
                    <strong style={{ fontSize: '11px', color: '#facc15', display: 'block', marginBottom: '3px' }}>{candName}</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {anosDisponiveis.map(ano => {
                        const v = anosVotos[ano];
                        if (v === undefined || v === 0) return null;
                        return (
                          <div key={ano} style={{ backgroundColor: '#0f172a', padding: '2px 5px', borderRadius: '4px', fontSize: '10px' }}>
                            <span style={{ color: '#94a3b8' }}>{ano}:</span> <strong style={{ color: '#60a5fa' }}>{v.toLocaleString('pt-BR')}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTÕES DE AÇÃO RESPONSIVOS */}
            <div style={{ padding: '10px', backgroundColor: '#1e293b', borderTop: '1px solid #334155', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <button onClick={exportarFichaPDF} style={{ flex: 1, minWidth: '60px', padding: '8px 4px', border: 'none', backgroundColor: '#dc2626', color: 'white', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', borderRadius: '6px', textTransform: 'uppercase' }}>
                📄 PDF
              </button>
              <button onClick={() => setCrmAberto(true)} style={{ flex: 1, minWidth: '70px', padding: '8px 4px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', borderRadius: '6px', textTransform: 'uppercase' }}>
                👥 Lideranças
              </button>
              <button onClick={compartilharWhatsApp} style={{ flex: 1, minWidth: '55px', padding: '8px 4px', border: 'none', backgroundColor: '#25D366', color: 'white', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', borderRadius: '6px', textTransform: 'uppercase' }}>
                💬 Zap
              </button>
              <button onClick={() => setCidadeDestaque(null)} style={{ padding: '8px 10px', border: 'none', backgroundColor: '#334155', color: 'white', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold' }}>
                X
              </button>
            </div>

          </div>
        )}

        <MapContainer center={[-22.5, -48.5]} zoom={7} style={{ height: '100%', width: '100%', zIndex: 1, backgroundColor: '#0f172a' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          {geoJsonData && (
            <GeoJSON 
              key={`${anoSelecionado}-${dados.length}`} 
              data={geoJsonData} 
              style={mapStyle}
              onEachFeature={(feature, layer) => {
                const nomeFeature = normalizar(feature.properties.name);
                
                layer.on({ 
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
                    const dadosCidade = dados.find(d => normalizar(d.municipio) === nomeFeature);
                    if (dadosCidade) {
                      setCidadeDestaque(dadosCidade);
                    }
                  } 
                });

                layer.bindTooltip(`<strong>${feature.properties.name}</strong>`, { sticky: true });
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* MODAL DE ZONAS ELEITORAIS */}
      {modalZonasAberto && cidadeDestaque && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
          <div style={{ backgroundColor: '#1e293b', width: '100%', maxWidth: '480px', borderRadius: '12px', border: '1px solid #334155', padding: '25px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#facc15' }}>Zonas Eleitorais: {cidadeDestaque.municipio}</h2>
            <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#94a3b8' }}>Detalhamento do eleitorado por zona em 2026.</p>

            <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '15px', border: '1px solid #334155', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '8px' }}>Zona Eleitoral</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Quantidade de Eleitores</th>
                  </tr>
                </thead>
                <tbody>
                  {cidadeDestaque.eleitorado.zonas.length === 0 ? (
                    <tr><td colSpan={2} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>Sem registo de zonas para este município.</td></tr>
                  ) : (
                    cidadeDestaque.eleitorado.zonas.map((z, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '8px' }}>Zona {z.zona}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#4ade80', fontWeight: 'bold' }}>{z.quantidade}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button onClick={() => setModalZonasAberto(false)} style={{ width: '100%', padding: '10px', backgroundColor: '#3b82f6', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
              Fechar Janela
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CRM DE LIDERANÇAS */}
      {crmAberto && cidadeDestaque && (
        <PainelCRM 
          municipioId={cidadeDestaque.id} 
          municipioNome={cidadeDestaque.municipio} 
          onClose={() => setCrmAberto(false)} 
        />
      )}

    </div>
  );
}