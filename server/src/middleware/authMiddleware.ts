import type { NextFunction, Request, Response } from "express";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "../lib/supabase.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization token" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  if (!token) {
    res.status(401).json({ error: "Missing or invalid authorization token" });
    return;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = user;
  next();
}
