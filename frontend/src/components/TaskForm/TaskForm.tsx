import React, { useState } from "react";
import type { CreateTaskDto, Priority, Status } from "../../types/task";

const CATEGORIES = [
  "",
  "Работа",
  "Учёба",
  "Дом",
  "Покупки",
  "Здоровье",
  "Финансы",
  "Другое",
];

interface TaskFormProps {
  onSubmit: (data: CreateTaskDto) => void;
  initialData?: CreateTaskDto;
  buttonText?: string;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  initialData = { title: "" },
  buttonText = "Добавить задачу",
}) => {
  const [formData, setFormData] = useState<CreateTaskDto>(initialData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSubmit(formData);
    if (!initialData.title) {
      setFormData({ title: "" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <input
        type="text"
        placeholder="Название задачи"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      <textarea
        placeholder="Описание (необязательно)"
        value={formData.description || ""}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        rows={3}
      />

      <div className="form-row">
        <select
          value={formData.priority || "MEDIUM"}
          onChange={(e) =>
            setFormData({ ...formData, priority: e.target.value as Priority })
          }
        >
          <option value="LOW">Низкий приоритет</option>
          <option value="MEDIUM">Средний приоритет</option>
          <option value="HIGH">Высокий приоритет</option>
        </select>

        <select
          value={formData.status || "PENDING"}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value as Status })
          }
        >
          <option value="PENDING">Ожидает</option>
          <option value="IN_PROGRESS">В работе</option>
          <option value="DONE">Готово</option>
        </select>

        <select
          value={formData.category || ""}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value || undefined })
          }
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat || "Без категории"}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <input
          type="date"
          value={formData.dueDate || ""}
          onChange={(e) =>
            setFormData({ ...formData, dueDate: e.target.value })
          }
        />
      </div>

      <button type="submit">{buttonText}</button>
    </form>
  );
};
