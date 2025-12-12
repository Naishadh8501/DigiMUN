import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const sessionService = {
  getSession: () => api.get('/session/current'),
  createSession: (data) => api.post('/session', data),
  joinSession: (userData) => api.post('/session/join', userData),
  updateSession: (data) => api.patch('/session/current', data),
  
  // Update speakers with ACTION (start/end) for timer sync
  updateSpeakersList: (list, action) => api.patch('/session/speakers', { list, action }),
  
  startVote: (voteData) => api.post('/session/vote/start', voteData),
  castVote: (vote) => api.post('/session/vote/cast', vote),
  endVote: () => api.post('/session/vote/end'),
  
  sendChit: (chit) => api.post('/session/chits', chit),
  sendMessage: (message) => api.post('/session/chat', message),
  
  // New Marking Endpoint
  markDelegate: (data) => api.post('/session/mark', data),
};

export default api;