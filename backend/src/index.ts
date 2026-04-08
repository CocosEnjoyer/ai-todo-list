import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import taskRoutes from "./routes/tasks";
import llmRoutes from "./routes/llm";
import subtasksRoutes from "./routes/subtasks";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Versioning - v1
const API_VERSION = "/api/v1";

// Routes with versioning
app.use(`${API_VERSION}/tasks`, taskRoutes);
app.use(`${API_VERSION}/llm`, llmRoutes);
app.use(`${API_VERSION}/subtasks`, subtasksRoutes);

// Legacy routes (backward compatibility)
app.use("/api/tasks", taskRoutes);
app.use("/api/llm", llmRoutes);
app.use("/api/subtasks", subtasksRoutes);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Health check with version info
app.get(`${API_VERSION}/health`, (req: Request, res: Response) => {
  res.json({
    status: "OK",
    message: "Server is running",
    version: "v1",
    endpoints: {
      tasks: `${API_VERSION}/tasks`,
      llm: `${API_VERSION}/llm`,
      subtasks: `${API_VERSION}/subtasks`,
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📋 Tasks API v1: http://localhost:${PORT}/api/v1/tasks`);
  console.log(`🤖 LLM API v1: http://localhost:${PORT}/api/v1/llm`);
  console.log(`📌 Legacy API: http://localhost:${PORT}/api/tasks`);
});
