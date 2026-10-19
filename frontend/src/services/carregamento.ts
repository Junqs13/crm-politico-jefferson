import { useSyncExternalStore } from 'react';

/*
  Conta as requisições em andamento para a barra de carregamento global.
  Qualquer promessa pode ser acompanhada com rastrear(); o cliente da API
  já é ligado aqui pelos interceptores em api.ts.
*/

type Estado = { pendentes: number; inicio: number | null };

let estado: Estado = { pendentes: 0, inicio: null };
const ouvintes = new Set<() => void>();

const emitir = (novo: Estado) => {
  estado = novo;
  ouvintes.forEach((fn) => fn());
};

export const iniciarCarga = () => {
  emitir({ pendentes: estado.pendentes + 1, inicio: estado.inicio ?? Date.now() });
};

export const finalizarCarga = () => {
  const pendentes = Math.max(0, estado.pendentes - 1);
  emitir({ pendentes, inicio: pendentes === 0 ? null : estado.inicio });
};

export function rastrear<T>(promessa: Promise<T>): Promise<T> {
  iniciarCarga();
  return promessa.finally(finalizarCarga);
}

const assinar = (fn: () => void) => {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
};

export const useCarregamento = () => useSyncExternalStore(assinar, () => estado);
