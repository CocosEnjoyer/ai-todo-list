import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskApi, llmApi } from "../api/client";
import type {
  TaskFilters,
  CreateTaskDto,
  UpdateTaskDto,
  Subtask,
} from "../types/task";

const STALE_TIME = 5 * 60 * 1000;
const GC_TIME = 10 * 60 * 1000;

export const useTasks = (filters?: TaskFilters) => {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      const tasks = await taskApi.getAll(filters);
      // Загружаем подзадачи для каждой задачи
      const tasksWithSubtasks = await Promise.all(
        tasks.map(async (task) => {
          const subtasks = await taskApi.getSubtasks(task.id);
          return { ...task, subtasks };
        }),
      );
      return tasksWithSubtasks;
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskDto) => taskApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskDto }) =>
      taskApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks = queryClient.getQueryData(["tasks"]);

      queryClient.setQueryData(["tasks"], (old: any) => {
        if (!old) return old;
        return old.map((task: any) =>
          task.id === id ? { ...task, ...data } : task,
        );
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => taskApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previousTasks = queryClient.getQueryData(["tasks"]);

      queryClient.setQueryData(["tasks"], (old: any) => {
        if (!old) return old;
        return old.filter((task: any) => task.id !== id);
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

// Хук для переключения статуса подзадачи
export const useToggleSubtask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subtaskId,
      completed,
    }: {
      subtaskId: string;
      completed: boolean;
    }) => taskApi.updateSubtask(subtaskId, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

// Хук для создания подзадач
export const useCreateSubtasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      subtasks,
    }: {
      taskId: string;
      subtasks: Array<{ title: string }>;
    }) => taskApi.createSubtasks(taskId, subtasks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};
