import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { apiRouter } from "./routes/api.js";

const app = express();
const port = Number(process.env.PORT) || 3001;

function parseOrigins(): string | string[] {
  const raw =
    process.env.CLIENT_ORIGIN ?? process.env.CLIENT_ORIGINS ?? "http://localhost:5173";
  const list = raw.split(",").map((o) => o.trim()).filter(Boolean);
  return list.length <= 1 ? (list[0] ?? "http://localhost:5173") : list;
}

app.use(
  cors({
    origin: parseOrigins(),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "DefenseReady API",
    message: "API is running. Open the React frontend to use the app.",
    routes: ["/health", "/api/me", "/api/manuscripts"],
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ error: "File must be under 20MB" });
    return;
  }
  if (err.message === "Only PDF files are allowed") {
    res.status(400).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`DefenseReady API listening on http://localhost:${port}`);
});
