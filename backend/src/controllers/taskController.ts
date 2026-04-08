import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Priority = "LOW" | "MEDIUM" | "HIGH";
type Status = "PENDING" | "IN_PROGRESS" | "DONE";

interface TaskParams {
  id: string;
}

interface CreateTaskBody {
  title: string;
  description?: string;
  priority?: Priority;
  status?: Status;
  category?: string;
  dueDate?: string;
}

interface UpdateTaskBody {
  title?: string;
  description?: string;
  priority?: Priority;
  category?: string;
  status?: Status;
  dueDate?: string | null;
}

interface TaskQuery {
  status?: Status;
  priority?: Priority;
  search?: string;
  category?: string;
  dueDateFilter?: "overdue" | "today" | "this_week" | "this_month" | "no_date";
}

export const getTasks = async (
  req: Request<{}, {}, {}, TaskQuery>,
  res: Response,
) => {
  try {
    const { status, priority, search, category, dueDateFilter } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    // Фильтрация по сроку - ИСПРАВЛЕННАЯ ВЕРСИЯ
    if (dueDateFilter) {
      const now = new Date();

      // Сбрасываем время на 00:00:00 для корректного сравнения
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (dueDateFilter) {
        case "overdue":
          // Просроченные: дата меньше сегодня
          where.dueDate = { lt: today };
          break;

        case "today":
          // Сегодня: дата равна сегодня
          where.dueDate = {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          };
          break;

        case "this_week": {
          // На этой неделе: от понедельника до воскресенья
          const dayOfWeek = today.getDay(); // 0 - воскресенье, 1 - понедельник
          const startOfWeek = new Date(today);
          // Определяем понедельник (если воскресенье - отнимаем 6 дней, иначе отнимаем dayOfWeek - 1)
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          startOfWeek.setDate(today.getDate() - daysToMonday);
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          where.dueDate = {
            gte: startOfWeek,
            lte: endOfWeek,
          };
          break;
        }

        case "this_month": {
          // В этом месяце: от первого до последнего дня месяца
          const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1,
          );
          const endOfMonth = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0,
          );
          endOfMonth.setHours(23, 59, 59, 999);

          where.dueDate = {
            gte: startOfMonth,
            lte: endOfMonth,
          };
          break;
        }

        case "no_date":
          // Без срока: dueDate равен null
          where.dueDate = null;
          break;
      }
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(tasks);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in getTasks:", error);
    res.status(500).json({ error: message });
  }
};

export const getTaskById = async (req: Request<TaskParams>, res: Response) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
};

export const createTask = async (
  req: Request<{}, {}, CreateTaskBody>,
  res: Response,
) => {
  try {
    const { title, description, priority, status, category, dueDate } =
      req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || "MEDIUM",
        status: status || "PENDING",
        category: category || null, // ← ДОБАВЬТЕ ЭТУ СТРОКУ
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
};

export const updateTask = async (
  req: Request<TaskParams, {}, UpdateTaskBody>,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, category, dueDate } =
      req.body;

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: title ?? existingTask.title,
        description:
          description !== undefined ? description : existingTask.description,
        priority: priority ?? (existingTask.priority as Priority),
        status: status ?? (existingTask.status as Status),
        category: category !== undefined ? category : existingTask.category, // ← ДОБАВЬТЕ
        dueDate:
          dueDate !== undefined
            ? dueDate
              ? new Date(dueDate)
              : null
            : existingTask.dueDate,
      },
    });

    res.json(task);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
};

export const deleteTask = async (req: Request<TaskParams>, res: Response) => {
  try {
    const { id } = req.params;

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
};
