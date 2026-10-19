import { useState } from 'react';
import { X } from 'lucide-react';
import { detectarPlataforma, type Plataforma } from '../services/pwa';

type Dispositivo = Plataforma;
const detectarDispositivo = detectarPlataforma;

export function InstalarAppModal({ onClose }: { onClose: () => void }) {
  const [dispositivo, setDispositivo] = useState<Dispositivo>(detectarDispositivo);

  return (
    <div className="modal-fundo" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-instalar" onClick={(e) => e.stopPropagation()}>
        <div className="modal__cab">
          <div>
            <h2 id="titulo-instalar">📲 Instalar na tela inicial</h2>
            <p className="modal__sub">
              {dispositivo === 'ios'
                ? 'No iPhone e no iPad a Apple não permite instalar com um clique. Siga os passos no Safari.'
                : 'Este navegador não ofereceu a instalação direta. Siga os passos abaixo.'}
            </p>
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
                  <li>Toque em Adicionar. O ícone Cidadania 360 aparece junto com os outros apps.</li>
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
                  <li>Escolha "Instalar API Cidadania 360".</li>
                  <li>O app abre numa janela própria e ganha um atalho na Área de Trabalho.</li>
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
