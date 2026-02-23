import api from "./index";

export const getPriorities = () => {
  return api.get("/priorities");
};

export const createPriority = (data) => {
  return api.post("/priorities", data);
};

export const deletePriority = (id) => {
  return api.delete(`/priorities/${id}`);
};

export const searchPriority = (keyword) => {
  return api.get(`/priorities/search?priority=${keyword}`);
};

