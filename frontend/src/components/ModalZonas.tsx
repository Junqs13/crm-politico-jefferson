import { X } from 'lucide-react';

export interface ZonaEleitoral {
  zona: string;
  quantidade: string;
}

export function ModalZonas({ municipio, zonas, onClose }: { municipio: string; zonas: ZonaEleitoral[]; onClose: () => void }) {
  return (
    <div className="modal-fundo" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-zonas" onClick={(e) => e.stopPropagation()}>
        <div className="modal__cab">
          <div style={{ minWidth: 0 }}>
            <h2 id="titulo-zonas">Zonas eleitorais: {municipio}</h2>
            <p className="modal__sub">Eleitorado por zona em 2026.</p>
          </div>
          <button className="btn-icone" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="modal__corpo">
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Zona eleitoral</th>
                  <th className="dir">Eleitores</th>
                </tr>
              </thead>
              <tbody>
                {zonas.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', color: 'var(--muted)' }}>
                      Sem registro de zonas para este município.
                    </td>
                  </tr>
                ) : (
                  zonas.map((z, idx) => (
                    <tr key={`${z.zona}-${idx}`}>
                      <td>Zona {z.zona}</td>
                      <td className="dir num">{z.quantidade}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal__rodape">
          <button className="btn btn--primario btn--bloco" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
