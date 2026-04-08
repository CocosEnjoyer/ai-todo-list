import React, { useState } from "react";
import styles from "./DecomposeModal.module.css";

interface DecomposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (subtasks: Array<{ title: string }>) => void;
  suggestedSubtasks: string[];
  taskTitle: string;
  isLoading?: boolean;
}

export const DecomposeModal: React.FC<DecomposeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  suggestedSubtasks,
  taskTitle,
  isLoading = false,
}) => {
  const [subtasks, setSubtasks] = useState<string[]>(suggestedSubtasks);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  // Обновляем локальное состояние когда меняются предложенные подзадачи
  React.useEffect(() => {
    setSubtasks(suggestedSubtasks);
  }, [suggestedSubtasks]);

  if (!isOpen) return null;

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(subtasks[index]);
  };

  const handleSaveEdit = (index: number) => {
    const newSubtasks = [...subtasks];
    newSubtasks[index] = editValue;
    setSubtasks(newSubtasks);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    const newSubtasks = subtasks.filter((_, i) => i !== index);
    setSubtasks(newSubtasks);
  };

  const handleAdd = () => {
    setSubtasks([...subtasks, "Новая подзадача"]);
  };

  const handleConfirm = () => {
    const validSubtasks = subtasks
      .filter((title) => title.trim())
      .map((title) => ({ title: title.trim() }));

    if (validSubtasks.length === 0) {
      alert("Добавьте хотя бы одну подзадачу");
      return;
    }

    onConfirm(validSubtasks);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📋 Декомпозиция задачи</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.taskInfo}>
          <strong>Задача:</strong> {taskTitle}
        </div>

        <div className={styles.subtasksSection}>
          <div className={styles.subtasksHeader}>
            <label>Подзадачи (можно редактировать):</label>
            <button className={styles.addBtn} onClick={handleAdd}>
              + Добавить
            </button>
          </div>

          <div className={styles.subtasksList}>
            {isLoading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>🤖 LLM анализирует задачу...</p>
              </div>
            ) : subtasks.length > 0 ? (
              subtasks.map((subtask, index) => (
                <div key={index} className={styles.subtaskItem}>
                  {editingIndex === index ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className={styles.editInput}
                        autoFocus
                      />
                      <button
                        className={styles.saveBtn}
                        onClick={() => handleSaveEdit(index)}
                      >
                        💾
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={styles.subtaskText}>
                        {index + 1}. {subtask}
                      </span>
                      <div className={styles.subtaskActions}>
                        <button
                          className={styles.editBtn}
                          onClick={() => handleEdit(index)}
                        >
                          ✏️
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(index)}
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className={styles.noSubtasks}>
                {isLoading
                  ? "Анализируем..."
                  : "Не удалось получить предложения. Попробуйте ещё раз."}
              </div>
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button
            className={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={isLoading || subtasks.length === 0}
          >
            ✅ Создать подзадачи
          </button>
        </div>
      </div>
    </div>
  );
};
