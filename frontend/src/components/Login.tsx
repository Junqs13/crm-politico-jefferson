import { useState } from 'react';
import { InstalarAppModal } from './InstalarAppModal';

export function Login({ onLoginSucesso }: { onLoginSucesso: () => void }) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState(false);
  const [modalInstalarAberto, setModalInstalarAberto] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo === '2274') {
      localStorage.setItem('crm_autorizado', 'true');
      onLoginSucesso();
    } else {
      setErro(true);
      setCodigo('');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', fontFamily: '-apple-system, sans-serif', color: '#f8fafc', padding: '15px', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#1e293b', padding: '35px 30px', borderRadius: '16px', border: '1px solid #334155', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)', textAlign: 'center' }}>
        
        <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>Acesso Restrito & Seguro</span>
        <h1 style={{ margin: '10px 0 10px 0', fontSize: '22px', color: '#ffffff' }}>Political BI & CRM</h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '25px' }}>Insira o código único de acesso de 4 dígitos para entrar.</p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="password" 
            maxLength={4}
            placeholder="••••" 
            value={codigo}
            onChange={(e) => { setCodigo(e.target.value); setErro(false); }}
            style={{ width: '100%', padding: '15px', textAlign: 'center', fontSize: '24px', letterSpacing: '8px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', outline: 'none', boxSizing: 'border-box' }}
            autoFocus
            required
          />
          
          {erro && (
            <p style={{ color: '#f87171', fontSize: '12px', margin: 0 }}>Código incorreto. Tente novamente.</p>
          )}

          <button type="submit" style={{ padding: '14px', backgroundColor: '#3b82f6', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', textTransform: 'uppercase' }}>
            Entrar no Sistema
          </button>
        </form>

        {/* BOTÃO VISUAL PARA CRIAR ÍCONE DE APP */}
        <div style={{ marginTop: '25px', borderTop: '1px solid #334155', paddingTop: '20px' }}>
          <button 
            onClick={() => setModalInstalarAberto(true)}
            style={{ width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px dashed #3b82f6', color: '#60a5fa', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            📱 Criar Ícone de App no Telemóvel / PC
          </button>
        </div>

        <div style={{ marginTop: '20px', fontSize: '11px', color: '#64748b' }}>
          Gabinete Estratégico • Mandato Jefferson Campos
        </div>

      </div>

      {/* MODAL DE INSTRUÇÕES DE INSTALAÇÃO */}
      {modalInstalarAberto && (
        <InstalarAppModal onClose={() => setModalInstalarAberto(false)} />
      )}
    </div>
  );
}