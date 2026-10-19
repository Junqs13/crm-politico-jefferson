import axios from 'axios';

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

export const api = axios.create({
  baseURL: getBaseUrl(),
});

export const getDobradas = async (ano: number | string) => {
  const response = await api.get(`/municipios/dobradas?ano=${ano}`);
  return response.data;
};