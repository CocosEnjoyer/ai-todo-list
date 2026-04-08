import React, { useState } from "react";
import type {
  Task,
  UpdateTaskDto,
  Priority,
  Status,
  Subtask,
} from "../../types/task";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { llmApi } from "../../api/client";
import { DecomposeModal } from "../DecomposeModal/DecomposeModal";
import styles from "./TaskCard.module.css";

interface TaskCardProps {
  task: Task;
  onUpdate: (id: string, data: UpdateTaskDto) => void;
  onDelete: (id: string) => void;
  onSuggestPriority?: (id: string) => void;
  onCategorize?: (id: string) => void;
  onDecompose?: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingPriority, setIsLoadingPriority] = useState(false);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [isLoadingDecompose, setIsLoadingDecompose] = useState(false);
  const [isDecomposeModalOpen, setIsDecomposeModalOpen] = useState(false);
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<string[]>([]);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);

  const [editData, setEditData] = useState<UpdateTaskDto>({
    title: task.title,
    description: task.description || "",
    priority: task.priority,
    status: task.status,
    category: task.category || "",
    dueDate: task.dueDate,
  });

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "HIGH":
        return "#dc3545";
      case "MEDIUM":
        return "#ffc107";
      case "LOW":
        return "#28a745";
    }
  };

  const getPriorityText = (priority: Priority) => {
    switch (priority) {
      case "HIGH":
        return "🔴 Высокий";
      case "MEDIUM":
        return "🟡 Средний";
      case "LOW":
        return "🟢 Низкий";
    }
  };

  const getStatusText = (status: Status) => {
    switch (status) {
      case "PENDING":
        return "⏳ Ожидает";
      case "IN_PROGRESS":
        return "🔄 В работе";
      case "DONE":
        return "✅ Готово";
    }
  };

  const handleSuggestPriority = async () => {
    setIsLoadingPriority(true);
    try {
      const suggestion = await llmApi.suggestPriority(task.id);
      const apply = confirm(
        `🤖 LLM предлагает приоритет: ${suggestion.priority}\n\n📝 Обоснование: ${suggestion.reason}\n\nПрименить?`,
      );
      if (apply) {
        onUpdate(task.id, { priority: suggestion.priority });
      }
    } catch (error) {
      alert("❌ Ошибка при получении предложения");
    } finally {
      setIsLoadingPriority(false);
    }
  };

  const handleCategorize = async () => {
    setIsLoadingCategory(true);
    try {
      const suggestion = await llmApi.categorizeTask(task.id);
      const apply = confirm(
        `🏷️ LLM предлагает категорию: ${suggestion.category}\n\n` +
          `📊 Уверенность: ${suggestion.confidence}%\n\n` +
          `📝 Обоснование: ${suggestion.reason}\n\n` +
          `Применить категорию?`,
      );
      if (apply) {
        await llmApi.applyCategory(task.id, suggestion.category);
        console.log("Applying category:", suggestion.category);
        onUpdate(task.id, { category: suggestion.category });
        // Также обновляем локальное состояние editData
        setEditData((prev) => ({ ...prev, category: suggestion.category }));
        alert(`✅ Категория "${suggestion.category}" применена!`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Ошибка при категоризации");
    } finally {
      setIsLoadingCategory(false);
    }
  };

  const handleDecompose = async () => {
    setIsLoadingDecompose(true);
    setIsDecomposeModalOpen(true);
    // Показываем загрузку в модалке
    setSuggestedSubtasks([]);

    try {
      const suggestion = await llmApi.decomposeTask(task.id);
      console.log("LLM response:", suggestion); // Для отладки
      setSuggestedSubtasks(suggestion.subtasks);
    } catch (error) {
      console.error("Error:", error);
      // Дефолтные подзадачи если LLM не ответил
      setSuggestedSubtasks([
        "Изучить требования задачи",
        "Разбить на этапы",
        "Выполнить каждый этап",
        "Проверить результат",
      ]);
    } finally {
      setIsLoadingDecompose(false);
    }
  };

  const handleCreateSubtasks = async (
    newSubtasks: Array<{ title: string }>,
  ) => {
    try {
      const created = await llmApi.createSubtasks(task.id, newSubtasks);
      setSubtasks((prev) => [...prev, ...created]);
      setIsDecomposeModalOpen(false);
      alert(`✅ Создано ${created.length} подзадач!`);
    } catch (error) {
      console.error("Error creating subtasks:", error);
      alert("❌ Ошибка при создании подзадач");
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      await llmApi.updateSubtask(subtaskId, { completed });
      setSubtasks((prev) =>
        prev.map((st) => (st.id === subtaskId ? { ...st, completed } : st)),
      );
    } catch (error) {
      console.error("Error updating subtask:", error);
    }
  };

  // Добавьте после handleToggleSubtask
  const handleDeleteSubtask = async (subtaskId: string) => {
    if (confirm("Удалить эту подзадачу?")) {
      try {
        await llmApi.deleteSubtask(subtaskId);
        setSubtasks((prev) => prev.filter((st) => st.id !== subtaskId));
      } catch (error) {
        console.error("Error deleting subtask:", error);
        alert("❌ Ошибка при удалении подзадачи");
      }
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    try {
      const created = await llmApi.createSubtasks(task.id, [
        { title: newSubtaskTitle },
      ]);
      setSubtasks((prev) => [...prev, ...created]);
      setNewSubtaskTitle("");
      setIsAddingSubtask(false);
    } catch (error) {
      console.error("Error adding subtask:", error);
      alert("❌ Ошибка при добавлении подзадачи");
    }
  };

  const handleSave = () => {
    if (!editData.title?.trim()) return;
    onUpdate(task.id, {
      title: editData.title,
      description: editData.description,
      priority: editData.priority,
      status: editData.status,
      category: editData.category,
      dueDate: editData.dueDate,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      category: task.category || "",
      dueDate: task.dueDate,
    });
    setIsEditing(false);
  };

  const completedCount = subtasks.filter((s) => s.completed).length;

  if (isEditing) {
    return (
      <div className={`${styles.taskCard} ${styles.editing}`}>
        <div className={styles.editForm}>
          <h3>✏️ Редактирование задачи</h3>

          <div className={styles.editField}>
            <label>Название *</label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) =>
                setEditData({ ...editData, title: e.target.value })
              }
              placeholder="Введите название задачи"
              autoFocus
            />
          </div>

          <div className={styles.editField}>
            <label>Описание</label>
            <textarea
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
              placeholder="Введите описание (необязательно)"
              rows={3}
            />
          </div>

          <div className={styles.editRow}>
            <div className={styles.editField}>
              <label>Приоритет</label>
              <select
                value={editData.priority}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    priority: e.target.value as Priority,
                  })
                }
              >
                <option value="LOW">🟢 Низкий</option>
                <option value="MEDIUM">🟡 Средний</option>
                <option value="HIGH">🔴 Высокий</option>
              </select>
            </div>

            <div className={styles.editField}>
              <label>Статус</label>
              <select
                value={editData.status}
                onChange={(e) =>
                  setEditData({ ...editData, status: e.target.value as Status })
                }
              >
                <option value="PENDING">⏳ Ожидает</option>
                <option value="IN_PROGRESS">🔄 В работе</option>
                <option value="DONE">✅ Готово</option>
              </select>
            </div>
          </div>

          <div className={styles.editField}>
            <label>Категория</label>
            <select
              value={editData.category || ""}
              onChange={(e) =>
                setEditData({ ...editData, category: e.target.value || null })
              }
            >
              <option value="">Без категории</option>
              <option value="Работа">Работа</option>
              <option value="Учёба">Учёба</option>
              <option value="Дом">Дом</option>
              <option value="Покупки">Покупки</option>
              <option value="Здоровье">Здоровье</option>
              <option value="Финансы">Финансы</option>
              <option value="Другое">Другое</option>
            </select>
          </div>

          <div className={styles.editDateField}>
            <label>Срок выполнения</label>
            <input
              type="date"
              value={editData.dueDate ? editData.dueDate.split("T")[0] : ""}
              onChange={(e) =>
                setEditData({ ...editData, dueDate: e.target.value || null })
              }
            />
          </div>

          <div className={styles.editActions}>
            <button className={styles.saveBtn} onClick={handleSave}>
              💾 Сохранить изменения
            </button>
            <button className={styles.cancelBtn} onClick={handleCancel}>
              ❌ Отмена
            </button>
          </div>
        </div>
      </div>
    );
  }
  console.log("Task category:", task.category, "for task:", task.title);
  return (
    <>
      <div className={styles.taskCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <h3>{task.title}</h3>
            {task.category && (
              <span className={styles.categoryBadge}>🏷️ {task.category}</span>
            )}
          </div>
          <div
            className={styles.priorityBadge}
            style={{ backgroundColor: getPriorityColor(task.priority) }}
          >
            {getPriorityText(task.priority)}
          </div>
        </div>

        {task.description && (
          <div className={styles.cardDescription}>
            <strong>📝 Описание:</strong>
            <p>{task.description}</p>
          </div>
        )}

        <div className={styles.cardInfo}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Статус:</span>
            <span className={styles.infoValue}>
              {getStatusText(task.status)}
            </span>
          </div>
          {task.dueDate && (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Срок:</span>
              <span className={styles.infoValue}>
                📅{" "}
                {format(new Date(task.dueDate), "dd MMMM yyyy", { locale: ru })}
              </span>
            </div>
          )}
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Создана:</span>
            <span className={styles.infoValue}>
              🕐 {format(new Date(task.createdAt), "dd.MM.yyyy HH:mm")}
            </span>
          </div>
        </div>

        {/* Секция подзадач */}
        <div className={styles.subtasksSection}>
          <div className={styles.subtasksHeader}>
            <span className={styles.subtasksTitle}>
              📋 Подзадачи ({completedCount}/{subtasks.length})
            </span>
            <button
              className={styles.addSubtaskBtn}
              onClick={() => setIsAddingSubtask(true)}
            >
              + Добавить
            </button>
          </div>

          {isAddingSubtask && (
            <div className={styles.addSubtaskForm}>
              <input
                type="text"
                placeholder="Название подзадачи"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                autoFocus
              />
              <button onClick={handleAddSubtask}>✅</button>
              <button onClick={() => setIsAddingSubtask(false)}>❌</button>
            </div>
          )}

          <div className={styles.subtasksList}>
            {subtasks.map((subtask) => (
              <div key={subtask.id} className={styles.subtaskItem}>
                <label className={styles.subtaskLabel}>
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={(e) =>
                      handleToggleSubtask(subtask.id, e.target.checked)
                    }
                  />
                  <span className={subtask.completed ? styles.completed : ""}>
                    {subtask.title}
                  </span>
                </label>
                <button
                  className={styles.deleteSubtaskBtn}
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  title="Удалить подзадачу"
                >
                  🗑️
                </button>
              </div>
            ))}
            {subtasks.length === 0 && (
              <div className={styles.noSubtasks}>
                Нет подзадач. Нажмите "Декомпозиция" или "Добавить"
              </div>
            )}
          </div>
        </div>

        <div className={styles.cardActions}>
          <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
            ✏️ Редактировать
          </button>
          <button
            className={styles.llmBtn}
            onClick={handleSuggestPriority}
            disabled={isLoadingPriority}
          >
            {isLoadingPriority ? "🤔 ..." : "🎯 Приоритет"}
          </button>
          <button
            className={styles.llmBtn}
            onClick={handleCategorize}
            disabled={isLoadingCategory}
          >
            {isLoadingCategory ? "🤔 ..." : "🏷️ Категория"}
          </button>
          <button
            className={styles.llmBtn}
            onClick={handleDecompose}
            disabled={isLoadingDecompose}
          >
            {isLoadingDecompose ? "🤔 ..." : "📋 Декомпозиция"}
          </button>
          <button
            className={styles.deleteBtn}
            onClick={() => onDelete(task.id)}
          >
            🗑️ Удалить
          </button>
        </div>
      </div>

      <DecomposeModal
        isOpen={isDecomposeModalOpen}
        onClose={() => setIsDecomposeModalOpen(false)}
        onConfirm={handleCreateSubtasks}
        suggestedSubtasks={suggestedSubtasks}
        taskTitle={task.title}
        isLoading={isLoadingDecompose}
      />
    </>
  );
};
