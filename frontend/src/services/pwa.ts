import { useSyncExternalStore } from 'react';

/*
  Instalação do app na tela inicial.
  Chrome, Edge e Samsung Internet (Android e computador) entregam o evento
  beforeinstallprompt, que permite instalar com um clique.
  O iPhone e o iPad não têm esse recurso: a Apple só permite instalar pelo
  menu Compartilhar do Safari, então lá mostramos o passo a passo.
*/

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Plataforma = 'ios' | 'android' | 'pc';

type Estado = { podeInstalarDireto: boolean; instalado: boolean };

let eventoGuardado: EventoInstalar | null = null;
let estado: Estado = { podeInstalarDireto: false, instalado: false };
const ouvintes = new Set<() => void>();

const emitir = (parcial: Partial<Estado>) => {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((fn) => fn());
};

export const estaInstalado = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone === true);

export const detectarPlataforma = (): Plataforma => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'pc';
};

// Precisa rodar cedo (em main.tsx): o navegador dispara o evento uma vez só
export function iniciarPWA() {
  if (typeof window === 'undefined') return;

  emitir({ instalado: estaInstalado() });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoGuardado = e as EventoInstalar;
    emitir({ podeInstalarDireto: true });
  });

  window.addEventListener('appinstalled', () => {
    eventoGuardado = null;
    emitir({ podeInstalarDireto: false, instalado: true });
  });

  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker não registrado', err));
    });
  }
}

/* Abre o diálogo nativo de instalação. Retorna false quando o navegador não oferece. */
export async function instalarDireto(): Promise<boolean> {
  if (!eventoGuardado) return false;
  const evento = eventoGuardado;
  await evento.prompt();
  const escolha = await evento.userChoice;
  eventoGuardado = null;
  emitir({ podeInstalarDireto: false, instalado: escolha.outcome === 'accepted' || estado.instalado });
  return true;
}

const assinar = (fn: () => void) => {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
};

export const usePWA = () => useSyncExternalStore(assinar, () => estado);
