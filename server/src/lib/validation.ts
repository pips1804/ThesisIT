import type { Response } from "express";

const LIMITS = {
  chatMessage: 4000,
  panelistComments: 20_000,
  defenseAnswer: 8000,
} as const;

export function badRequest(res: Response, message: string): true {
  res.status(400).json({ error: message });
  return true;
}

export function requireUuid(
  res: Response,
  value: unknown,
  fieldName: string,
): value is string {
  if (typeof value !== "string" || !value.trim()) {
    badRequest(res, `${fieldName} is required`);
    return false;
  }
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(value)) {
    badRequest(res, `${fieldName} must be a valid ID`);
    return false;
  }
  return true;
}

export function requireNonEmptyString(
  res: Response,
  value: unknown,
  fieldName: string,
  maxLength?: number,
): value is string {
  if (typeof value !== "string" || !value.trim()) {
    badRequest(res, `${fieldName} is required`);
    return false;
  }
  if (maxLength && value.length > maxLength) {
    badRequest(res, `${fieldName} must be at most ${maxLength} characters`);
    return false;
  }
  return true;
}

export { LIMITS };
