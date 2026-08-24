import axios from "axios";

export const AUTH_TOKEN_KEY = "newbert-auth-token";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://newbert2-0.onrender.com/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
