import axios from "axios";

export const AUTH_TOKEN_KEY = "newbert-auth-token";

const defaultBaseURL = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://localhost:5000/api"
  : "https://newbert2-0.onrender.com/api";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseURL,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
