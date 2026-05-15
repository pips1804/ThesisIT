import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { manuscriptsRouter } from "./manuscripts.js";
import { analysisRouter } from "./analysis.js";
import { chatRouter } from "./chat.js";
import { mockDefenseRouter } from "./mockDefense.js";
import { recommendationsRouter } from "./recommendations.js";
import { aiRateLimiter } from "../middleware/aiRateLimiter.js";

export const apiRouter = Router();

apiRouter.use(authMiddleware);

apiRouter.get("/me", (req, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    full_name: req.user!.user_metadata?.full_name ?? null,
  });
});

apiRouter.use("/manuscripts", manuscriptsRouter);
apiRouter.use("/analysis", aiRateLimiter, analysisRouter);
apiRouter.use("/chat", aiRateLimiter, chatRouter);
apiRouter.use("/mock-defense", aiRateLimiter, mockDefenseRouter);
apiRouter.use("/recommendations", aiRateLimiter, recommendationsRouter);
