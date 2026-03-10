import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

const client = axios.create({ baseURL: API_URL });

client.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const auth = {
  login: (data) => client.post('/auth/login', data),
  register: (data) => client.post('/auth/register', data),
  me: () => client.get('/auth/me'),
};

export const workspaces = {
  list: () => client.get('/workspaces'),
  get: (id) => client.get(`/workspaces/${id}`),
  create: (data) => client.post('/workspaces', data),
  members: (id) => client.get(`/workspaces/${id}/members`),
};

export const boards = {
  list: (wsId) => client.get(`/workspaces/${wsId}/boards`),
  get: (id) => client.get(`/boards/${id}`),
  create: (wsId, data) => client.post(`/workspaces/${wsId}/boards`, data),
  delete: (id) => client.delete(`/boards/${id}`),
};

export const tasks = {
  create: (columnId, data) => client.post(`/columns/${columnId}/tasks`, data),
  get: (id) => client.get(`/tasks/${id}`),
  update: (id, data) => client.patch(`/tasks/${id}`, data),
  move: (id, data) => client.post(`/tasks/${id}/move`, data),
  delete: (id) => client.delete(`/tasks/${id}`),
  addComment: (id, data) => client.post(`/tasks/${id}/comments`, data),
};

export const notifications = {
  list: () => client.get('/notifications'),
  markRead: () => client.post('/notifications/mark-read'),
};

export const analytics = {
  workspaceStats: (wsId) => axios.get(`${process.env.REACT_APP_ANALYTICS_URL || 'http://localhost:8082'}/stats/workspace/${wsId}`),
};

export default client;
