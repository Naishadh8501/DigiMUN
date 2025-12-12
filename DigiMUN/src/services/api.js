import axios from 'axios';

// CHANGE THIS to your actual Render Backend URL later
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add Token if you implement Auth later
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const sessionService = {
  // Fetch current session state
  getSession: () => api.get('/session/current'),
  
  // Create/Reset session
  createSession: (data) => api.post('/session', data),
  
  // Join session (update delegate list)
  joinSession: (userData) => api.post('/session/join', userData),
  
  // Update generic session data (Chair actions)
  updateSession: (data) => api.patch('/session/current', data),
  
  // Speakers List Actions
  updateSpeakersList: (list) => api.patch('/session/speakers', { list }),
  
  // Voting Actions
  startVote: (voteData) => api.post('/session/vote/start', voteData),
  castVote: (vote) => api.post('/session/vote/cast', vote),
  endVote: () => api.post('/session/vote/end'),

  // Chat/Motions/Chits
  sendChit: (chit) => api.post('/session/chits', chit),
  sendMessage: (message) => api.post('/session/chat', message),
};

export default api;