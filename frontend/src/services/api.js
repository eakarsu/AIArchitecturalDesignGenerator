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

export const register = (name, email, password) =>
  api.post('/auth/register', { name, email, password }).then((r) => r.data);

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

// ── AI History ──────────────────────────────────────────────────
export const getAIHistory = (params = {}) =>
  api.get('/ai-history', { params }).then((r) => r.data);

// ── Global Search ───────────────────────────────────────────────
export const globalSearch = (q, features = '') =>
  api.get('/search', { params: { q, features } }).then((r) => r.data);

// ── Design Comparison ───────────────────────────────────────────
export const compareDesigns = (design_id_a, design_id_b) =>
  api.post('/ai/compare-designs', { design_id_a, design_id_b }).then((r) => r.data);

// ── Batch AI Generate ───────────────────────────────────────────
export const batchGenerate = (featureKey, item_ids) =>
  api.post(`/${featureKey}/batch-generate`, { item_ids }).then((r) => r.data);

// ── AI Extras (NEW audit-proposed features) ─────────────────────
export const aiExtras = {
  // 1. Architecture Template Library
  template: (payload) => api.post('/ai-extras/template', payload).then((r) => r.data),
  listTemplates: (params) => api.get('/ai-extras/template', { params }).then((r) => r.data),
  // 2. Accessibility Audit
  accessibilityAudit: (payload) => api.post('/ai-extras/accessibility-audit', payload).then((r) => r.data),
  listAccessibilityAudits: (params) => api.get('/ai-extras/accessibility-audit', { params }).then((r) => r.data),
  // 3. Collaborative Markup Tool
  postComment: (payload) => api.post('/ai-extras/comments', payload).then((r) => r.data),
  listComments: (designId) => api.get(`/ai-extras/comments/${designId}`).then((r) => r.data),
  synthesizeComments: (designId) => api.post(`/ai-extras/comments/${designId}/synthesize`).then((r) => r.data),
  // 4. Interior Color Harmony
  colorHarmony: (payload) => api.post('/ai-extras/color-harmony', payload).then((r) => r.data),
  listColorPalettes: (params) => api.get('/ai-extras/color-harmony', { params }).then((r) => r.data),
  // 5. Lighting Simulation
  lightingSimulation: (payload) => api.post('/ai-extras/lighting-simulation', payload).then((r) => r.data),
  listLightingSimulations: (params) => api.get('/ai-extras/lighting-simulation', { params }).then((r) => r.data),
  // 6. Furniture Arrangement
  furnitureArrangement: (payload) => api.post('/ai-extras/furniture-arrangement', payload).then((r) => r.data),
  listFurnitureArrangements: (params) => api.get('/ai-extras/furniture-arrangement', { params }).then((r) => r.data),
};

export default api;
