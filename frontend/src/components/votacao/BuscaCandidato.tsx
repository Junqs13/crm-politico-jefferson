import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { votacao, nomeProprio, textoSituacao, type CandidatoResumo } from '../../services/votacao';
import { fmt } from './formato';

const CARGO_TEXTO: Record<string, string> = { federal: 'Federal', estadual: 'Estadual', governador: 'Governador', senador: 'Senador' };

/* Busca qualquer candidato de 2026 (nome, partido ou número) para pintar o mapa com os votos dele */
export function BuscaCandidato({ aoEscolher }: { aoEscolher: (c: CandidatoResumo) => void }) {
  const [texto, setTexto] = useState('');
  const [sugestoes, setSugestoes] = useState<CandidatoResumo[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const termo = texto.trim();
    if (termo.length < 2) return;
    let ativo = true;
    const t = window.setTimeout(() => {
      setBuscando(true);
      votacao
        .candidatos(termo, undefined, 8)
        .then((r) => ativo && setSugestoes(r))
        .catch(() => ativo && setSugestoes([]))
        .finally(() => ativo && setBuscando(false));
    }, 250);
    return () => {
      ativo = false;
      window.clearTimeout(t);
    };
  }, [texto]);

  const visiveis = texto.trim().length >= 2 ? sugestoes : [];

  return (
    <div className="busca-cand">
      <label className="busca">
        <Search size={16} />
        <input
          type="search"
          enterKeyHint="search"
          placeholder="Nome, partido ou número"
          aria-label="Buscar candidato de 2026"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </label>
      {texto.trim().length >= 2 && (
        <ul className="busca-cand__lista" role="listbox">
          {buscando && visiveis.length === 0 && <li className="busca-cand__vazio">Buscando...</li>}
          {!buscando && visiveis.length === 0 && <li className="busca-cand__vazio">Nenhum candidato encontrado.</li>}
          {visiveis.map((c) => (
            <li key={c.id}>
              <button
                role="option"
                aria-selected={false}
                onClick={() => {
                  aoEscolher(c);
                  setTexto('');
                  setSugestoes([]);
                }}
              >
                <strong>{nomeProprio(c.nomeUrna)}</strong>
                <span>
                  {CARGO_TEXTO[c.cargo]} · {c.partido} · {c.numero} · {fmt(c.votos)} votos · {textoSituacao(c.situacao)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
