import { useEffect, useState } from 'react';
import { getDobradas } from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import { FileText, Map as IconeMapa, Search } from 'lucide-react';
import { ModalZonas, type ZonaEleitoral } from './ModalZonas';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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
    getDobradas(2026)
      .then((res: any) => {
        if (Array.isArray(res)) setDados(res);
        setCidadeAtiva(null);
      })
      .catch((err: any) => console.error('Erro ao carregar metas:', err));
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

  const semAcento = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const cidadesFiltradas = dados.filter((c: MunicipioBI) => semAcento(c.municipio).includes(semAcento(termoBusca)));

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

    const alvosPrioritarios = [...dados]
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

  const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `${Number(ctx.parsed.y).toLocaleString('pt-BR')} votos`,
        },
      },
    },
    scales: {
      x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(148,163,184,0.12)' } },
      y: {
        ticks: { color: '#94a3b8', font: { size: 11 }, maxTicksLimit: 6, callback: (v: any) => compacto.format(Number(v)) },
        grid: { color: 'rgba(148,163,184,0.12)' },
      },
    },
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const valorKpi = (cidade: number, geral: number) => (cidadeAtiva ? cidade : geral).toLocaleString('pt-BR');

  return (
    <div className="bi">
      {/* CABEÇALHO E PESQUISA */}
      <div className="bi__cab">
        <div className="bi__titulo">
          <p className="rotulo-peq">Growth hacking e estratégia eleitoral</p>
          <h1>{cidadeAtiva ? `Planejamento 2028: ${cidadeAtiva.municipio}` : 'Painel de Metas e Projeções 2028 (São Paulo)'}</h1>
        </div>

        <div className="bi__ferramentas">
          <div className="bi__busca">
            <label className="busca">
              <Search size={16} />
              <input
                type="search"
                enterKeyHint="search"
                placeholder="Pesquisar município"
                aria-label="Pesquisar município"
                value={termoBusca}
                onChange={(e) => {
                  setTermoBusca(e.target.value);
                  if (cidadeAtiva) setCidadeAtiva(null);
                }}
              />
            </label>
            {termoBusca && cidadesFiltradas.length > 0 && !cidadeAtiva && (
              <div className="sugestoes">
                {cidadesFiltradas.slice(0, 8).map((c: MunicipioBI) => (
                  <button key={c.id} onClick={() => selecionarCidade(c.municipio)}>
                    {c.municipio}
                  </button>
                ))}
              </div>
            )}
          </div>

          {cidadeAtiva && (
            <button className="btn" onClick={limparSelecao}>
              Ver geral SP
            </button>
          )}

          <button className="btn btn--verde" onClick={exportarRelatorioGeralPDF} title="Gerar relatório geral de alvos 2028">
            <FileText size={16} /> Relatório PDF
          </button>

          <button className="btn btn--contorno bi__voltar" onClick={onVoltarMapa}>
            <IconeMapa size={16} /> Voltar ao mapa
          </button>
        </div>
      </div>

      {/* INDICADORES */}
      <div className="kpis">
        <div className="kpi">
          <p className="rotulo-peq">{cidadeAtiva ? 'Votos obtidos (2026)' : 'Votos totais base (2026)'}</p>
          <p className="kpi__valor num" style={{ color: 'var(--blue-l)' }}>
            {valorKpi(cidadeAtiva?.votosJefferson ?? 0, totalGeralVotos2026)}
          </p>
        </div>

        <div className="kpi kpi--meta">
          <p className="rotulo-peq">{cidadeAtiva ? '🎯 Meta de votos 2028' : '🎯 Meta total projetada 2028'}</p>
          <p className="kpi__valor num" style={{ color: 'var(--accent)' }}>
            {valorKpi(cidadeAtiva?.projecao2028.metaVotos ?? 0, totalGeralMetas2028)}
          </p>
        </div>

        {cidadeAtiva ? (
          <button className="kpi" onClick={() => setModalZonasAberto(true)}>
            <p className="rotulo-peq">Eleitores 📋 (ver zonas)</p>
            <p className="kpi__valor num" style={{ color: 'var(--green)' }}>
              {cidadeAtiva.eleitorado.totalEleitores.toLocaleString('pt-BR')}
            </p>
          </button>
        ) : (
          <div className="kpi">
            <p className="rotulo-peq">Total de eleitores (estado)</p>
            <p className="kpi__valor num" style={{ color: 'var(--green)' }}>
              {totalGeralEleitoresSP.toLocaleString('pt-BR')}
            </p>
          </div>
        )}

        <div className="kpi">
          <p className="rotulo-peq">Prioridade estratégica</p>
          <p className="kpi__valor kpi__valor--texto">
            {cidadeAtiva ? cidadeAtiva.projecao2028.prioridadeCampanha : 'Expansão Estadual'}
          </p>
        </div>
      </div>

      {/* GRÁFICO HISTÓRICO E ÁREAS DE EMENDAS */}
      <div className="bi__grade">
        <div className="painel">
          <h3>{cidadeAtiva ? `Evolução em ${cidadeAtiva.municipio}` : 'Evolução global (Estado de São Paulo)'}</h3>
          <div className="grafico">
            <Line data={chartDataLine} options={chartOptions} />
          </div>
        </div>

        <div className="painel">
          <h3 style={{ color: 'var(--accent)' }}>{cidadeAtiva ? 'Áreas atendidas pelas emendas' : 'Resumo das áreas de emendas (estado)'}</h3>
          <div className="emendas-lista">
            {cidadeAtiva ? (
              Object.keys(cidadeAtiva.emendas).length === 0 ? (
                <p className="texto-vazio">Sem registro de emendas para este município.</p>
              ) : (
                Object.entries(cidadeAtiva.emendas)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, val]) => (
                    <div key={cat} className="emenda-item">
                      <div className="barra-cat__topo">
                        <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{cat}</span>
                        <strong className="num">{formatCurrency(val as number)}</strong>
                      </div>
                      <div className="barra">
                        <div style={{ width: `${((val as number) / (cidadeAtiva.totalEmendas || 1)) * 100}%` }} />
                      </div>
                    </div>
                  ))
              )
            ) : (
              <p className="texto-vazio">Pesquise e selecione um município acima para ver as projeções e as emendas da cidade.</p>
            )}
          </div>
        </div>
      </div>

      {/* TOP 5 */}
      <div className="painel">
        <h3 style={{ color: 'var(--blue-l)' }}>
          {cidadeAtiva ? `Top 5 deputados mais votados em ${cidadeAtiva.municipio}` : 'Panorama geral dos principais redutos (estado)'}
        </h3>
        <div className="top5">
          <div className="top5__item top5__item--jc">
            <span>1º lugar</span>
            <p>Jefferson Campos</p>
            <span className="num" style={{ color: 'var(--blue-l)' }}>
              {cidadeAtiva ? cidadeAtiva.votosJefferson.toLocaleString('pt-BR') + ' votos' : totalGeralVotos2026.toLocaleString('pt-BR') + ' votos (SP)'}
            </span>
          </div>
          {['A', 'B', 'C', 'D'].map((letra, i) => (
            <div key={letra} className="top5__item">
              <span>{i + 2}º lugar</span>
              <p>Concorrente {letra}</p>
              <span>Referência regional</span>
            </div>
          ))}
        </div>
      </div>

      {modalZonasAberto && cidadeAtiva && (
        <ModalZonas municipio={cidadeAtiva.municipio} zonas={cidadeAtiva.eleitorado.zonas} onClose={() => setModalZonasAberto(false)} />
      )}
    </div>
  );
}
