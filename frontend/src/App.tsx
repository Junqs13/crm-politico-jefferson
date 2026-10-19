import { useState } from 'react';
import { Map as IconeMapa, ChartColumn, LogOut } from 'lucide-react';
import { MapaDobradas } from './components/MapaDobradas';
import { PainelBI } from './components/PainelBI';
import { Login } from './components/Login';

type Pagina = 'mapa' | 'bi';

const lerAutorizacao = () => {
  try {
    return localStorage.getItem('crm_autorizado') === 'true';
  } catch {
    return false;
  }
};

export function App() {
  const [autenticado, setAutenticado] = useState<boolean>(lerAutorizacao);
  const [paginaAtual, setPaginaAtual] = useState<Pagina>('mapa');

  const sair = () => {
    try {
      localStorage.removeItem('crm_autorizado');
    } catch {
      /* navegador sem armazenamento local */
    }
    setAutenticado(false);
  };

  if (!autenticado) {
    return <Login onLoginSucesso={() => setAutenticado(true)} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="topbar__marca">⚡ Jefferson Campos • CRM</h1>

        <div className="topbar__acoes">
          <nav className="nav-topo" aria-label="Navegação principal">
            <button className={`btn ${paginaAtual === 'mapa' ? 'is-ativo' : ''}`} onClick={() => setPaginaAtual('mapa')}>
              <IconeMapa size={16} /> Mapa
            </button>
            <button className={`btn ${paginaAtual === 'bi' ? 'is-ativo' : ''}`} onClick={() => setPaginaAtual('bi')}>
              <ChartColumn size={16} /> Metas 2028
            </button>
          </nav>

          <button className="btn btn-sair" onClick={sair} title="Sair" aria-label="Sair">
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <main className="conteudo">
        {paginaAtual === 'mapa' ? <MapaDobradas /> : <PainelBI onVoltarMapa={() => setPaginaAtual('mapa')} />}
      </main>

      <nav className="abas" aria-label="Navegação principal">
        <button className={`abas__btn ${paginaAtual === 'mapa' ? 'is-ativo' : ''}`} onClick={() => setPaginaAtual('mapa')}>
          <IconeMapa size={22} />
          Mapa
        </button>
        <button className={`abas__btn ${paginaAtual === 'bi' ? 'is-ativo' : ''}`} onClick={() => setPaginaAtual('bi')}>
          <ChartColumn size={22} />
          Metas 2028
        </button>
      </nav>
    </div>
  );
}
