import axios from 'axios';
import { iniciarCarga, finalizarCarga, rastrear } from './carregamento';

const getBaseUrl = () => {
  let url = 'http://localhost:3333';

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    url = import.meta.env.VITE_API_URL || 'https://crm-politico-jefferson.onrender.com';
  } else if (import.meta.env.VITE_API_URL) {
    url = import.meta.env.VITE_API_URL;
  }

  // Remove barra no final, se houver
  url = url.replace(/\/+$/, '');

  // Garante que termina sempre com /api
  if (!url.endsWith('/api')) {
    url += '/api';
  }

  return url;
};

const BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: BASE_URL,
  // O plano gratuito do Render pode levar até 1 minuto para acordar
  timeout: 90000,
});

// Mesmo endereço, sem a barra de carregamento: usado para aquecer o servidor no login
const apiSilenciosa = axios.create({ baseURL: BASE_URL, timeout: 90000 });

// Liga toda chamada da API à barra de carregamento
api.interceptors.request.use(
  (config) => {
    iniciarCarga();
    return config;
  },
  (erro) => {
    finalizarCarga();
    return Promise.reject(erro);
  }
);
api.interceptors.response.use(
  (resposta) => {
    finalizarCarga();
    return resposta;
  },
  (erro) => {
    finalizarCarga();
    return Promise.reject(erro);
  }
);

/*
  Os dados por ano mudam pouco durante o uso, então ficam guardados na memória
  por 10 minutos. O mapa e o painel de metas pedem 2026 e reaproveitam a mesma resposta.
*/
const VALIDADE_MS = 10 * 60 * 1000;
const cacheDobradas = new Map<string, { promessa: Promise<any>; criadoEm: number }>();

const buscarDobradas = (ano: number | string) => {
  const chave = String(ano);
  const salvo = cacheDobradas.get(chave);
  if (salvo && Date.now() - salvo.criadoEm < VALIDADE_MS) return salvo.promessa;

  const promessa = apiSilenciosa.get(`/municipios/dobradas?ano=${chave}`).then((r) => r.data);
  cacheDobradas.set(chave, { promessa, criadoEm: Date.now() });
  // Se falhar, a próxima tentativa busca de novo
  promessa.catch(() => cacheDobradas.delete(chave));
  return promessa;
};

export const getDobradas = (ano: number | string) => rastrear(buscarDobradas(ano));

/* Chamado ao abrir o login: acorda o servidor e já traz os dados de 2026, sem mostrar barra */
let jaAqueceu = false;
export const aquecerServidor = () => {
  if (jaAqueceu) return;
  jaAqueceu = true;
  apiSilenciosa.get('/v1/health').catch(() => {});
  buscarDobradas(2026).catch(() => {});
};
