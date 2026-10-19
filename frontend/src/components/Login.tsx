import { useEffect, useRef, useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import { InstalarAppModal } from './InstalarAppModal';
import { MarcaSimbolo } from './Marca';
import { usePWA, instalarDireto } from '../services/pwa';
import { aquecerServidor } from '../services/api';

const TAMANHO_CODIGO = 4;

export function Login({ onLoginSucesso }: { onLoginSucesso: () => void }) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState(false);
  const [modalInstalarAberto, setModalInstalarAberto] = useState(false);
  const [focado, setFocado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { podeInstalarDireto, instalado } = usePWA();

  // Enquanto a pessoa digita o código, o servidor gratuito já vai acordando
  useEffect(() => {
    aquecerServidor();
  }, []);

  const validar = (valor: string) => {
    if (valor === '2274') {
      try {
        localStorage.setItem('crm_autorizado', 'true');
      } catch {
        /* sem armazenamento local: a sessão vale só até fechar a aba */
      }
      onLoginSucesso();
    } else {
      setErro(true);
      setCodigo('');
      inputRef.current?.focus();
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    validar(codigo);
  };

  const digitar = (valor: string) => {
    const so = valor.replace(/\D/g, '').slice(0, TAMANHO_CODIGO);
    setCodigo(so);
    setErro(false);
    // Entra sozinho quando o quarto dígito é digitado
    if (so.length === TAMANHO_CODIGO) validar(so);
  };

  const instalar = async () => {
    const abriu = await instalarDireto();
    // iPhone, iPad e navegadores sem instalação direta: mostra o passo a passo
    if (!abriu) setModalInstalarAberto(true);
  };

  return (
    <div className="login">
      <div className="login__cartao">
        <div className="login__marca">
          <MarcaSimbolo tamanho={72} />
          <h1>
            <span className="login__api">API</span>
            Cidadania 360
          </h1>
          <p className="login__texto">Mapa eleitoral, metas e lideranças do mandato num só lugar.</p>
        </div>

        <form onSubmit={handleLogin}>
          <label className="login__rotulo" htmlFor="codigo-acesso">
            Código de acesso
          </label>
          <div className={`codigo ${erro ? 'is-erro' : ''}`} onClick={() => inputRef.current?.focus()}>
            <input
              id="codigo-acesso"
              ref={inputRef}
              className="codigo__input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={TAMANHO_CODIGO}
              value={codigo}
              onChange={(e) => digitar(e.target.value)}
              onFocus={() => setFocado(true)}
              onBlur={() => setFocado(false)}
              aria-invalid={erro}
              aria-describedby={erro ? 'codigo-erro' : undefined}
              autoFocus
              required
            />
            {Array.from({ length: TAMANHO_CODIGO }).map((_, i) => (
              <span
                key={i}
                className={`codigo__casa ${i < codigo.length ? 'is-cheia' : ''} ${focado && i === Math.min(codigo.length, TAMANHO_CODIGO - 1) ? 'is-atual' : ''}`}
                aria-hidden="true"
              />
            ))}
          </div>

          {erro && (
            <p className="login__erro" id="codigo-erro" role="alert">
              Código incorreto. Confira os 4 dígitos e tente de novo.
            </p>
          )}

          <button type="submit" className="btn btn--primario btn--bloco login__entrar" disabled={codigo.length < TAMANHO_CODIGO}>
            Entrar
          </button>
        </form>

        <div className="login__instalar">
          {instalado ? (
            <p className="login__instalado">
              <CheckCircle2 size={16} /> App instalado neste aparelho. Abra pelo ícone Cidadania 360.
            </p>
          ) : (
            <button className="btn btn--instalar" onClick={instalar}>
              <Download size={18} />
              {podeInstalarDireto ? 'Instalar o app neste aparelho' : 'Colocar o app na tela inicial'}
            </button>
          )}
        </div>
      </div>

      <footer className="login__rodape">
        <span>Gabinete Estratégico • Mandato Jefferson Campos</span>
        <span>Desenvolvido por Emerson Junqueira - 2026</span>
      </footer>

      {modalInstalarAberto && <InstalarAppModal onClose={() => setModalInstalarAberto(false)} />}
    </div>
  );
}
