import { useState } from 'react';
import { votacao, nomeProprio, eleito, textoSituacao } from '../../services/votacao';
import { useDados } from './useDados';
import { Esqueleto, FalhaCarga } from './Blocos';
import { fmt } from './formato';

/* Tela 5: colegas de partido que disputam o mesmo voto de Jefferson Campos */
export function ConcorrenciaPartido() {
  const c = useDados('concorrencia', () => votacao.concorrencia(3));
  const [todos, setTodos] = useState(false);

  if (c.carregando) return <Esqueleto linhas={6} altura={56} />;
  if (c.erro || !c.dados) return <FalhaCarga aoTentar={c.tentarDeNovo} />;

  const d = c.dados;
  const lista = todos ? d.concorrentes : d.concorrentes.slice(0, 8);
  const naFrenteDeTodos = d.concorrentes.filter((x) => x.cidadesNaFrente > d.cidadesComVotoAlvo / 2).length;

  return (
    <div className="vt">
      <p className="vt-nota">
        O {d.partido} teve {d.candidatosDoPartido} candidatos a federal. Jefferson teve voto em {fmt(d.cidadesComVotoAlvo)} cidades e foi o mais votado do partido em{' '}
        {d.alvoLideraPartido === 0 ? 'nenhuma' : `${fmt(d.alvoLideraPartido)}`}. {naFrenteDeTodos} colegas ficaram à frente dele em mais da metade dessas cidades.
      </p>
      <ol className="vt-lista">
        {lista.map((x) => {
          const parte = x.cidadesNaFrente / Math.max(1, x.cidadesNaFrente + x.cidadesAtras);
          return (
            <li key={x.id} className="vt-linha vt-conc">
              <div className="vt-info">
                <div className="vt-topo">
                  <strong>{nomeProprio(x.nomeUrna)}</strong>
                  <span className="vt-votos num">{fmt(x.votos)}</span>
                </div>
                <div className="vt-sub">
                  <span>{eleito(x.situacao) ? <em className="vt-eleito" style={{ marginLeft: 0 }}>{textoSituacao(x.situacao)}</em> : textoSituacao(x.situacao)}</span>
                  <span className="num">
                    à frente em {fmt(x.cidadesNaFrente)} cidades, atrás em {fmt(x.cidadesAtras)}
                  </span>
                </div>
                <div className="barra barra--perda" title={`${Math.round(parte * 100)}% das cidades em que os dois tiveram voto`}>
                  <div style={{ width: `${Math.max(1.5, parte * 100)}%` }} />
                </div>
                {x.ondeMaisTira.length > 0 && (
                  <p className="vt-conc__onde">
                    Maiores vantagens sobre Jefferson:{' '}
                    {x.ondeMaisTira.map((o, i) => (
                      <span key={o.ibge}>
                        {i > 0 ? ', ' : ''}
                        {o.nome} (+{fmt(o.diferenca)})
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {d.concorrentes.length > 8 && (
        <button className="btn vt-mais" onClick={() => setTodos((v) => !v)}>
          {todos ? 'Mostrar só os 8 mais votados' : `Ver os ${d.concorrentes.length} colegas do partido`}
        </button>
      )}
    </div>
  );
}
