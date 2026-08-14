import axios from "axios";

const DEFAULT_TOKEN = "demo-session-jwt-token-snapserve";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("snapserve_token") || DEFAULT_TOKEN;
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor - handle errors without redirecting to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.setItem("snapserve_token", DEFAULT_TOKEN);
    }
    return Promise.reject(error);
  }
);

export default api;
