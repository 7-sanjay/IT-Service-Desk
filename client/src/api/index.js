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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (
      err.response?.status === 403 &&
      err.response?.data?.code === "MUST_CHANGE_PASSWORD"
    ) {
      window.location.hash = "#/ticketing/change-password";
    }
    return Promise.reject(err);
  }
);

export default api;
