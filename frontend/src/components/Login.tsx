import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { InstalarAppModal } from './InstalarAppModal';

export function Login({ onLoginSucesso }: { onLoginSucesso: () => void }) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState(false);
  const [modalInstalarAberto, setModalInstalarAberto] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigo === '2274') {
      try {
        localStorage.setItem('crm_autorizado', 'true');
      } catch {
        /* sem armazenamento local: a sessão vale só até fechar a aba */
      }
      onLoginSucesso();
    } else {
      setErro(true);
      setCodigo('');
    }
  };

  return (
    <div className="login">
      <div className="login__cartao">
        <p className="rotulo-peq" style={{ letterSpacing: '2px' }}>Acesso restrito</p>
        <h1>Political BI & CRM</h1>
        <p className="login__texto">Digite o código de acesso de 4 dígitos para entrar.</p>

        <form onSubmit={handleLogin}>
          <input
            className="login__codigo"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={4}
            placeholder="••••"
            aria-label="Código de acesso"
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value);
              setErro(false);
            }}
            autoFocus
            required
          />

          {erro && <p className="login__erro">Código incorreto. Tente novamente.</p>}

          <button type="submit" className="btn btn--primario btn--bloco" style={{ height: '50px', textTransform: 'uppercase' }}>
            Entrar no sistema
          </button>
        </form>

        <div className="login__instalar">
          <button className="btn" onClick={() => setModalInstalarAberto(true)}>
            <Smartphone size={16} /> Instalar como app no celular ou PC
          </button>
        </div>

        <div className="login__rodape">Gabinete Estratégico • Mandato Jefferson Campos</div>
      </div>

      {modalInstalarAberto && <InstalarAppModal onClose={() => setModalInstalarAberto(false)} />}
    </div>
  );
}
