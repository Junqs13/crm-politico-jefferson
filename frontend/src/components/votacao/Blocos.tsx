/* Peças visuais comuns das telas de votação */

export function Segmentado<T extends string>({ valor, opcoes, aoMudar, rotulo }: { valor: T; opcoes: [T, string][]; aoMudar: (v: T) => void; rotulo: string }) {
  return (
    <div className="segmentado" role="group" aria-label={rotulo}>
      {opcoes.map(([v, texto]) => (
        <button key={v} className={valor === v ? 'is-ativo' : ''} aria-pressed={valor === v} onClick={() => aoMudar(v)}>
          {texto}
        </button>
      ))}
    </div>
  );
}

export function Esqueleto({ linhas = 5, altura = 40 }: { linhas?: number; altura?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="esqueleto" style={{ height: altura, marginBottom: 6 }} />
      ))}
    </div>
  );
}

export function FalhaCarga({ aoTentar, texto = 'Não foi possível carregar os dados de 2026.' }: { aoTentar: () => void; texto?: string }) {
  return (
    <div className="aviso-erro" role="alert">
      <p>{texto}</p>
      <button className="btn btn--primario" onClick={aoTentar}>
        Tentar de novo
      </button>
    </div>
  );
}
