import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create public axios instance without auth interceptors
const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/api/auth/signup', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
};

// User API
export const usersApi = {
  getProfile: () => api.get('/api/users/me'),
  
  updateProfile: (data: { name: string }) => 
    api.put('/api/users/me', data),
  
  getEmailSettings: () => api.get('/api/users/email-settings'),
  
  updateEmailSettings: (data: { email: string; app_password: string }) =>
    api.post('/api/users/email-settings', data),
  
  testEmailConnection: () => api.post('/api/users/email-settings/test'),
};

// Events API
export const eventsApi = {
  list: () => api.get('/api/events'),
  
  create: (data: { name: string; description?: string }) =>
    api.post('/api/events', data),
  
  get: (eventId: string) => api.get(`/api/events/${eventId}`),
  
  update: (eventId: string, data: any) => 
    api.put(`/api/events/${eventId}`, data),
  
  delete: (eventId: string) => api.delete(`/api/events/${eventId}`),
  
  uploadTemplate: (eventId: string, formData: FormData) => {
    return api.post(`/api/events/${eventId}/template`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Participants API
export const participantsApi = {
  list: (eventId: string) => 
    api.get(`/api/events/${eventId}/participants`),
  
  upload: (eventId: string, formData: FormData) => {
    return api.post(`/api/events/${eventId}/participants/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  delete: (eventId: string, participantId: string) =>
    api.delete(`/api/events/${eventId}/participants/${participantId}`),
  
  deleteAll: (eventId: string) =>
    api.delete(`/api/events/${eventId}/participants`),
};

// Send API
export const sendApi = {
  send: (eventId: string, options?: { send_all?: boolean }) =>
    api.post(`/api/events/${eventId}/send`, options),
  
  getResults: (eventId: string) =>
    api.get(`/api/events/${eventId}/results`),
  
  downloadFeedback: (eventId: string, anonymous: boolean = false) =>
    api.get(`/api/events/${eventId}/feedback/download`, {
      params: { anonymous },
      responseType: 'blob'
    }),
};

// Admin API
export const adminApi = {
  getDashboard: () => api.get('/api/admin/stats'),
  
  getUsers: () => api.get('/api/admin/users'),
  
  deleteUser: (userId: string) => api.delete(`/api/admin/users/${userId}`),
};

// Feedback API (public - no auth required)
export const feedbackApi = {
  getForm: (token: string) => publicApi.get(`/api/feedback/${token}`),
  
  submit: (token: string, answers: any[]) =>
    publicApi.post(`/api/feedback/${token}/submit`, { answers }),
};

export default api;
