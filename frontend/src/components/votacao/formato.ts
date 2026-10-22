export const fmt = (v: number) => v.toLocaleString('pt-BR');
export const fmtPct = (v: number) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
