export type Priority = "LOW" | "MEDIUM" | "HIGH";

export type Status = "PENDING" | "IN_PROGRESS" | "DONE";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  taskId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: Priority;
  status: Status;
  category?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks?: Subtask[];
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: Priority;
  status?: Status;
  category?: string | null;
  dueDate?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: Status;
  category?: string | null;
  dueDate?: string | null;
}

export interface TaskFilters {
  status?: Status;
  priority?: Priority;
  category?: string | null;
  search?: string;
  dueDate?: DueDateFilter;
}

export type DueDateFilter =
  | "overdue"
  | "today"
  | "this_week"
  | "this_month"
  | "no_date";

// LLM Response Types
export interface PrioritySuggestion {
  priority: "LOW" | "MEDIUM" | "HIGH";
  reason: string;
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
  reason: string;
}

export interface DecomposeSuggestion {
  subtasks: string[];
}

export interface WorkloadSummary {
  summary: string;
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
  reason: string;
}

export type TaskCategory =
  | "Работа"
  | "Учёба"
  | "Дом"
  | "Покупки"
  | "Здоровье"
  | "Финансы"
  | "Другое";
