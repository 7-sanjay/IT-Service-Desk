import api from "./index";

export const searchUsers = (keyword, level) => {
  return api.get(`/users/search?user=${keyword}&level=${level}`);
};

export const login = (data) => {
  return api.post("/login", data);
};

export const createUserData = (data) => {
  return api.post("/user", data);
};

export const deleteUserData = (id, level) => {
  return api.delete(`/user/${id}/level/${level}`);
};

export const updateUserData = (id, data) => {
  return api.put(`/user/${id}`, data);
};

export const getAllUserAdmin = () => {
  return api.get("/admins");
};

export const getAllUserData = () => {
  return api.get("/users");
};

export const getAllUserTeam = () => {
  return api.get("/teams");
};

export const getAllUserHead = () => {
  return api.get("/heads");
};

export const getUsersCount = () => {
  return api.get("/users-count");
};

export const getTeamsCount = () => {
  return api.get("/teams-count");
};
