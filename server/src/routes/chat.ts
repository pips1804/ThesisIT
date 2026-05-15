import { Router } from "express";
import { generateText, truncateManuscriptText } from "../lib/gemini.js";
import {
  getManuscriptForUser,
  manuscriptHasText,
} from "../lib/manuscriptAccess.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { LIMITS, requireNonEmptyString, requireUuid } from "../lib/validation.js";

type ChatMessage = { role: "user" | "assistant"; content: string };

export const chatRouter = Router();

chatRouter.get("/history/:manuscriptId", async (req, res) => {
  const userId = req.user!.id;
  const manuscript = await getManuscriptForUser(req.params.manuscriptId, userId);

  if (!manuscript) {
    res.status(404).json({ error: "Manuscript not found" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("chat_history")
    .select("messages")
    .eq("manuscript_id", manuscript.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: "Failed to load chat history" });
    return;
  }

  res.json({ messages: (data?.messages as ChatMessage[]) ?? [] });
});

chatRouter.post("/message", async (req, res) => {
  const userId = req.user!.id;
  const { manuscriptId, message, history = [] } = req.body as {
    manuscriptId?: string;
    message?: string;
    history?: ChatMessage[];
  };

  if (!requireUuid(res, manuscriptId, "manuscriptId")) return;
  if (!requireNonEmptyString(res, message, "message", LIMITS.chatMessage)) return;

  const manuscript = await getManuscriptForUser(manuscriptId!, userId);

  if (!manuscript) {
    res.status(404).json({ error: "Manuscript not found" });
    return;
  }

  if (!manuscriptHasText(manuscript)) {
    res.status(400).json({ error: "No extracted text available for this manuscript" });
    return;
  }

  try {
    const text = truncateManuscriptText(manuscript.extracted_text);
    const systemInstruction = `You are a thesis study assistant. Answer ONLY using the manuscript below. If the answer is not in the manuscript, say so clearly.
Reference specific sections or passages when possible (e.g. "In your Methodology section...").

MANUSCRIPT:
${text}`;

    const prior = (history as ChatMessage[]).map((m) => ({
      role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
      text: m.content,
    }));

    const reply = await generateText(systemInstruction, [
      ...prior,
      { role: "user", text: message.trim() },
    ]);

    const updatedMessages: ChatMessage[] = [
      ...(history as ChatMessage[]),
      { role: "user", content: message.trim() },
      { role: "assistant", content: reply },
    ];

    const { error: upsertError } = await supabaseAdmin.from("chat_history").upsert(
      {
        manuscript_id: manuscript.id,
        user_id: userId,
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "manuscript_id,user_id" },
    );

    if (upsertError) {
      res.status(500).json({ error: "Failed to save chat history" });
      return;
    }

    res.json({ reply, messages: updatedMessages });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Chat request failed",
    });
  }
});
