import axios from 'axios';
import { toast } from '../components/Toast';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const http = axios.create({ baseURL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('token');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (status >= 500) {
      toast('Server error — please try again', 'error');
    }
    return Promise.reject(error);
  }
);

export default http;
