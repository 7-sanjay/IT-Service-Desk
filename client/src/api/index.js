import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// kirim setiap request ke server dengan header Authorization yang berisi token
api.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `${token}`;
  }
  return req;
});

export default api;
