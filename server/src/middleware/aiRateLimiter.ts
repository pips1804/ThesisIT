import rateLimit from "express-rate-limit";

export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "anonymous",
  message: {
    error:
      "Too many AI requests. Please wait 15 minutes before trying again.",
  },
});
