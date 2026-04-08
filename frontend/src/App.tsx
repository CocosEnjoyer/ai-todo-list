import React, { useState, useCallback, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "./hooks/useTasks";
import { TaskForm } from "./components/TaskForm/TaskForm";
import { TaskCard } from "./components/TaskCard/TaskCard";
import { TaskFilters } from "./components/TaskFilters/TaskFilters";
import type { TaskFilters as FiltersType } from "./types/task";
import { llmApi } from "./api/client";
import "./App.css";

// Конфигурация QueryClient с оптимизациями
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 10 * 60 * 1000, // 10 минут
      refetchOnWindowFocus: false, // Не перезагружать при фокусе окна
      retry: 1, // Только одна попытка при ошибке
    },
  },
});

// Мемоизированный компонент списка задач
const TaskList = React.memo(
  ({
    tasks,
    onUpdate,
    onDelete,
    onSuggestPriority,
    onCategorize,
    onDecompose,
  }: {
    tasks: any[];
    onUpdate: (id: string, data: any) => void;
    onDelete: (id: string) => void;
    onSuggestPriority: (id: string) => void;
    onCategorize: (id: string) => void;
    onDecompose: (id: string) => void;
  }) => {
    if (tasks.length === 0) {
      return (
        <div className="empty-state">
          <p>🎉 Нет задач! Создайте первую задачу выше.</p>
        </div>
      );
    }

    return (
      <div className="tasks-grid">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSuggestPriority={onSuggestPriority}
            onCategorize={onCategorize}
            onDecompose={onDecompose}
          />
        ))}
      </div>
    );
  },
);

TaskList.displayName = "TaskList";

// Основной компонент приложения
function TaskManagerContent() {
  const [filters, setFilters] = useState<FiltersType>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const { data: tasks, isLoading, error, isFetching } = useTasks(filters);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Мемоизируем колбэки, чтобы не создавались заново
  const handleUpdate = useCallback(
    (id: string, data: any) => {
      console.log("Updating task:", id, data);
      updateTask.mutate({ id, data });
    },
    [updateTask],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm("Вы уверены, что хотите удалить эту задачу?")) {
        deleteTask.mutate(id);
      }
    },
    [deleteTask],
  );

  const handleCreate = useCallback(
    (data: any) => {
      createTask.mutate(data);
    },
    [createTask],
  );

  const handleFilterChange = useCallback((newFilters: FiltersType) => {
    setFilters(newFilters);
  }, []);

  // LLM функции
  const handleSuggestPriority = useCallback(
    async (taskId: string) => {
      try {
        const suggestion = await llmApi.suggestPriority(taskId);
        const apply = window.confirm(
          `🤖 LLM предлагает приоритет: ${suggestion.priority}\n\n📝 Обоснование: ${suggestion.reason}\n\nПрименить?`,
        );
        if (apply) {
          updateTask.mutate({
            id: taskId,
            data: { priority: suggestion.priority },
          });
        }
      } catch (error) {
        alert("❌ Ошибка при получении предложения");
      }
    },
    [updateTask],
  );

  const handleCategorize = useCallback(async (taskId: string) => {
    try {
      const suggestion = await llmApi.categorizeTask(taskId);
      alert(
        `🏷️ Предложенная категория: ${suggestion.category}\n\n` +
          `📊 Уверенность: ${suggestion.confidence}%\n\n` +
          `📝 Обоснование: ${suggestion.reason}\n\n` +
          `(Добавление категории в разработке)`,
      );
    } catch (error) {
      alert("❌ Ошибка при категоризации");
    }
  }, []);

  const handleDecompose = useCallback(async (taskId: string) => {
    try {
      const suggestion = await llmApi.decomposeTask(taskId);
      const subtasksList = suggestion.subtasks
        .map((st, i) => `${i + 1}. ${st}`)
        .join("\n");
      alert(
        `📋 Предложенные подзадачи:\n\n${subtasksList}\n\n` +
          `(Создание подзадач в разработке)`,
      );
    } catch (error) {
      alert("❌ Ошибка при декомпозиции");
    }
  }, []);

  const handleWorkloadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const result = await llmApi.getWorkloadSummary();
      setSummary(result.summary);
    } catch (error) {
      console.error("Error getting summary:", error);
      setSummary("❌ Не удалось получить сводку");
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  // Мемоизируем пропсы для дочерних компонентов
  const taskListProps = useMemo(
    () => ({
      tasks: tasks || [],
      onUpdate: handleUpdate,
      onDelete: handleDelete,
      onSuggestPriority: handleSuggestPriority,
      onCategorize: handleCategorize,
      onDecompose: handleDecompose,
    }),
    [
      tasks,
      handleUpdate,
      handleDelete,
      handleSuggestPriority,
      handleCategorize,
      handleDecompose,
    ],
  );

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Загрузка задач...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <p>❌ Ошибка: {error.message}</p>
        <button onClick={() => window.location.reload()}>
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>📋 Интеллектуальный менеджер задач</h1>
        <p>Управляйте задачами с помощью AI</p>
        <button
          className="summary-btn"
          onClick={handleWorkloadSummary}
          disabled={isLoadingSummary}
        >
          {isLoadingSummary ? "🤔 Анализирую задачи..." : "📊 Сводка нагрузки"}
        </button>
        {summary && (
          <div className="summary-popup">
            <strong>🤖 AI Анализ:</strong>
            <p>{summary}</p>
          </div>
        )}
        {isFetching && !isLoading && (
          <div className="fetching-indicator">Обновление...</div>
        )}
      </header>

      <div className="container">
        <section className="create-section">
          <h2>➕ Создать новую задачу</h2>
          <TaskForm onSubmit={handleCreate} />
        </section>

        <section className="filters-section">
          <h2>🔍 Фильтры и поиск</h2>
          <TaskFilters filters={filters} onFilterChange={handleFilterChange} />
        </section>

        <section className="tasks-section">
          <h2>📝 Ваши задачи ({tasks?.length || 0})</h2>
          <TaskList {...taskListProps} />
        </section>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TaskManagerContent />
    </QueryClientProvider>
  );
}

export default App;
