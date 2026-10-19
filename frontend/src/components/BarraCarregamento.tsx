import { useEffect, useState } from 'react';
import { useCarregamento } from '../services/carregamento';

/*
  Aparece sempre que há dados a caminho.
  Até 0,3 s nada aparece (evita piscar em respostas rápidas).
  Depois disso, uma barra fina no topo.
  Passados 3 s, um aviso explica a espera e conta os segundos,
  porque o servidor gratuito pode estar acordando.
*/
export function BarraCarregamento() {
  const { pendentes, inicio } = useCarregamento();
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!pendentes) return;
    const id = window.setInterval(() => setAgora(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [pendentes]);

  const decorrido = pendentes && inicio ? Math.max(0, agora - inicio) : 0;
  const mostrarBarra = pendentes > 0 && decorrido >= 300;
  const mostrarAviso = pendentes > 0 && decorrido >= 3000;
  const segundos = Math.floor(decorrido / 1000);

  const mensagem =
    segundos < 12
      ? 'Carregando os dados...'
      : segundos < 40
      ? 'O servidor estava em repouso e está ligando. Isso acontece no primeiro acesso do dia.'
      : 'Quase lá. A primeira carga pode levar até 1 minuto.';

  return (
    <>
      <div className={`carga-barra ${mostrarBarra ? 'is-visivel' : ''}`} role="progressbar" aria-hidden={!mostrarBarra} aria-label="Carregando">
        <span />
      </div>

      {mostrarAviso && (
        <div className="carga-aviso" role="status" aria-live="polite">
          <span className="carga-aviso__giro" aria-hidden="true" />
          <span className="carga-aviso__texto">{mensagem}</span>
          <span className="carga-aviso__tempo num">{segundos}s</span>
        </div>
      )}
    </>
  );
}
