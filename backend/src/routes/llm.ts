import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import * as llmService from "../services/llmService";

const router = Router();
const prisma = new PrismaClient();

interface TaskParams {
  taskId: string;
}

interface ApplyCategoryBody {
  category: string;
}

// US-5: Предложение приоритета для задачи
router.post(
  "/suggest-priority/:taskId",
  async (req: Request<TaskParams>, res: Response) => {
    try {
      const { taskId } = req.params;
      const task = await prisma.task.findUnique({ where: { id: taskId } });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const suggestion = await llmService.suggestPriority(
        task.title,
        task.description,
        task.dueDate,
      );

      res.json(suggestion);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

// US-3: Категоризация задачи
router.post(
  "/categorize/:taskId",
  async (req: Request<TaskParams>, res: Response) => {
    try {
      const { taskId } = req.params;
      const task = await prisma.task.findUnique({ where: { id: taskId } });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const suggestion = await llmService.categorizeTask(
        task.title,
        task.description,
      );

      res.json(suggestion);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

// Применить категорию к задаче
router.post(
  "/apply-category/:taskId",
  async (req: Request<TaskParams, {}, ApplyCategoryBody>, res: Response) => {
    try {
      const { taskId } = req.params;
      const { category } = req.body;

      const existingTask = await prisma.task.findUnique({
        where: { id: taskId },
      });
      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: { category },
      });

      res.json(updatedTask);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

// US-4: Декомпозиция задачи
router.post(
  "/decompose/:taskId",
  async (req: Request<TaskParams>, res: Response) => {
    try {
      const { taskId } = req.params;
      const task = await prisma.task.findUnique({ where: { id: taskId } });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const suggestion = await llmService.decomposeTask(
        task.title,
        task.description,
      );

      res.json(suggestion);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  },
);

// US-6: Сводка нагрузки по всем задачам
router.post("/workload-summary", async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany();
    const summary = await llmService.getWorkloadSummary(tasks);
    res.json({ summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
