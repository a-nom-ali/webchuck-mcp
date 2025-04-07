import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// =========================
// Snippet API Calls
// =========================

export const getSnippets = async (params = {}) => {
  const response = await api.get('/snippets', { params });
  return response.data;
};

export const getSnippet = async (id) => {
  const response = await api.get(`/snippets/${id}`);
  return response.data;
};

export const createSnippet = async (data) => {
  const response = await api.post('/snippets', data);
  return response.data;
};

export const updateSnippet = async (id, data) => {
  const response = await api.put(`/snippets/${id}`, data);
  return response.data;
};

export const deleteSnippet = async (id) => {
  await api.delete(`/snippets/${id}`);
  return true;
};

export const executeSnippet = async (id, sessionId) => {
  const response = await api.post(`/snippets/${id}/execute`, { sessionId });
  return response.data;
};

// =========================
// Volume API Calls
// =========================

export const getVolumes = async () => {
  const response = await api.get('/volumes');
  return response.data;
};

export const getVolume = async (id) => {
  const response = await api.get(`/volumes/${id}`);
  return response.data;
};

export const createVolume = async (data) => {
  const response = await api.post('/volumes', data);
  return response.data;
};

export const updateVolume = async (id, data) => {
  const response = await api.put(`/volumes/${id}`, data);
  return response.data;
};

export const deleteVolume = async (id) => {
  await api.delete(`/volumes/${id}`);
  return true;
};

export const scanVolume = async (id) => {
  const response = await api.post(`/volumes/${id}/scan`);
  return response.data;
};

// =========================
// Sample API Calls
// =========================

export const getSamples = async (params = {}) => {
  const response = await api.get('/samples', { params });
  return response.data;
};

export const getSample = async (id) => {
  const response = await api.get(`/samples/${id}`);
  return response.data;
};

export const updateSample = async (id, data) => {
  const response = await api.put(`/samples/${id}`, data);
  return response.data;
};

export const deleteSample = async (id) => {
  await api.delete(`/samples/${id}`);
  return true;
};

export const getSampleFileUrl = (id) => {
  return `${API_BASE_URL}/samples/${id}/file`;
};

// =========================
// ChucK Session API Calls
// =========================

// These would integrate with your current ChucK tools
export const getChucKSessions = async () => {
  // This would call your getChucKSessions tool
  return { sessions: [] }; // Placeholder
};

export default {
  // Snippets
  getSnippets,
  getSnippet,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  executeSnippet,
  
  // Volumes
  getVolumes,
  getVolume,
  createVolume,
  updateVolume,
  deleteVolume,
  scanVolume,
  
  // Samples
  getSamples,
  getSample,
  updateSample,
  deleteSample,
  getSampleFileUrl,
  
  // ChucK Sessions
  getChucKSessions,
};