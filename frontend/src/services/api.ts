import axios from 'axios';

// Define o baseURL dinamicamente: se estiver em produção, usa o Render; se estiver local, usa a porta 3333
const getBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://crm-politico-jefferson.onrender.com'; // URL do seu backend no Render
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3333';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
});