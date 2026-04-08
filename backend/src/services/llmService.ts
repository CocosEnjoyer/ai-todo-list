import { Task } from "@prisma/client";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const API_URL = "https://models.inference.ai.azure.com/chat/completions";

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ВАЛИДАЦИИ ============

function validatePriority(priority: string): "LOW" | "MEDIUM" | "HIGH" {
  const validPriorities = ["LOW", "MEDIUM", "HIGH"];
  const upperPriority = priority?.toUpperCase();
  if (validPriorities.includes(upperPriority)) {
    return upperPriority as "LOW" | "MEDIUM" | "HIGH";
  }
  console.warn(`Invalid priority from LLM: "${priority}", using MEDIUM`);
  return "MEDIUM";
}

function validateCategory(category: string): string {
  const validCategories = [
    "Работа",
    "Учёба",
    "Дом",
    "Покупки",
    "Здоровье",
    "Финансы",
    "Другое",
  ];
  if (validCategories.includes(category)) {
    return category;
  }
  console.warn(`Invalid category from LLM: "${category}", using Другое`);
  return "Другое";
}

function validateConfidence(confidence: number): number {
  if (typeof confidence === "number" && confidence >= 0 && confidence <= 100) {
    return confidence;
  }
  console.warn(`Invalid confidence: "${confidence}", using 50`);
  return 50;
}

function validateSubtasks(subtasks: any): string[] {
  if (Array.isArray(subtasks) && subtasks.length > 0) {
    const validSubtasks = subtasks
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim());
    if (validSubtasks.length > 0) {
      return validSubtasks.slice(0, 8); // не больше 8 подзадач
    }
  }
  console.warn("Invalid subtasks from LLM, using defaults");
  return [
    "Изучить требования задачи",
    "Разбить на этапы",
    "Выполнить каждый этап",
    "Проверить результат",
  ];
}

function safeJsonParse<T>(response: string, fallback: T): T {
  try {
    // Удаляем markdown обёртки ```json ... ```
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith("```json")) {
      cleanResponse = cleanResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
    } else if (cleanResponse.startsWith("```")) {
      cleanResponse = cleanResponse.replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(cleanResponse);
    return { ...fallback, ...parsed };
  } catch (error) {
    console.error("Failed to parse LLM response:", response);
    console.error("Parse error:", error);
    return fallback;
  }
}

async function callLLM(
  messages: Array<{ role: string; content: string }>,
  options?: { model?: string; temperature?: number },
): Promise<string> {
  if (!GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN is not set");
    throw new Error("LLM service not configured");
  }

  const { model = "gpt-4o-mini", temperature = 0.3 } = options || {};

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LLM API Error:", response.status, errorText);
      throw new Error(`LLM API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices[0].message.content;
  } catch (error) {
    console.error("LLM call failed:", error);
    throw error;
  }
}

// ============ ОСНОВНЫЕ ФУНКЦИИ С ВАЛИДАЦИЕЙ ============

export async function suggestPriority(
  title: string,
  description: string | null,
  dueDate: Date | null,
): Promise<{ priority: "LOW" | "MEDIUM" | "HIGH"; reason: string }> {
  const fallback = {
    priority: "MEDIUM" as const,
    reason: "Не удалось определить приоритет",
  };

  try {
    // Форматируем дату понятно для LLM
    let dueDateText = "Не указан";
    if (dueDate) {
      const today = new Date();
      const due = new Date(dueDate);
      const daysDiff = Math.ceil(
        (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff < 0) {
        dueDateText = `ПРОСРОЧЕНА на ${Math.abs(daysDiff)} дней (была ${due.toLocaleDateString("ru-RU")})`;
      } else if (daysDiff === 0) {
        dueDateText = `СЕГОДНЯ (${due.toLocaleDateString("ru-RU")}) - ОЧЕНЬ СРОЧНО!`;
      } else if (daysDiff === 1) {
        dueDateText = `ЗАВТРА (${due.toLocaleDateString("ru-RU")}) - СРОЧНО!`;
      } else if (daysDiff <= 3) {
        dueDateText = `через ${daysDiff} дня (${due.toLocaleDateString("ru-RU")})`;
      } else if (daysDiff <= 7) {
        dueDateText = `через ${daysDiff} дней (${due.toLocaleDateString("ru-RU")})`;
      } else {
        dueDateText = `${due.toLocaleDateString("ru-RU")} (через ${daysDiff} дней)`;
      }
    }

    const prompt = `Оцени приоритет задачи.

Название: ${title}
Описание: ${description || "Нет описания"}
Срок: ${dueDateText}

Правила оценки приоритета:
- Если срок СЕГОДНЯ или ПРОСРОЧЕН → HIGH
- Если срок ЗАВТРА или через 1-2 дня → HIGH
- Если срок через 3-7 дней → MEDIUM
- Если срок больше недели → LOW
- Если срок не указан, но задача важная по описанию → HIGH или MEDIUM

Ответь ТОЛЬКО JSON в формате:
{"priority": "HIGH/MEDIUM/LOW", "reason": "обоснование"}`;

    const response = await callLLM([
      {
        role: "system",
        content:
          "Ты эксперт по управлению задачами. Отвечай только JSON. Используй только значения HIGH, MEDIUM, LOW. Будь строгим: задачи на сегодня или просроченные всегда HIGH.",
      },
      { role: "user", content: prompt },
    ]);

    const result = safeJsonParse(response, fallback);

    return {
      priority: validatePriority(result.priority),
      reason:
        typeof result.reason === "string"
          ? result.reason.slice(0, 200)
          : fallback.reason,
    };
  } catch (error) {
    console.error("suggestPriority failed:", error);
    return fallback;
  }
}

export async function categorizeTask(
  title: string,
  description: string | null,
): Promise<{ category: string; confidence: number; reason: string }> {
  const fallback = {
    category: "Другое",
    confidence: 50,
    reason: "Не удалось определить категорию",
  };

  try {
    const prompt = `Ты - эксперт по категоризации задач.

Доступные категории (только из этого списка!): Работа, Учёба, Дом, Покупки, Здоровье, Финансы, Другое

Задача:
Название: ${title}
Описание: ${description || "Нет описания"}

ВАЖНО: Если задача связана с работой/разработкой/проектом - категория "Работа".
Наличие слова "товар" НЕ делает задачу "Покупки", если это работа.

Ответь ТОЛЬКО JSON:
{"category": "категория_из_списка", "confidence": число_0-100, "reason": "краткое_обоснование"}`;

    const response = await callLLM([
      {
        role: "system",
        content:
          "Ты эксперт по категоризации. Отвечай только JSON. Категория строго из списка: Работа, Учёба, Дом, Покупки, Здоровье, Финансы, Другое.",
      },
      { role: "user", content: prompt },
    ]);

    const result = safeJsonParse(response, fallback);

    return {
      category: validateCategory(result.category),
      confidence: validateConfidence(result.confidence),
      reason:
        typeof result.reason === "string"
          ? result.reason.slice(0, 200)
          : fallback.reason,
    };
  } catch (error) {
    console.error("categorizeTask failed:", error);
    return fallback;
  }
}

export async function decomposeTask(
  title: string,
  description: string | null,
): Promise<{ subtasks: string[] }> {
  const fallback = {
    subtasks: [
      "Изучить требования задачи",
      "Разбить на этапы",
      "Выполнить каждый этап",
      "Проверить результат",
    ],
  };

  try {
    const prompt = `Разбей сложную задачу на конкретные подзадачи.
    
Задача: ${title}
Описание: ${description || "Нет описания"}

Ответь ТОЛЬКО JSON:
{"subtasks": ["подзадача 1", "подзадача 2", "подзадача 3"]}

Создай 3-5 подзадач. Каждая подзадача должна быть конкретной и выполнимой.`;

    const response = await callLLM([
      {
        role: "system",
        content:
          "Ты эксперт по декомпозиции. Отвечай только JSON. Создай 3-5 конкретных подзадач.",
      },
      { role: "user", content: prompt },
    ]);

    const result = safeJsonParse(response, fallback);

    return {
      subtasks: validateSubtasks(result.subtasks),
    };
  } catch (error) {
    console.error("decomposeTask failed:", error);
    return fallback;
  }
}

interface WorkloadStats {
  total: number;
  overdue: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
  pending: number;
  in_progress: number;
  done: number;
  due_soon: number;
}

export async function getWorkloadSummary(tasks: Task[]): Promise<string> {
  const now = new Date();

  // Задачи с высоким приоритетом (даже без даты)
  const highPriorityTasks = tasks.filter(
    (t) => t.priority === "HIGH" && t.status !== "DONE",
  );

  // Просроченные задачи
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE",
  );

  // Задачи со скоростью сроком (3 дня)
  const dueSoonTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      new Date(t.dueDate).getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000 &&
      t.status !== "DONE",
  );

  // Все важные задачи (для упоминания по заголовкам)
  const importantTasks = [
    ...highPriorityTasks,
    ...overdueTasks,
    ...dueSoonTasks,
  ]
    .filter(
      (t, index, self) => self.findIndex((t2) => t2.id === t.id) === index,
    )
    .slice(0, 8);

  const stats = {
    total: tasks.length,
    overdue: overdueTasks.length,
    high_priority: highPriorityTasks.length,
    medium_priority: tasks.filter(
      (t) => t.priority === "MEDIUM" && t.status !== "DONE",
    ).length,
    low_priority: tasks.filter(
      (t) => t.priority === "LOW" && t.status !== "DONE",
    ).length,
    pending: tasks.filter((t) => t.status === "PENDING").length,
    in_progress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    done: tasks.filter((t) => t.status === "DONE").length,
    due_soon: dueSoonTasks.length,
  };

  // Формируем список важных задач простым текстом, без эмодзи и форматирования
  const importantTasksText =
    importantTasks.length > 0
      ? importantTasks
          .map((t) => {
            let priorityText = "";
            if (t.priority === "HIGH") priorityText = "высокий приоритет";
            else if (t.priority === "MEDIUM")
              priorityText = "средний приоритет";
            else priorityText = "низкий приоритет";

            let statusText = "";
            if (t.status === "PENDING") statusText = "ожидает";
            else if (t.status === "IN_PROGRESS") statusText = "в работе";
            else statusText = "выполнена";

            const dueText = t.dueDate
              ? `, срок ${new Date(t.dueDate).toLocaleDateString("ru-RU")}`
              : "";

            return `- "${t.title}" (${priorityText}, ${statusText}${dueText})`;
          })
          .join("\n")
      : "нет";

  const prompt = `Проанализируй мои задачи и дай короткую сводку (3-4 предложения).

СТАТИСТИКА:
- Всего задач: ${stats.total}
- Просрочено: ${stats.overdue}
- Высокий приоритет: ${stats.high_priority}
- Средний приоритет: ${stats.medium_priority}
- Низкий приоритет: ${stats.low_priority}
- Ожидают: ${stats.pending}
- В работе: ${stats.in_progress}
- Выполнено: ${stats.done}
- Скоро дедлайн (менее 3 дней): ${stats.due_soon}

ВАЖНЫЕ ЗАДАЧИ:
${importantTasksText}

ПРАВИЛА ОТВЕТА:
1. Пиши коротко, 3-5 предложений.
2. Если есть просроченные задачи - скажи об этом.
3. Если есть задачи с высоким приоритетом - упомяни их по названию.
4. Обращайся ко мне на "ты".
5. НЕ используй эмодзи в ответе.
6. НЕ перечисляй задачи в формате списка с тире, пиши связным текстом.

Пример хорошего ответа:
"У тебя 2 просроченные задачи, срочно займись задачей 'Сдать отчет'. Остальные 5 задач можно распределить на неделю. Ты молодец, что держишь ситуацию под контролем."

Пример плохого ответа (НЕ ТАК):
"• задача 123 [высокий] 🔥 - ожидает"`;

  const response = await callLLM(
    [
      {
        role: "system",
        content:
          "Ты дружелюбный помощник по продуктивности. Отвечай коротко, без эмодзи, без маркированных списков. Пиши связным текстом на русском.",
      },
      { role: "user", content: prompt },
    ],
    { temperature: 0.5 },
  );

  return response;
}
