import { useState, useEffect, useCallback } from 'react';
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

export function PainelCRM({ municipioId, municipioNome, onClose }: { municipioId: string; municipioNome: string; onClose: () => void }) {
  const [liderancas, setLiderancas] = useState<Leadership[]>([]);
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('Vereador');
  const [partido, setPartido] = useState('');
  const [telefone, setTelefone] = useState('');
  const [alinhamento, setAlinhamento] = useState('ALTO');
  const [notas, setNotas] = useState('');

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
    }).catch(err => console.error(err));
  };

  const excluirLideranca = (id: string) => {
    api.delete(`/leaderships/${id}`)
      .then(() => carregarLiderancas())
      .catch(err => console.error(err));
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#1e293b', width: '700px', maxHeight: '90vh', borderRadius: '12px', border: '1px solid #334155', padding: '30px', color: '#f8fafc', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>CRM Político de Base</span>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', color: '#facc15' }}>Lideranças & Apoios: {municipioNome}</h2>
          </div>
          <button onClick={onClose} style={{ backgroundColor: '#334155', border: 'none', color: 'white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✕ Fechar</button>
        </div>

        {/* FORMULÁRIO DE CADASTRO DE LIDERANÇA */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '25px', backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
          <input type="text" placeholder="Nome da Liderança / Vereador *" value={nome} onChange={e => setNome(e.target.value)} required style={{ padding: '10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
          <select value={cargo} onChange={e => setCargo(e.target.value)} style={{ padding: '10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}>
            <option value="Vereador">Vereador</option>
            <option value="Ex-Prefeito">Ex-Prefeito</option>
            <option value="Liderança Comunitária">Liderança Comunitária</option>
            <option value="Presidente de Partido">Presidente de Partido</option>
            <option value="Pastor / Liderança Religiosa">Pastor / Liderança Religiosa</option>
          </select>
          <input type="text" placeholder="Partido (ex: PL)" value={partido} onChange={e => setPartido(e.target.value)} style={{ padding: '10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
          <input type="text" placeholder="WhatsApp / Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} style={{ padding: '10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
          <select value={alinhamento} onChange={e => setAlinhamento(e.target.value)} style={{ padding: '10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}>
            <option value="ALTO">Alinhamento: Alto (Fiel)</option>
            <option value="MEDIO">Alinhamento: Médio</option>
            <option value="EM CONQUISTA">Alinhamento: Em Conquista</option>
          </select>
          <input type="text" placeholder="Observações / Demandas" value={notas} onChange={e => setNotas(e.target.value)} style={{ padding: '10px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
          
          <button type="submit" style={{ gridColumn: 'span 2', padding: '12px', backgroundColor: '#3b82f6', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer' }}>
            + Registar Apoio Político
          </button>
        </form>

        {/* LISTA DE LIDERANÇAS CADASTRADAS */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {liderancas.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px' }}>Nenhuma liderança registada para este município ainda.</p>
          ) : (
            liderancas.map(l => (
              <div key={l.id} style={{ backgroundColor: '#0f172a', padding: '12px 15px', borderRadius: '8px', borderLeft: `4px solid ${l.alignment === 'ALTO' ? '#4ade80' : l.alignment === 'MEDIO' ? '#facc15' : '#f87171'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px', color: 'white' }}>{l.name}</strong>
                    <span style={{ fontSize: '11px', backgroundColor: '#1e293b', color: '#cbd5e1', padding: '2px 6px', borderRadius: '4px' }}>{l.role} {l.party ? `(${l.party})` : ''}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>📞 {l.phone || 'Sem telefone'} {l.notes ? `| 📝 ${l.notes}` : ''}</span>
                </div>
                <button onClick={() => excluirLideranca(l.id)} style={{ backgroundColor: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '16px' }} title="Excluir">🗑️</button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}