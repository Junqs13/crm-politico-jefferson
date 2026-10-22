import { useState } from 'react';
import { votacao, nomeProprio, eleito, textoSituacao, NUMERO_JEFFERSON, type Cargo, type LinhaRanking } from '../../services/votacao';
import { useDados } from './useDados';
import { Segmentado, Esqueleto, FalhaCarga } from './Blocos';
import { fmt, fmtPct } from './formato';

const ehJefferson = (l: { numero: number; cargo: Cargo }) => l.cargo === 'federal' && l.numero === NUMERO_JEFFERSON;

function Linha({ l, max }: { l: LinhaRanking; max: number }) {
  return (
    <li className={`vt-linha ${ehJefferson(l) ? 'is-jc' : ''}`}>
      <span className="vt-pos num">{l.posicao ? `${l.posicao}º` : '-'}</span>
      <div className="vt-info">
        <div className="vt-topo">
          <strong>{nomeProprio(l.nomeUrna)}</strong>
          <span className="vt-votos num">{fmt(l.votos)}</span>
        </div>
        <div className="vt-sub">
          <span>
            {l.partido}
            {eleito(l.situacao) ? <em className="vt-eleito">{textoSituacao(l.situacao)}</em> : <span className="vt-suplente"> · {textoSituacao(l.situacao)}</span>}
          </span>
          <span className="num">{fmtPct(l.pct)}</span>
        </div>
        <div className="barra">
          <div style={{ width: `${Math.max(1.5, (l.votos / (max || 1)) * 100)}%` }} />
        </div>
      </div>
    </li>
  );
}

/* Tela 1: os mais votados da cidade em 2026, com a posição de Jefferson.
   Tela 5 (na cidade): como ele está entre os federais do PL. */
export function RankingCidade({ ibge, nome }: { ibge: string; nome: string }) {
  const [cargo, setCargo] = useState<Cargo>('federal');
  const [todos, setTodos] = useState(false);
  const limite = todos ? 10 : 5;

  const ranking = useDados(`${ibge}-${cargo}`, () => votacao.ranking(ibge, cargo, 10));
  const partido = useDados(`${ibge}-pl`, () => votacao.ranking(ibge, 'federal', 40, { partido: 'PL' }));

  const lista = ranking.dados?.ranking.slice(0, limite) ?? [];
  const max = ranking.dados?.ranking[0]?.votos ?? 1;
  const destaque = ranking.dados?.destaque;
  const destaqueFora = destaque && !lista.some((l) => l.id === destaque.id);

  const pl = partido.dados?.ranking ?? [];
  const posNoPL = pl.findIndex((l) => ehJefferson(l));

  return (
    <div className="vt">
      <Segmentado
        rotulo="Cargo"
        valor={cargo}
        aoMudar={setCargo}
        opcoes={[
          ['federal', 'Deputado federal'],
          ['estadual', 'Deputado estadual'],
        ]}
      />

      {ranking.carregando ? (
        <Esqueleto linhas={5} />
      ) : ranking.erro || !ranking.dados ? (
        <FalhaCarga aoTentar={ranking.tentarDeNovo} />
      ) : (
        <>
          <p className="vt-nota">
            {fmt(ranking.dados.totalValidos)} votos válidos para {cargo === 'federal' ? 'federal' : 'estadual'} em {nome}, divididos entre {fmt(ranking.dados.candidatosComVoto)} candidatos.
          </p>
          <ol className="vt-lista">
            {lista.map((l) => (
              <Linha key={l.id} l={l} max={max} />
            ))}
            {destaqueFora && destaque && (
              <>
                <li className="vt-reticencias" aria-hidden="true">
                  ⋯
                </li>
                <Linha l={destaque} max={max} />
              </>
            )}
          </ol>
          {ranking.dados.ranking.length > 5 && (
            <button className="btn vt-mais" onClick={() => setTodos((v) => !v)}>
              {todos ? 'Mostrar só os 5 primeiros' : 'Ver os 10 primeiros'}
            </button>
          )}
        </>
      )}

      {cargo === 'federal' && (
        <section className="vt-bloco">
          <h4>Federais do PL em {nome}</h4>
          {partido.carregando ? (
            <Esqueleto linhas={3} altura={34} />
          ) : partido.erro ? (
            <FalhaCarga aoTentar={partido.tentarDeNovo} />
          ) : pl.length === 0 ? (
            <p className="vt-nota">Nenhum federal do PL teve voto aqui.</p>
          ) : (
            <>
              <p className="vt-nota">
                {posNoPL >= 0
                  ? posNoPL === 0
                    ? `Jefferson é o federal do PL mais votado em ${nome}.`
                    : `Jefferson é o ${posNoPL + 1}º do PL em ${nome}. ${posNoPL === 1 ? 'Um colega de partido teve' : `${posNoPL} colegas de partido tiveram`} mais votos.`
                  : `Jefferson não teve voto em ${nome}.`}
              </p>
              <ol className="vt-lista vt-lista--compacta">
                {pl.slice(0, Math.max(5, posNoPL + 1)).map((l) => (
                  <Linha key={l.id} l={l} max={pl[0].votos} />
                ))}
              </ol>
            </>
          )}
        </section>
      )}
    </div>
  );
}
