import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/subtasks/task/:taskId - получить все подзадачи задачи
router.get("/task/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const subtasks = await prisma.subtask.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
    });
    res.json(subtasks);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/subtasks/task/:taskId - создать подзадачи
router.post("/task/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { subtasks } = req.body;

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    const createdSubtasks = await Promise.all(
      subtasks.map((subtask: { title: string }) =>
        prisma.subtask.create({
          data: {
            title: subtask.title,
            taskId: taskId,
          },
        }),
      ),
    );

    res.status(201).json(createdSubtasks);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// PUT /api/subtasks/:subtaskId - обновить подзадачу
router.put("/:subtaskId", async (req: Request, res: Response) => {
  try {
    const { subtaskId } = req.params;
    const { completed } = req.body;

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: { completed },
    });

    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// DELETE /api/subtasks/:subtaskId - удалить подзадачу
router.delete("/:subtaskId", async (req: Request, res: Response) => {
  try {
    const { subtaskId } = req.params;
    await prisma.subtask.delete({ where: { id: subtaskId } });
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
