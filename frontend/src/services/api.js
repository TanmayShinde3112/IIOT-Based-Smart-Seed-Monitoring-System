import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Helper to get full image URL
export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
};

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('seed_ai_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  register: (username, password) => api.post('/api/auth/register', { username, password }),
  login: (username, password) => api.post('/api/auth/login', { username, password }),
  me: () => api.get('/api/auth/me'),
  listUsers: () => api.get('/api/auth/users'),
};

export const sensorApi = {
  ingest: (payload, deviceToken = '') =>
    api.post('/api/sensors/ingest', payload, {
      headers: deviceToken ? { 'x-device-token': deviceToken } : {},
    }),
  latest: () => api.get('/api/sensors/latest'),
  history: (limit = 60) => api.get('/api/sensors/history', { params: { limit } }),
};

export const seedApi = {
  predict: (file, temperature = null, humidity = null) => {
    const form = new FormData();
    form.append('file', file);
    const params = new URLSearchParams();
    if (temperature !== null) params.append('temperature', temperature);
    if (humidity !== null) params.append('humidity', humidity);
    const queryString = params.toString();
    const url = queryString ? `/api/seeds/predict-seed?${queryString}` : '/api/seeds/predict-seed';
    return api.post(url, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  history: () => api.get('/api/seeds/history'),
  deleteRecord: (recordId) => api.delete(`/api/seeds/history/${recordId}`),
  clearHistory: () => api.delete('/api/seeds/history'),
};

export const wsUrl = () => {
  const base = API_BASE.replace('http://', 'ws://').replace('https://', 'wss://');
  const token = localStorage.getItem('seed_ai_token') || '';
  return `${base}/api/sensors/ws?token=${encodeURIComponent(token)}`;
};

export default api;
