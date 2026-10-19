import axios from 'axios';

const getBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://crm-politico-jefferson.onrender.com';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3333';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
});

// Função essencial exigida pelo MapaDobradas e PainelBI
export const getDobradas = async (ano: number | string) => {
  const response = await api.get(`/municipios/dobradas?ano=${ano}`);
  return response.data;
};