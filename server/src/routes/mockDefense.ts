import { Router } from "express";
import { generateText, truncateManuscriptText } from "../lib/gemini.js";
import {
  getManuscriptForUser,
  manuscriptHasText,
} from "../lib/manuscriptAccess.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { LIMITS, requireNonEmptyString, requireUuid } from "../lib/validation.js";

type DefenseMessage = { role: "examiner" | "student"; content: string };

function buildSystemPrompt(manuscriptText: string, exchangeCount: number): string {
  return `You are a strict academic panel examiner conducting a mock thesis defense.

Rules:
- Ask ONE challenging question at a time about the student's thesis.
- Vary topics: methodology, literature review, theoretical framework, results, limitations, contributions.
- After each student answer, briefly evaluate it (1-2 sentences), then ask the next question.
- This is exchange ${exchangeCount} of the session. After 8-10 student answers total, end the session by giving a final score from 1-10 and a written summary. Prefix the final message with exactly "SESSION_COMPLETE:".
- Stay in character. Reference the actual thesis content.

THESIS MANUSCRIPT:
${manuscriptText}`;
}

function parseSessionEnd(reply: string): {
  completed: boolean;
  score: number | null;
  summary: string | null;
  displayReply: string;
} {
  if (!reply.includes("SESSION_COMPLETE:")) {
    return { completed: false, score: null, summary: null, displayReply: reply };
  }

  const body = reply.replace("SESSION_COMPLETE:", "").trim();
  const scoreMatch = body.match(/(?:score|rating)[:\s]*(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/i);
  const score = scoreMatch ? Number(scoreMatch[1]) : null;

  return {
    completed: true,
    score,
    summary: body,
    displayReply: body,
  };
}

export const mockDefenseRouter = Router();

mockDefenseRouter.get("/sessions/:manuscriptId", async (req, res) => {
  const userId = req.user!.id;
  const manuscript = await getManuscriptForUser(req.params.manuscriptId, userId);

  if (!manuscript) {
    res.status(404).json({ error: "Manuscript not found" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("defense_sessions")
    .select("id, score, summary, completed, created_at, updated_at")
    .eq("manuscript_id", manuscript.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Failed to load sessions" });
    return;
  }

  res.json({ sessions: data ?? [] });
});

mockDefenseRouter.post("/message", async (req, res) => {
  const userId = req.user!.id;
  const { manuscriptId, sessionId, answer } = req.body as {
    manuscriptId?: string;
    sessionId?: string;
    answer?: string;
  };

  if (!requireUuid(res, manuscriptId, "manuscriptId")) return;

  const manuscript = await getManuscriptForUser(manuscriptId!, userId);

  if (!manuscript) {
    res.status(404).json({ error: "Manuscript not found" });
    return;
  }

  if (!manuscriptHasText(manuscript)) {
    res.status(400).json({ error: "No extracted text available for this manuscript" });
    return;
  }

  const text = truncateManuscriptText(manuscript.extracted_text);

  try {
    if (!sessionId) {
      const systemInstruction = buildSystemPrompt(text, 1);
      const opening = await generateText(systemInstruction, [
        { role: "user", text: "Begin the mock defense. Ask your first examiner question only." },
      ]);

      const messages: DefenseMessage[] = [
        { role: "examiner", content: opening },
      ];

      const { data, error } = await supabaseAdmin
        .from("defense_sessions")
        .insert({
          manuscript_id: manuscript.id,
          user_id: userId,
          messages,
          completed: false,
        })
        .select("*")
        .single();

      if (error) {
        res.status(500).json({ error: "Failed to create defense session" });
        return;
      }

      res.status(201).json({
        sessionId: data.id,
        reply: opening,
        messages,
        completed: false,
        score: null,
        summary: null,
      });
      return;
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("defense_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .eq("manuscript_id", manuscript.id)
      .maybeSingle();

    if (sessionError || !session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (session.completed) {
      res.status(400).json({ error: "This defense session is already completed" });
      return;
    }

    if (!requireNonEmptyString(res, answer, "answer", LIMITS.defenseAnswer)) return;

    const prior = (session.messages as DefenseMessage[]) ?? [];
    const studentCount = prior.filter((m) => m.role === "student").length + 1;

    const geminiMessages = prior.flatMap((m) => [
      {
        role: (m.role === "examiner" ? "model" : "user") as "user" | "model",
        text: m.content,
      },
    ]);

    geminiMessages.push({ role: "user", text: answer.trim() });

    const systemInstruction = buildSystemPrompt(text, studentCount);
    const rawReply = await generateText(systemInstruction, geminiMessages);
    const parsed = parseSessionEnd(rawReply);

    const messages: DefenseMessage[] = [
      ...prior,
      { role: "student", content: answer.trim() },
      { role: "examiner", content: parsed.displayReply },
    ];

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("defense_sessions")
      .update({
        messages,
        completed: parsed.completed,
        score: parsed.score,
        summary: parsed.summary,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .select("*")
      .single();

    if (updateError) {
      res.status(500).json({ error: "Failed to update session" });
      return;
    }

    res.json({
      sessionId: updated.id,
      reply: parsed.displayReply,
      messages: updated.messages,
      completed: updated.completed,
      score: updated.score,
      summary: updated.summary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Mock defense request failed",
    });
  }
});
