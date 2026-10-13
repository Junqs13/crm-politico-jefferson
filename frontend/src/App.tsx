import { useState } from 'react';
import { MapaDobradas } from './components/MapaDobradas';
import { PainelBI } from './components/PainelBI';
import { Login } from './components/Login';

export function App() {
  const [autenticado, setAutenticado] = useState<boolean>(
    localStorage.getItem('crm_autorizado') === 'true'
  );
  const [paginaAtual, setPaginaAtual] = useState<'mapa' | 'bi'>('mapa');

  if (!autenticado) {
    return <Login onLoginSucesso={() => setAutenticado(true)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#0f172a', overflow: 'hidden' }}>
      
      {/* NAVBAR SUPERIOR RESPONSIVA */}
      <div style={{ minHeight: '60px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '15px', color: '#facc15', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>⚡ Jefferson Campos • CRM</h2>
        </div>

        {/* BOTÕES DE NAVEGAÇÃO */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setPaginaAtual('mapa')} 
            style={{ padding: '8px 14px', backgroundColor: paginaAtual === 'mapa' ? '#3b82f6' : '#334155', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
            🗺️ Mapa
          </button>

          <button onClick={() => setPaginaAtual('bi')} 
            style={{ padding: '8px 14px', backgroundColor: paginaAtual === 'bi' ? '#3b82f6' : '#334155', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
            📊 Metas 2028
          </button>

          <button onClick={() => { localStorage.removeItem('crm_autorizado'); setAutenticado(false); }} 
            style={{ padding: '8px 10px', backgroundColor: '#ef4444', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }} title="Terminar Sessão">
            🔒 Sair
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {paginaAtual === 'mapa' ? <MapaDobradas /> : <PainelBI onVoltarMapa={() => setPaginaAtual('mapa')} />}
      </div>

    </div>
  );
}