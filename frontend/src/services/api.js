import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor – attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ────────────────────────────────────────────────────────
export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const getMe = () => api.get('/auth/me').then((r) => r.data);

// ── Features metadata ──────────────────────────────────────────
export const getFeatures = () => api.get('/features').then((r) => r.data);

// ── Generic CRUD for any feature ────────────────────────────────
export const getItems = (featureKey, params = {}) =>
  api.get(`/${featureKey}`, { params }).then((r) => r.data);

export const getItem = (featureKey, id) =>
  api.get(`/${featureKey}/${id}`).then((r) => r.data);

export const createItem = (featureKey, data) =>
  api.post(`/${featureKey}`, data).then((r) => r.data);

export const updateItem = (featureKey, id, data) =>
  api.put(`/${featureKey}/${id}`, data).then((r) => r.data);

export const deleteItem = (featureKey, id) =>
  api.delete(`/${featureKey}/${id}`).then((r) => r.data);

export const generateAI = (featureKey, id) =>
  api.post(`/${featureKey}/${id}/generate`).then((r) => r.data);

// ── Favorites ───────────────────────────────────────────────────
export const checkFavorite = (featureKey, id, userId) =>
  api.get(`/${featureKey}/${id}/favorite`, { params: { userId } }).then((r) => r.data);

export const toggleFavorite = (featureKey, id, userId) =>
  api.post(`/${featureKey}/${id}/favorite`, { userId }).then((r) => r.data);

export const getFavorites = () =>
  api.get('/favorites').then((r) => r.data);

// ── Notes ───────────────────────────────────────────────────────
export const getNotes = (featureKey, id) =>
  api.get(`/${featureKey}/${id}/notes`).then((r) => r.data);

export const addNote = (featureKey, id, userId, content) =>
  api.post(`/${featureKey}/${id}/notes`, { userId, content }).then((r) => r.data);

export const deleteNote = (featureKey, noteId) =>
  api.delete(`/${featureKey}/notes/${noteId}`).then((r) => r.data);

// ── Analytics & Activity ────────────────────────────────────────
export const getAnalytics = () =>
  api.get('/analytics').then((r) => r.data);

export const getActivity = (limit = 20) =>
  api.get('/activity', { params: { limit } }).then((r) => r.data);

// ── Profile ─────────────────────────────────────────────────────
export const updateProfile = (data) =>
  api.put('/auth/profile', data).then((r) => r.data);

export const changePassword = (currentPassword, newPassword) =>
  api.put('/auth/password', { currentPassword, newPassword }).then((r) => r.data);

// ── CSV Export ──────────────────────────────────────────────────
export const exportCSV = (featureKey) =>
  api.get(`/${featureKey}/export/csv`, { responseType: 'blob' }).then((r) => r.data);

export default api;
