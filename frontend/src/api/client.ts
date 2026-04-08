import axios from "axios";
import type {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilters,
  Subtask,
} from "../types/task";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Версионирование API
const API_VERSION = "v1";
const withVersion = (endpoint: string) => `/${API_VERSION}${endpoint}`;

export const taskApi = {
  getAll: async (filters?: TaskFilters): Promise<Task[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.dueDate) params.append("dueDateFilter", filters.dueDate);

    const response = await api.get(
      withVersion(`/tasks${params.toString() ? `?${params}` : ""}`),
    );
    return response.data;
  },

  getById: async (id: string): Promise<Task> => {
    const response = await api.get(withVersion(`/tasks/${id}`));
    return response.data;
  },

  create: async (data: CreateTaskDto): Promise<Task> => {
    const response = await api.post(withVersion("/tasks"), data);
    return response.data;
  },

  update: async (id: string, data: UpdateTaskDto): Promise<Task> => {
    const response = await api.put(withVersion(`/tasks/${id}`), data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(withVersion(`/tasks/${id}`));
  },

  // Методы для подзадач
  getSubtasks: async (taskId: string): Promise<Subtask[]> => {
    const response = await api.get(withVersion(`/subtasks/task/${taskId}`));
    return response.data;
  },

  createSubtasks: async (
    taskId: string,
    subtasks: Array<{ title: string }>,
  ): Promise<Subtask[]> => {
    const response = await api.post(withVersion(`/subtasks/task/${taskId}`), {
      subtasks,
    });
    return response.data;
  },

  updateSubtask: async (
    subtaskId: string,
    data: { completed: boolean },
  ): Promise<Subtask> => {
    const response = await api.put(withVersion(`/subtasks/${subtaskId}`), data);
    return response.data;
  },

  deleteSubtask: async (subtaskId: string): Promise<void> => {
    await api.delete(withVersion(`/subtasks/${subtaskId}`));
  },
};

// LLM API
export const llmApi = {
  suggestPriority: (
    taskId: string,
  ): Promise<{ priority: "LOW" | "MEDIUM" | "HIGH"; reason: string }> =>
    api
      .post(withVersion(`/llm/suggest-priority/${taskId}`))
      .then((res) => res.data),

  categorizeTask: (
    taskId: string,
  ): Promise<{ category: string; confidence: number; reason: string }> =>
    api.post(withVersion(`/llm/categorize/${taskId}`)).then((res) => res.data),

  decomposeTask: (taskId: string): Promise<{ subtasks: string[] }> =>
    api.post(withVersion(`/llm/decompose/${taskId}`)).then((res) => res.data),

  getWorkloadSummary: (): Promise<{ summary: string }> =>
    api.post(withVersion("/llm/workload-summary")).then((res) => res.data),

  applyCategory: (taskId: string, category: string) =>
    api
      .post(withVersion(`/llm/apply-category/${taskId}`), { category })
      .then((res) => res.data),

  createSubtasks: taskApi.createSubtasks,
  updateSubtask: taskApi.updateSubtask,
  deleteSubtask: taskApi.deleteSubtask,
  getSubtasks: taskApi.getSubtasks,
};
