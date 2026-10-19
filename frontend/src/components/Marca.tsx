/* Marca da API Cidadania 360: um anel de 360° com o ponto de chegada,
   como quem dá a volta completa no território. */

export function MarcaSimbolo({ tamanho = 32, comTexto = true }: { tamanho?: number; comTexto?: boolean }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" aria-hidden="true" className="marca-simbolo">
      <path
        d="M39.32 11.14 A20 20 0 1 1 29.18 4.68"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="29.18" cy="4.68" r="3.6" fill="var(--accent)" />
      {comTexto && (
        <text
          x="24"
          y="29.5"
          textAnchor="middle"
          fontFamily="'Barlow Semi Condensed', sans-serif"
          fontWeight="700"
          fontSize="15"
          fill="currentColor"
        >
          360
        </text>
      )}
    </svg>
  );
}

export function Marca({ tamanho = 32, className = '' }: { tamanho?: number; className?: string }) {
  return (
    <span className={`marca ${className}`}>
      <MarcaSimbolo tamanho={tamanho} />
      <span className="marca__nome">
        <span className="marca__api">API</span> Cidadania 360
      </span>
    </span>
  );
}
