import { useEffect, useState } from 'react';
import { getDobradas } from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ZonaEleitoral {
  zona: string;
  quantidade: string;
}

interface MunicipioBI {
  id: string;
  municipio: string;
  votosJefferson: number;
  totalEmendas: number;
  totalDestinacoes: number;
  emendas: Record<string, number>;
  historicoJef: Record<number, number>;
  eleitorado: {
    totalEleitores: number;
    penetracao: string;
    zonas: ZonaEleitoral[];
  };
  projecao2028: {
    metaVotos: number;
    potencialCrescimento: number;
    prioridadeCampanha: string;
  };
}

export function PainelBI({ onVoltarMapa }: { onVoltarMapa: () => void }) {
  const [dados, setDados] = useState<MunicipioBI[]>([]);
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [cidadeAtiva, setCidadeAtiva] = useState<MunicipioBI | null>(null);
  const [modalZonasAberto, setModalZonasAberto] = useState<boolean>(false);

  useEffect(() => {
    getDobradas(2026).then((res: any) => {
      setDados(res);
      setCidadeAtiva(null);
    });
  }, []);

  const selecionarCidade = (nome: string) => {
    setTermoBusca(nome);
    const encontrada = dados.find((c: MunicipioBI) => c.municipio.toLowerCase() === nome.toLowerCase());
    if (encontrada) setCidadeAtiva(encontrada);
  };

  const limparSelecao = () => {
    setTermoBusca('');
    setCidadeAtiva(null);
  };

  const cidadesFiltradas = dados.filter((c: MunicipioBI) => c.municipio.toLowerCase().includes(termoBusca.toLowerCase()));

  const totalGeralVotos2026 = dados.reduce((acc, curr) => acc + curr.votosJefferson, 0);
  const totalGeralMetas2028 = dados.reduce((acc, curr) => acc + curr.projecao2028.metaVotos, 0);
 
  const totalGeralEleitoresSP = dados.reduce((acc, curr) => acc + curr.eleitorado.totalEleitores, 0);

  // Função para exportar relatório consolidados de campo (Item D)
  const exportarRelatorioGeralPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("RELATÓRIO ESTRATÉGICO DE CAMPO - METAS 2028", 14, 20);
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text("Gabinete Deputado Federal Jefferson Campos - Plano de Ação Regional", 14, 26);

    let y = 35;
    pdf.setTextColor(0);
    pdf.setFontSize(11);

    const alvosPrioritarios = dados
      .sort((a, b) => b.projecao2028.metaVotos - a.projecao2028.metaVotos)
      .slice(0, 15);

    alvosPrioritarios.forEach((c, idx) => {
      if (y > 270) { pdf.addPage(); y = 20; }
      pdf.setFont("helvetica", "bold");
      pdf.text(`${idx + 1}. ${c.municipio}`, 14, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Votos 2026: ${c.votosJefferson.toLocaleString('pt-BR')} | Meta 2028: ${c.projecao2028.metaVotos.toLocaleString('pt-BR')} | Eleitores: ${c.eleitorado.totalEleitores.toLocaleString('pt-BR')}`, 14, y + 5);
      pdf.setTextColor(150, 100, 0);
      pdf.text(`Prioridade: ${c.projecao2028.prioridadeCampanha}`, 14, y + 10);
      pdf.setTextColor(0);
      y += 16;
    });

    pdf.save("Relatorio_Estrategico_Campanha_2028.pdf");
  };

  const anos = [2002, 2006, 2010, 2014, 2018, 2022, 2026];
  const votosJefHist = cidadeAtiva 
    ? anos.map(ano => cidadeAtiva?.historicoJef?.[ano] || 0)
    : anos.map(ano => dados.reduce((sum, c) => sum + (c.historicoJef?.[ano] || 0), 0));

  const chartDataLine = {
    labels: anos.map(String),
    datasets: [{
      label: cidadeAtiva ? `Votos em ${cidadeAtiva.municipio}` : 'Votos Totais (Estado de São Paulo)',
      data: votosJefHist,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      fill: true,
      tension: 0.3,
    }],
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '25px', overflowY: 'auto' }}>
      
      {/* HEADER E PESQUISA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '25px' }}>
        <div>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Growth Hacking & Estratégia Eleitoral</span>
          <h1 style={{ margin: '4px 0 0 0', fontSize: '24px', color: '#ffffff' }}>
            {cidadeAtiva ? `Planejamento 2028: ${cidadeAtiva.municipio}` : 'Painel de Metas & Projeções 2028 (São Paulo)'}
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <input 
              type="text" 
              placeholder="🔍 Pesquisar município..." 
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: 'white', outline: 'none', fontSize: '14px' }}
            />
            {termoBusca && cidadesFiltradas.length > 0 && !cidadeAtiva && (
              <div style={{ position: 'absolute', top: '50px', left: 0, right: 0, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', zIndex: 9999 }}>
                {cidadesFiltradas.slice(0, 6).map((c: MunicipioBI) => (
                  <div key={c.id} onClick={() => selecionarCidade(c.municipio)} style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #334155', fontSize: '13px' }}>
                    <strong>{c.municipio}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
          {cidadeAtiva && (
            <button onClick={limparSelecao} style={{ padding: '12px 15px', backgroundColor: '#334155', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
              Ver Geral SP
            </button>
          )}
          
          <button onClick={exportarRelatorioGeralPDF} style={{ padding: '12px 16px', backgroundColor: '#16a34a', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }} title="Gerar Relatório Geral de Alvos 2028">
            📑 Relatório Geral PDF
          </button>
        </div>

        <button onClick={onVoltarMapa} style={{ padding: '10px 20px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#facc15', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
          🗺️ Voltar ao Mapa Geográfico
        </button>
      </div>

      {/* QUADROS INFORMATIVOS / METAS 2028 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
            {cidadeAtiva ? 'Votos Obtidos (2026)' : 'Votos Totais Base (2026)'}
          </p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '26px', color: '#60a5fa' }}>
            {cidadeAtiva ? cidadeAtiva.votosJefferson.toLocaleString('pt-BR') : totalGeralVotos2026.toLocaleString('pt-BR')}
          </h2>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', borderLeft: '4px solid #facc15' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#facc15', textTransform: 'uppercase' }}>
            {cidadeAtiva ? '🎯 Meta de Votos 2028' : '🎯 Meta Total Projetada 2028'}
          </p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '26px', color: '#facc15' }}>
            {cidadeAtiva ? cidadeAtiva.projecao2028.metaVotos.toLocaleString('pt-BR') : totalGeralMetas2028.toLocaleString('pt-BR')}
          </h2>
        </div>
        
        <div 
          onClick={() => cidadeAtiva && setModalZonasAberto(true)}
          style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', cursor: cidadeAtiva ? 'pointer' : 'default' }}
        >
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
            {cidadeAtiva ? 'Eleitores 📋 (Ver Zonas)' : 'Total de Eleitores (Estado)'}
          </p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '26px', color: '#4ade80' }}>
            {cidadeAtiva ? cidadeAtiva.eleitorado.totalEleitores.toLocaleString('pt-BR') : totalGeralEleitoresSP.toLocaleString('pt-BR')}
          </h2>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Prioridade Estratégica</p>
          <h2 style={{ margin: '8px 0 0 0', fontSize: '18px', color: '#cbd5e1', paddingTop: '4px' }}>
            {cidadeAtiva ? cidadeAtiva.projecao2028.prioridadeCampanha : 'Expansão Estadual'}
          </h2>
        </div>
      </div>

      {/* GRÁFICO HISTÓRICO E ÁREAS DE EMENDAS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
        
        <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#f8fafc' }}>
            {cidadeAtiva ? `Evolução e Projeção em ${cidadeAtiva.municipio}` : 'Evolução Global (Estado de São Paulo)'}
          </h3>
          <div style={{ flex: 1, minHeight: '240px' }}>
            <Line data={chartDataLine} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#facc15' }}>
            {cidadeAtiva ? 'Áreas Atendidas pelas Emendas' : 'Resumo das Áreas de Emendas (Estado)'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
            {cidadeAtiva ? (
              Object.keys(cidadeAtiva.emendas).length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Sem registo de emendas para este município.</p>
              ) : (
                Object.entries(cidadeAtiva.emendas).map(([cat, val]) => (
                  <div key={cat} style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                      <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{cat}</span>
                      <strong style={{ color: '#facc15' }}>{formatCurrency(val as number)}</strong>
                    </div>
                    <div style={{ width: '100%', height: '4px', backgroundColor: '#334155', borderRadius: '2px' }}>
                      <div style={{ width: `${((val as number) / (cidadeAtiva.totalEmendas || 1)) * 100}%`, height: '100%', backgroundColor: '#facc15' }}></div>
                    </div>
                  </div>
                ))
              )
            ) : (
              <p style={{ color: '#94a3b8', fontSize: '13px' }}>Pesquise e selecione um município acima para visualizar as projeções detalhadas e emendas da cidade.</p>
            )}
          </div>
        </div>

      </div>

      {/* TOP 5 DA ÚLTIMA ELEIÇÃO */}
      <div style={{ backgroundColor: '#1e293b', padding: '25px', borderRadius: '12px', border: '1px solid #334155' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#60a5fa' }}>
          {cidadeAtiva ? `Top 5 Deputados Mais Votados em ${cidadeAtiva.municipio}` : 'Panorama Geral dos Principais Redutos (Estado)'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }}>
          <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>1º Lugar</span>
            <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '14px' }}>Jefferson Campos</p>
            <span style={{ fontSize: '12px', color: '#60a5fa' }}>{cidadeAtiva ? cidadeAtiva.votosJefferson.toLocaleString('pt-BR') + ' votos' : totalGeralVotos2026.toLocaleString('pt-BR') + ' votos (SP)'}</span>
          </div>
          <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #475569' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>2º Lugar</span>
            <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '14px' }}>Concorrente A</p>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Referência regional</span>
          </div>
          <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #475569' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>3º Lugar</span>
            <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '14px' }}>Concorrente B</p>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Referência regional</span>
          </div>
          <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #475569' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>4º Lugar</span>
            <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '14px' }}>Concorrente C</p>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Referência regional</span>
          </div>
          <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #475569' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>5º Lugar</span>
            <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '14px' }}>Concorrente D</p>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Referência regional</span>
          </div>
        </div>
      </div>

      {/* MODAL DE ZONAS ELEITORAIS */}
      {modalZonasAberto && cidadeAtiva && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#1e293b', width: '500px', borderRadius: '12px', border: '1px solid #334155', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', color: '#facc15' }}>Zonas Eleitorais: {cidadeAtiva.municipio}</h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8' }}>Detalhamento do eleitorado por zona em 2026.</p>

            <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '20px', border: '1px solid #334155', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '10px' }}>Zona Eleitoral</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Quantidade de Eleitores</th>
                  </tr>
                </thead>
                <tbody>
                  {cidadeAtiva.eleitorado.zonas.length === 0 ? (
                    <tr><td colSpan={2} style={{ padding: '15px', textAlign: 'center', color: '#94a3b8' }}>Sem registo de zonas para este município.</td></tr>
                  ) : (
                    cidadeAtiva.eleitorado.zonas.map((z: ZonaEleitoral, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '10px' }}>Zona {z.zona}</td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#4ade80', fontWeight: 'bold' }}>{z.quantidade}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button onClick={() => setModalZonasAberto(false)} style={{ width: '100%', padding: '12px', backgroundColor: '#3b82f6', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
              Fechar Janela
            </button>
          </div>
        </div>
      )}

    </div>
  );
}