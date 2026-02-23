import api from "./index";

// ADMIN
export const getAllRequest = (data) => {
  if (data) {
    return api.get(`/requests-admin?size=${data.size}&page=${data.page}`);
  } else {
    return api.get("/requests-admin");
  }
};

// HEAD
export const getAllRequestHead = (data) => {
  if (data) {
    return api.get(`/requests-head?size=${data.size}&page=${data.page}`);
  } else {
    return api.get("/requests-head");
  }
};

// TEAM
export const getAllRequestWithUserProccess = (data) => {
  if (data) {
    return api.get(`/requests-team?size=${data.size}&page=${data.page}`);
  } else {
    return api.get("/requests-team");
  }
};

export const requestDone = (id) => {
  return api.put(`/done/${id}`);
};

// USER
export const getAllUserRequest = (data) => {
  if (data) {
    return api.get(`/requests?size=${data.size}&page=${data.page}`);
  } else {
    return api.get("/requests");
  }
};

export const addRequest = (request) => {
  return api.post("/requests", request, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// UTILS
export const getDetailRequest = (id) => {
  return api.get(`/requests/${id}`);
};

export const getCategories = () => {
  return api.get("/categories");
};

export const updateUserProcess = (user_process, id) => {
  return api.put(`/userprocess/${id}`, { user_process: user_process });
};

export const rejectRequestAdmin = (id) => {
  return api.put(`/reject/${id}`);
};

export const approveRequestTeam = (id, user_process) => {
  return api.put(`/approve-team/${id}`, { user_process: user_process });
};

export const rejectRequestTeam = (id) => {
  return api.put(`/reject-team/${id}`);
};

export const replyMessageTeam = (id, message) => {
  return api.post(`/reply-req/${id}`, message, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getRequestWithReply = (id) => {
  return api.get(`/requests-reply/${id}`);
};

export const getRequestAiHelp = (id) => {
  return api.get(`/requests/${id}/ai-help`);
};

export const resolveRequestByUser = (id, data = {}) => {
  return api.put(`/requests/${id}/resolve-by-user`, data);
};

export const reopenTicket = (id) => {
  return api.put(`/requests/${id}/reopen`);
};

export const escalateRequest = (id) => {
  return api.put(`/escalate/${id}`);
};

export const reassignRequest = (id, user_process) => {
  return api.put(`/reassign/${id}`, { user_process });
};

export const getRequestWaiting = () => {
  return api.get("/requests-waiting");
};

export const getRequestProcess = () => {
  return api.get("/requests-process");
};

export const getRequestDone = () => {
  return api.get("/requests-done");
};

export const searchRequest = (keyword) => {
  return api.get(`/request/search?search=${keyword}`);
};

// Get requests grouped by category
export const getRequestsByCategory = () => {
  return api.get("/requests-by-category");
};

// Get requests grouped by priority
export const getRequestsByPriority = () => {
  return api.get("/requests-by-priority");
};

// Dashboard stats
export const getUserDashboardStats = () => {
  return api.get("/dashboard/user");
};

export const getTeamDashboardStats = () => {
  return api.get("/dashboard/team");
};

export const getHeadDashboardStats = () => {
  return api.get("/dashboard/head");
};

export const getAdminDashboardStats = () => {
  return api.get("/dashboard/admin");
};
