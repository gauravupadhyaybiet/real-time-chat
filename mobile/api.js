import axios from 'axios';

// Change to your machine IP if testing on physical device
export const BASE_URL = 'http://localhost:4000';

export const api = axios.create({
  baseURL: BASE_URL
});

export const setToken = (token) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};
export const clearToken = () => {
  delete api.defaults.headers.common['Authorization'];
};

