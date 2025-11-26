import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api', // Proxied through Vite to http://localhost:3001
  withCredentials: true, // Include cookies in requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({ error: 'Nu s-a putut conecta la server' });
    } else {
      // Something else happened
      return Promise.reject({ error: 'A apărut o eroare neașteptată' });
    }
  }
);

export default api;
