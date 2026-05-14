// API Client for  Next backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    total: number;
    limit: number;
    skip: number;
    page: number;
  };
}

export const getErrorMessage = (error: unknown, fallback = "Something went wrong") => {
  return error instanceof Error && error.message ? error.message : fallback;
};

// Get auth token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
};

// Set auth token in localStorage
export const setAuthToken = (token: string) => {
  localStorage.setItem("authToken", token);
};

// Remove auth token from localStorage
export const removeAuthToken = () => {
  localStorage.removeItem("authToken");
};

// Make API request with auth token
export const apiRequest = async <T = any,>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }


  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data: any = {};
  const contentType = response.headers.get("content-type");
  
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    // Handle non-JSON response (like a 502 HTML page)
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Server error (${response.status}): ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`);
    }
    data = { success: true, message: text };
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `API request failed with status ${response.status}`);
  }

  return data;
};

// ===== AUTH API =====
export const auth = {
  register: async (
    name: string,
    email: string,
    password: string,
    role: "master_admin" | "admin" | "employee" = "employee",
    team: string = ""
  ) => {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role, team }),
    });
  },

  login: async (email: string, password: string) => {
    const response = await apiRequest<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (response.data?.token) {
      setAuthToken(response.data.token);
    }
    return response;
  },

  getProfile: async () => {
    return apiRequest("/auth/profile");
  },

  updateProfile: async (name: string, email: string, team: string) => {
    return apiRequest("/auth/profile", {
      method: "PUT",
      body: JSON.stringify({ name, email, team }),
    });
  },

  updatePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest("/auth/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  logout: () => {
    removeAuthToken();
  },
};

// ===== WORK LOG API =====
export const workLogs = {
  create: async (logData: any) => {
    return apiRequest("/work-logs", {
      method: "POST",
      body: JSON.stringify(logData),
    });
  },

  getMyLogs: async (limit = 10, skip = 0, status?: string, startDate?: string, endDate?: string, submittedOnly = false) => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("skip", skip.toString());
    if (status && status !== "all") params.append("status", status);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (submittedOnly) params.append("submittedOnly", "true");

    return apiRequest(`/work-logs/my-logs?${params.toString()}`);
  },

  getDetail: async (id: string) => {
    const res = await apiRequest(`/work-logs/${id}`);
    if (res.success && res.data) {
      // Extract user name from userId object if it exists
      const log = res.data;
      if (log.userId && typeof log.userId === "object" && "name" in log.userId) {
        log.user = log.userId.name;
      }
    }
    return res;
  },

  update: async (id: string, logData: any) => {
    return apiRequest(`/work-logs/${id}`, {
      method: "PUT",
      body: JSON.stringify(logData),
    });
  },

  getTodayLog: async () => {
    return apiRequest("/work-logs/today");
  },

  updateTaskStatus: async (logId: string, taskId: string, status: string) => {
    return apiRequest(`/work-logs/${logId}/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  submitLog: async (id: string) => {
    return apiRequest(`/work-logs/${id}/submit`, {
      method: "PUT",
    });
  },

  updateTask: async (logId: string, taskId: string, taskData: { status?: string; notes?: string }) => {
    return apiRequest(`/work-logs/${logId}/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(taskData),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/work-logs/${id}`, {
      method: "DELETE",
    });
  },
};

// ===== ADMIN API =====
export const admin = {
  getAllUsers: async (limit = 10, skip = 0, q?: string, team?: string, role?: string) => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("skip", skip.toString());
    if (q) params.append("q", q);
    if (team && team !== "all") params.append("team", team);
    if (role && role !== "all") params.append("role", role);
    return apiRequest(`/admin/users?${params.toString()}`);
  },

  getUserDetail: async (id: string) => {
    return apiRequest(`/admin/users/${id}`);
  },

  updateUserStatus: async (id: string, isActive: boolean) => {
    return apiRequest(`/admin/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ isActive }),
    });
  },

  getAllLogs: async (limit = 10, skip = 0, userId?: string, status?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("skip", skip.toString());
    if (userId && userId !== "all") params.append("userId", userId);
    if (status && status !== "all") params.append("status", status);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);

    return apiRequest(`/admin/logs/all?${params.toString()}`);
  },

  getTodayLogs: async (limit = 10, skip = 0) => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("skip", skip.toString());
    return apiRequest(`/admin/logs/today?${params.toString()}`);
  },

  getSeoReports: async (limit = 10, skip = 0, userId?: string, date?: string, department = "SEO") => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("skip", skip.toString());
    params.append("department", department);
    if (userId && userId !== "all") params.append("userId", userId);
    if (date) params.append("date", date);
    return apiRequest(`/admin/seo-reports?${params.toString()}`);
  },

  getActivityLogs: async (limit = 10, skip = 0, userId?: string) => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("skip", skip.toString());
    if (userId) params.append("userId", userId);

    return apiRequest(`/admin/activity-logs?${params.toString()}`);
  },
};

// ===== MESSAGING API =====
export const messaging = {
  sendMessage: async (messageData: {
    message: string;
    contextType: "task" | "log" | "direct";
    contextId?: string;
    receiverIds?: string[];
    mentions?: string[];
    attachments?: {
      name: string;
      url: string;
      type: "image" | "link" | "document" | "spreadsheet" | "presentation";
    }[];
  }) => {
    return apiRequest("/messages", {
      method: "POST",
      body: JSON.stringify(messageData),
    });
  },

  getMessages: async (contextType?: string, contextId?: string, receiverId?: string) => {
    const params = new URLSearchParams();
    if (contextType) params.append("contextType", contextType);
    if (contextId) params.append("contextId", contextId);
    if (receiverId) params.append("receiverId", receiverId);

    return apiRequest(`/messages?${params.toString()}`);
  },

  searchUsers: async (q: string) => {
    return apiRequest(`/users/search?q=${encodeURIComponent(q)}`);
  },

  getConversations: async () => {
    return apiRequest("/messages/conversations");
  },

  deleteConversation: async (userId: string) => {
    return apiRequest(`/messages/conversation/${userId}`, {
      method: "DELETE"
    });
  },

  markMessagesAsRead: async (data: { contextType: string, contextId?: string, senderId?: string }) => {
    return apiRequest("/messages/read", {
      method: "PUT",
      body: JSON.stringify(data)
    });
  },
};

// ===== NOTIFICATIONS API =====
export const notifications = {
  getAll: async () => {
    return apiRequest("/notifications");
  },

  markAllAsRead: async () => {
    return apiRequest("/notifications/read-all", {
      method: "PUT",
    });
  },

  markAsRead: async (id: string) => {
    return apiRequest(`/notifications/${id}/read`, {
      method: "PUT",
    });
  },
};


// ===== PROJECTS API =====
export const projects = {
  getAll: async () => {
    return apiRequest<any[]>("/projects");
  },
  getById: async (id: string) => {
    return apiRequest<any>(`/projects/${id}`);
  },
  create: async (data: { name: string; description: string; clientName?: string; members?: string[] }) => {
    return apiRequest("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update: async (id: string, data: any) => {
    return apiRequest(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  delete: async (id: string) => {
    return apiRequest(`/projects/${id}`, {
      method: "DELETE",
    });
  },
};
// ===== TASKS & ASSIGNMENTS API =====
export const tasks = {
  create: async (data: {
    assignedTo: string;
    title: string;
    priority?: string;
    tasks: { title: string; description: string; deadline: string }[];
  }) => {
    return apiRequest("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getAll: async (type: "assigned_to_me" | "assigned_by_me" | "all" | "admin_reports" = "assigned_to_me", status?: string, q?: string, date?: string, department?: string, projectId?: string, assignedTo?: string) => {
    const params = new URLSearchParams();
    params.append("type", type);
    if (status) params.append("status", status);
    if (q) params.append("q", q);
    if (date) params.append("date", date);
    if (department) params.append("department", department);
    if (projectId) params.append("projectId", projectId);
    if (assignedTo) params.append("assignedTo", assignedTo);
    return apiRequest(`/tasks?${params.toString()}`);
  },

  getAssignmentTasks: async (assignmentId: string) => {
    return apiRequest(`/assignments/${assignmentId}/tasks`);
  },

  update: async (id: string, data: { 
    status?: string; 
    remarks?: string; 
    assignedTo?: string;
    evidence?: string;
    completionRemarks?: string;
    evidenceFiles?: any[];
  }) => {
    return apiRequest(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  toggleTimer: async (taskId: string, action: "start" | "stop") => {
    return apiRequest(`/tasks/${taskId}/timer`, {
      method: "PUT",
      body: JSON.stringify({ action }),
    });
  },

  updateAssignment: async (id: string, data: {
    assignedTo: string;
    title: string;
    priority?: string;
    tasks: { _id?: string; title: string; description: string; deadline: string }[];
  }) => {
    return apiRequest(`/assignments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteAssignment: async (id: string) => {
    return apiRequest(`/assignments/${id}`, {
      method: "DELETE",
    });
  },
};

// ===== MASTER ADMIN API =====
export const masterAdmin = {
  getStats: async () => {
    return apiRequest("/master-admin/stats");
  },
};

// ===== ADMIN MICRO-TASKS API =====
export const adminMicroTasks = {
  // Admin submits a micro-task to master admin
  submit: async (data: {
    title: string;
    description?: string;
    proofLinks?: string[];
    proofFiles?: { id: string; name: string; url: string; type: string }[];
    timeSpent?: number;
    taskDate?: string;
  }) => {
    return apiRequest("/admin/micro-tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Admin gets their own submissions; Master Admin gets all unless userId is provided
  getAll: async (limit = 20, skip = 0, status?: string, date?: string, userId?: string) => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("skip", skip.toString());
    if (status && status !== "all") params.append("status", status);
    if (date) params.append("date", date);
    if (userId) params.append("userId", userId);
    return apiRequest(`/admin/micro-tasks?${params.toString()}`);
  },

  // Master Admin reviews/acknowledges a micro-task
  review: async (id: string, status: "reviewed" | "acknowledged", masterAdminNote?: string) => {
    return apiRequest(`/admin/micro-tasks/${id}/review`, {
      method: "PUT",
      body: JSON.stringify({ status, masterAdminNote }),
    });
  },

  update: async (id: string, data: {
    title: string;
    description?: string;
    proofLinks?: string[];
    proofFiles?: { id: string; name: string; url: string; type: string }[];
    timeSpent?: number;
    taskDate?: string;
  }) => {
    return apiRequest(`/admin/micro-tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/admin/micro-tasks/${id}`, {
      method: "DELETE",
    });
  },
};
// ===== FILE UPLOAD API =====
export const files = {
  upload: async (file: File | File[]) => {
    const uploadFiles = Array.isArray(file) ? file : [file];
    const oversizedFile = uploadFiles.find((f) => f.size > MAX_UPLOAD_SIZE_BYTES);

    if (oversizedFile) {
      throw new Error(`${oversizedFile.name} is too large. Maximum upload size is 4MB.`);
    }

    const formData = new FormData();
    uploadFiles.forEach((f) => formData.append("files", f));

    return apiRequest("/upload", {
      method: "POST",
      body: formData,
    });
  },
};
