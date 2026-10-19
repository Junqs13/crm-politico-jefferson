import { useState } from 'react';
import { X } from 'lucide-react';

type Dispositivo = 'ios' | 'android' | 'pc';

const detectarDispositivo = (): Dispositivo => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && 'ontouchend' in document)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'pc';
};

export function InstalarAppModal({ onClose }: { onClose: () => void }) {
  const [dispositivo, setDispositivo] = useState<Dispositivo>(detectarDispositivo);

  return (
    <div className="modal-fundo" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-instalar" onClick={(e) => e.stopPropagation()}>
        <div className="modal__cab">
          <div>
            <h2 id="titulo-instalar">📲 Instalar na tela inicial</h2>
            <p className="modal__sub">Abra o CRM direto pelo ícone, sem procurar o site no navegador.</p>
          </div>
          <button className="btn-icone" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="modal__corpo">
          <div className="seletor">
            <button className={dispositivo === 'ios' ? 'is-ativo' : ''} onClick={() => setDispositivo('ios')}>
              iPhone / iPad
            </button>
            <button className={dispositivo === 'android' ? 'is-ativo' : ''} onClick={() => setDispositivo('android')}>
              Android
            </button>
            <button className={dispositivo === 'pc' ? 'is-ativo' : ''} onClick={() => setDispositivo('pc')}>
              Computador
            </button>
          </div>

          <div className="passos">
            {dispositivo === 'ios' && (
              <>
                <p>No Safari (iPhone ou iPad):</p>
                <ol>
                  <li>Abra este site no Safari.</li>
                  <li>Toque no botão Compartilhar (o quadrado com a seta para cima).</li>
                  <li>Role as opções e escolha "Adicionar à Tela de Início".</li>
                  <li>Toque em Adicionar. O ícone aparece junto com os outros apps.</li>
                </ol>
              </>
            )}

            {dispositivo === 'android' && (
              <>
                <p>No Chrome (Android):</p>
                <ol>
                  <li>Abra este site no Google Chrome.</li>
                  <li>Toque nos três pontinhos no canto superior direito.</li>
                  <li>Escolha "Instalar app" ou "Adicionar à tela inicial".</li>
                  <li>Confirme em Instalar. O app aparece na lista de aplicativos.</li>
                </ol>
              </>
            )}

            {dispositivo === 'pc' && (
              <>
                <p>No Chrome ou Edge (computador):</p>
                <ol>
                  <li>Na barra de endereço, clique no ícone de instalar (um monitor com seta) ou nos três pontinhos do navegador.</li>
                  <li>Escolha "Instalar Jefferson Campos CRM".</li>
                  <li>O CRM abre numa janela própria e ganha um atalho na Área de Trabalho.</li>
                </ol>
              </>
            )}
          </div>
        </div>

        <div className="modal__rodape">
          <button className="btn btn--bloco" onClick={onClose}>
            Entendi, fechar
          </button>
        </div>
      </div>
    </div>
  );
}
