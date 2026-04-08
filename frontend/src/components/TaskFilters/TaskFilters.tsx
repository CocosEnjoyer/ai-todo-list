import React, { useState, useEffect } from "react";
import type {
  DueDateFilter,
  TaskFilters as FiltersType,
  Priority,
  Status,
} from "../../types/task";
import { useDebounce } from "../../hooks/useDebounce";
import styles from "./TaskFilters.module.css";

interface TaskFiltersProps {
  filters: FiltersType;
  onFilterChange: (filters: FiltersType) => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchInput, 500);

  useEffect(() => {
    onFilterChange({ ...filters, search: debouncedSearch || undefined });
  }, [debouncedSearch]);

  const handleStatusChange = (status: string) => {
    onFilterChange({ ...filters, status: (status as Status) || undefined });
  };

  const handlePriorityChange = (priority: string) => {
    onFilterChange({
      ...filters,
      priority: (priority as Priority) || undefined,
    });
  };

  const handleDueDateChange = (dueDate: string) => {
    onFilterChange({
      ...filters,
      dueDate: (dueDate as DueDateFilter) || undefined,
    });
  };

  const handleCategoryChange = (category: string) => {
    onFilterChange({
      ...filters,
      category: category || undefined,
    });
  };

  const handleReset = () => {
    setSearchInput("");
    onFilterChange({});
  };

  return (
    <div className={styles["filters-bar"]}>
      <input
        type="text"
        placeholder="🔍 Поиск по названию или описанию..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />
      <select
        value={filters.status || ""}
        onChange={(e) => handleStatusChange(e.target.value)}
      >
        <option value="">Все статусы</option>
        <option value="PENDING">Ожидает</option>
        <option value="IN_PROGRESS">В работе</option>
        <option value="DONE">Готово</option>
      </select>
      <select
        value={filters.priority || ""}
        onChange={(e) => handlePriorityChange(e.target.value)}
      >
        <option value="">Все приоритеты</option>
        <option value="LOW">Низкий</option>
        <option value="MEDIUM">Средний</option>
        <option value="HIGH">Высокий</option>
      </select>

      <select
        value={filters.dueDate || ""}
        onChange={(e) => handleDueDateChange(e.target.value)}
      >
        <option value="">Все сроки</option>
        <option value="overdue">📅 Просроченные</option>
        <option value="today">📅 Сегодня</option>
        <option value="this_week">📅 На этой неделе</option>
        <option value="this_month">📅 В этом месяце</option>
        <option value="no_date">📅 Без срока</option>
      </select>
      <select
        value={filters.category || ""}
        onChange={(e) => handleCategoryChange(e.target.value)}
      >
        <option value="">Все категории</option>
        <option value="Работа">Работа</option>
        <option value="Учёба">Учёба</option>
        <option value="Дом">Дом</option>
        <option value="Покупки">Покупки</option>
        <option value="Здоровье">Здоровье</option>
        <option value="Финансы">Финансы</option>
        <option value="Другое">Другое</option>
      </select>
      <button onClick={handleReset}>Сбросить фильтры</button>
    </div>
  );
};
