import { useMemo, useState } from 'react';
import { votacao, nomeProprio, textoSituacao } from '../../services/votacao';
import { useDados } from './useDados';
import { Segmentado, Esqueleto, FalhaCarga } from './Blocos';
import { fmt, fmtPct } from './formato';

type FiltroCargo = 'todos' | 'federal' | 'estadual';
type Ordem = 'votos' | 'forca';

/* Tela 6 no estado: não eleitos com votação forte, candidatos naturais a aliados em 2030 */
export function AliadosEstado() {
  const a = useDados('aliados-estado', () => votacao.aliadosEstado(150, 15000));
  const [cargo, setCargo] = useState<FiltroCargo>('todos');
  const [ordem, setOrdem] = useState<Ordem>('votos');
  const [partido, setPartido] = useState('');
  const [quantos, setQuantos] = useState(10);

  const lista = useMemo(() => {
    const termo = partido.trim().toUpperCase();
    return (a.dados?.candidatos ?? [])
      .filter((c) => (cargo === 'todos' || c.cargo === cargo) && (!termo || c.partido.toUpperCase().includes(termo)))
      .sort((x, y) => (ordem === 'votos' ? y.votos - x.votos : y.cidadesCom5pct - x.cidadesCom5pct || y.votos - x.votos));
  }, [a.dados, cargo, ordem, partido]);

  if (a.carregando) return <Esqueleto linhas={6} altura={56} />;
  if (a.erro || !a.dados) return <FalhaCarga aoTentar={a.tentarDeNovo} />;

  return (
    <div className="vt">
      <p className="vt-nota">
        Candidatos a deputado com {fmt(a.dados.minimoVotos)} votos ou mais que não se elegeram em 2026. "Força local" conta as cidades onde tiveram 5% ou mais dos votos.
      </p>
      <div className="vt-filtros">
        <Segmentado
          rotulo="Cargo"
          valor={cargo}
          aoMudar={(v) => {
            setCargo(v);
            setQuantos(10);
          }}
          opcoes={[
            ['todos', 'Todos'],
            ['federal', 'Federal'],
            ['estadual', 'Estadual'],
          ]}
        />
        <Segmentado
          rotulo="Ordenar por"
          valor={ordem}
          aoMudar={setOrdem}
          opcoes={[
            ['votos', 'Mais votos'],
            ['forca', 'Força local'],
          ]}
        />
        <input className="campo vt-filtro-partido" placeholder="Filtrar partido (ex: PL)" aria-label="Filtrar por partido" value={partido} onChange={(e) => setPartido(e.target.value)} />
      </div>

      {lista.length === 0 ? (
        <p className="vt-nota">Nenhum candidato com esse filtro.</p>
      ) : (
        <ul className="vt-aliados">
          {lista.slice(0, quantos).map((c) => (
            <li key={c.id} className="vt-aliado-estado">
              <div>
                <strong>{nomeProprio(c.nomeUrna)}</strong>
                <span>
                  {c.cargo === 'federal' ? 'Federal' : 'Estadual'} · {c.partido} · {textoSituacao(c.situacao)} · 5% ou mais em {c.cidadesCom5pct} {c.cidadesCom5pct === 1 ? 'cidade' : 'cidades'}
                </span>
                <span className="vt-forte">
                  Mais forte em: {c.maisForteEm.map((m) => `${m.nome} (${fmt(m.votos)}, ${fmtPct(m.pct)})`).join('; ')}
                </span>
              </div>
              <span className="num vt-aliados__votos">{fmt(c.votos)}</span>
            </li>
          ))}
        </ul>
      )}
      {lista.length > quantos && (
        <button className="btn vt-mais" onClick={() => setQuantos((q) => q + 15)}>
          Ver mais ({lista.length - quantos} restantes)
        </button>
      )}
    </div>
  );
}
