import { useState } from 'react';

export function InstalarAppModal({ onClose }: { onClose: () => void }) {
  const [dispositivo, setDispositivo] = useState<'ios' | 'android' | 'pc'>('ios');

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ backgroundColor: '#1e293b', width: '100%', maxWidth: '450px', borderRadius: '16px', border: '1px solid #334155', padding: '25px', color: '#f8fafc', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#facc15' }}>📲 Instalar App no Ecrã</h3>
          <button onClick={onClose} style={{ backgroundColor: '#334155', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>

        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px', lineHeight: '1.5' }}>
          Transforme este CRM num aplicativo exclusivo no seu telemóvel ou computador para acesso instantâneo sem abrir o navegador.
        </p>

        {/* SELETOR DE DISPOSITIVO */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button onClick={() => setDispositivo('ios')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', backgroundColor: dispositivo === 'ios' ? '#3b82f6' : '#0f172a', color: dispositivo === 'ios' ? 'white' : '#94a3b8' }}>
             iPhone / iPad
          </button>
          <button onClick={() => setDispositivo('android')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', backgroundColor: dispositivo === 'android' ? '#3b82f6' : '#0f172a', color: dispositivo === 'android' ? 'white' : '#94a3b8' }}>
            🤖 Android
          </button>
          <button onClick={() => setDispositivo('pc')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', backgroundColor: dispositivo === 'pc' ? '#3b82f6' : '#0f172a', color: dispositivo === 'pc' ? 'white' : '#94a3b8' }}>
            💻 Computador
          </button>
        </div>

        {/* INSTRUÇÕES VISUAIS PASSO A PASSO */}
        <div style={{ backgroundColor: '#0f172a', padding: '15px', borderRadius: '10px', border: '1px solid #334155', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
          {dispositivo === 'ios' && (
            <div>
              <p style={{ margin: '0 0 8px 0', color: '#4ade80', fontWeight: 'bold' }}>Passo a passo para Safari (iPhone / iPad):</p>
              <ol style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1' }}>
                <li>Abra este site no navegador <b>Safari</b>.</li>
                <li>Toque no botão de <b>Partilha</b> na barra inferior (<span style={{ fontSize: '16px' }}>⎋</span> ou quadrado com seta).</li>
                <li>Deslize as opções e escolha <b>"Adicionar ao Ecrã Principal"</b>.</li>
                <li>Toque em <b>Adicionar</b> no canto superior direito. Pronto! O ícone ficará igual a um app de App Store.</li>
              </ol>
            </div>
          )}

          {dispositivo === 'android' && (
            <div>
              <p style={{ margin: '0 0 8px 0', color: '#4ade80', fontWeight: 'bold' }}>Passo a passo para Chrome (Android):</p>
              <ol style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1' }}>
                <li>Abra este site no <b>Google Chrome</b>.</li>
                <li>Toque nos <b>três pontos verticais</b> no canto superior direito do navegador.</li>
                <li>Selecione <b>"Adicionar ao ecrã principal"</b> ou <b>"Instalar aplicação"</b>.</li>
                <li>Confirme tocando em <b>Instalar</b>. O app surgirá no seu menu de aplicativos.</li>
              </ol>
            </div>
          )}

          {dispositivo === 'pc' && (
            <div>
              <p style={{ margin: '0 0 8px 0', color: '#4ade80', fontWeight: 'bold' }}>Passo a passo para Computador (Chrome / Edge):</p>
              <ol style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1' }}>
                <li>No lado direito da barra de endereços (URL), clique no ícone de <b>Instalar</b> (um monitor com uma seta para baixo 🖥️↓) ou nos três pontos do navegador.</li>
                <li>Selecione <b>"Instalar Political BI..."</b>.</li>
                <li>O sistema abrirá o aplicativo numa janela dedicada e criará um atalho direto no seu Ambiente de Trabalho (Desktop).</li>
              </ol>
            </div>
          )}
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: '12px', backgroundColor: '#334155', border: 'none', color: 'white', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' }}>
          Entendido, Fechar Guia
        </button>

      </div>
    </div>
  );
}