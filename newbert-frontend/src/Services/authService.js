import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

export const loginUser = (data) => {
  return API.post("/auth/login", data);
};