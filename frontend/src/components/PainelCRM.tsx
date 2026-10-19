import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';

interface Leadership {
  id: string;
  name: string;
  role: string;
  party: string;
  phone: string;
  alignment: string;
  notes: string;
}

const corAlinhamento = (a: string) => (a === 'ALTO' ? '#4ade80' : a === 'MEDIO' ? '#facc15' : '#f87171');

export function PainelCRM({ municipioId, municipioNome, onClose }: { municipioId: string; municipioNome: string; onClose: () => void }) {
  const [liderancas, setLiderancas] = useState<Leadership[]>([]);
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('Vereador');
  const [partido, setPartido] = useState('');
  const [telefone, setTelefone] = useState('');
  const [alinhamento, setAlinhamento] = useState('ALTO');
  const [notas, setNotas] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregarLiderancas = useCallback(() => {
    api.get<Leadership[]>(`/leaderships/${municipioId}`)
      .then(res => setLiderancas(res.data))
      .catch(err => console.error(err));
  }, [municipioId]);

  useEffect(() => {
    carregarLiderancas();
  }, [carregarLiderancas]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    api.post('/leaderships', {
      name: nome,
      role: cargo,
      party: partido,
      phone: telefone,
      alignment: alinhamento,
      notes: notas,
      municipalityId: municipioId
    }).then(() => {
      setNome('');
      setPartido('');
      setTelefone('');
      setNotas('');
      carregarLiderancas();
    }).catch(err => console.error(err))
      .finally(() => setSalvando(false));
  };

  const excluirLideranca = (id: string) => {
    api.delete(`/leaderships/${id}`)
      .then(() => carregarLiderancas())
      .catch(err => console.error(err));
  };

  return (
    <div className="modal-fundo" onClick={onClose}>
      <div className="modal modal--largo" role="dialog" aria-modal="true" aria-labelledby="titulo-crm" onClick={e => e.stopPropagation()}>
        <div className="modal__cab">
          <div style={{ minWidth: 0 }}>
            <p className="rotulo-peq">CRM político de base</p>
            <h2 id="titulo-crm">Lideranças e apoios: {municipioNome}</h2>
          </div>
          <button className="btn-icone" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="modal__corpo">
          <form onSubmit={handleSubmit} className="form-lider">
            <input className="campo" type="text" placeholder="Nome da liderança / vereador *" aria-label="Nome" value={nome} onChange={e => setNome(e.target.value)} required />
            <select className="campo" value={cargo} onChange={e => setCargo(e.target.value)} aria-label="Cargo">
              <option value="Vereador">Vereador</option>
              <option value="Ex-Prefeito">Ex-Prefeito</option>
              <option value="Liderança Comunitária">Liderança Comunitária</option>
              <option value="Presidente de Partido">Presidente de Partido</option>
              <option value="Pastor / Liderança Religiosa">Pastor / Liderança Religiosa</option>
            </select>
            <input className="campo" type="text" placeholder="Partido (ex: PL)" aria-label="Partido" value={partido} onChange={e => setPartido(e.target.value)} />
            <input className="campo" type="tel" inputMode="tel" autoComplete="tel" placeholder="WhatsApp / telefone" aria-label="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} />
            <select className="campo" value={alinhamento} onChange={e => setAlinhamento(e.target.value)} aria-label="Alinhamento">
              <option value="ALTO">Alinhamento: alto (fiel)</option>
              <option value="MEDIO">Alinhamento: médio</option>
              <option value="EM CONQUISTA">Alinhamento: em conquista</option>
            </select>
            <input className="campo" type="text" placeholder="Observações / demandas" aria-label="Observações" value={notas} onChange={e => setNotas(e.target.value)} />

            <button type="submit" className="btn btn--primario span-2" disabled={salvando}>
              <Plus size={16} /> {salvando ? 'Salvando...' : 'Registrar apoio político'}
            </button>
          </form>

          {liderancas.length === 0 ? (
            <p className="texto-vazio" style={{ textAlign: 'center', padding: '16px 0' }}>Nenhuma liderança registrada para este município ainda.</p>
          ) : (
            liderancas.map(l => (
              <div key={l.id} className="lider" style={{ borderLeftColor: corAlinhamento(l.alignment) }}>
                <div className="lider__info">
                  <div className="lider__topo">
                    <strong>{l.name}</strong>
                    <span className="lider__tag">{l.role}{l.party ? ` (${l.party})` : ''}</span>
                  </div>
                  <p className="lider__meta">
                    📞 {l.phone ? <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`}>{l.phone}</a> : 'Sem telefone'}
                    {l.notes ? ` · 📝 ${l.notes}` : ''}
                  </p>
                </div>
                <button className="btn-icone" onClick={() => excluirLideranca(l.id)} title="Excluir" aria-label={`Excluir ${l.name}`}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
