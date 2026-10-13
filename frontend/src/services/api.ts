import axios from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:3333/api',
});

export const getDobradas = async (ano: number = 2022) => {
  const response = await api.get(`/municipios/dobradas?ano=${ano}`);
  return response.data;
};