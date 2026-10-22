import { votacao, nomeProprio } from '../../services/votacao';
import { useDados } from './useDados';
import { Esqueleto, FalhaCarga } from './Blocos';
import { fmt, fmtPct } from './formato';

/* Tela 4: voto de Jefferson em cada zona eleitoral da cidade, com o mais votado de cada zona */
export function ZonasCidade({ ibge, nome }: { ibge: string; nome: string }) {
  const z = useDados(`zonas-${ibge}`, () => votacao.zonas(ibge, 'federal'));

  if (z.carregando) return <Esqueleto linhas={4} altura={48} />;
  if (z.erro || !z.dados) return <FalhaCarga aoTentar={z.tentarDeNovo} />;

  const zonas = [...z.dados.zonas].sort((a, b) => (b.candidato?.pct ?? 0) - (a.candidato?.pct ?? 0));
  const melhor = zonas[0];
  const pior = zonas[zonas.length - 1];
  const maxPct = Math.max(0.1, ...zonas.map((x) => x.candidato?.pct ?? 0));

  return (
    <div className="vt">
      <p className="vt-nota">
        {zonas.length === 1
          ? `${nome} tem uma zona eleitoral, a ${melhor.zona}.`
          : `${nome} tem ${zonas.length} zonas. Jefferson foi melhor na zona ${melhor.zona} (${fmtPct(melhor.candidato?.pct ?? 0)}) e pior na zona ${pior.zona} (${fmtPct(pior.candidato?.pct ?? 0)}).`}
      </p>
      <div className="vt-zonas">
        {zonas.map((zona) => (
          <div key={zona.zona} className="vt-zona">
            <div className="vt-zona__cab">
              <strong>Zona {zona.zona}</strong>
              <span className="num">{fmt(zona.totalValidos)} válidos</span>
            </div>
            <div className="vt-zona__jc">
              <span>Jefferson</span>
              <span className="num">
                {fmt(zona.candidato?.votos ?? 0)} votos, {fmtPct(zona.candidato?.pct ?? 0)}
                {zona.candidato?.posicao ? `, ${zona.candidato.posicao}º` : ''}
              </span>
            </div>
            <div className="barra">
              <div style={{ width: `${Math.max(1.5, ((zona.candidato?.pct ?? 0) / maxPct) * 100)}%` }} />
            </div>
            {zona.lider && (
              <p className="vt-zona__lider">
                Mais votado: {nomeProprio(zona.lider.nomeUrna)} ({zona.lider.partido}), {fmtPct(zona.lider.pct)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
