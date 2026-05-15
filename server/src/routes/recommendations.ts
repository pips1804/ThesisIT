import { Router } from "express";
import { generateJson, truncateManuscriptText } from "../lib/gemini.js";
import {
  getManuscriptForUser,
  manuscriptHasText,
} from "../lib/manuscriptAccess.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { LIMITS, requireNonEmptyString, requireUuid } from "../lib/validation.js";

type RevisionSection = {
  panelist_comment: string;
  section_name: string;
  original_text: string;
  revised_text: string;
  explanation: string;
};

type RevisionResult = {
  revisions: RevisionSection[];
};

export const recommendationsRouter = Router();

recommendationsRouter.get("/history/:manuscriptId", async (req, res) => {
  const userId = req.user!.id;
  const manuscript = await getManuscriptForUser(req.params.manuscriptId, userId);

  if (!manuscript) {
    res.status(404).json({ error: "Manuscript not found" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("panelist_revisions")
    .select("id, panelist_comments, revised_sections, created_at")
    .eq("manuscript_id", manuscript.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Failed to load revision history" });
    return;
  }

  res.json({ history: data ?? [] });
});

recommendationsRouter.post("/revise", async (req, res) => {
  const userId = req.user!.id;
  const { manuscriptId, panelistComments } = req.body as {
    manuscriptId?: string;
    panelistComments?: string;
  };

  if (!requireUuid(res, manuscriptId, "manuscriptId")) return;
  if (
    !requireNonEmptyString(
      res,
      panelistComments,
      "panelistComments",
      LIMITS.panelistComments,
    )
  ) {
    return;
  }

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
    const prompt = `You help students revise their thesis based on panelist feedback.

Given the panelist comments and manuscript text, return JSON only:
{
  "revisions": [
    {
      "panelist_comment": "the specific comment addressed",
      "section_name": "section of thesis",
      "original_text": "quote from manuscript being revised",
      "revised_text": "improved version addressing the comment",
      "explanation": "why changes were made"
    }
  ]
}

Provide at least 2 revisions when possible. Use exact or paraphrased quotes for original_text.

PANELIST COMMENTS:
${panelistComments.trim()}

MANUSCRIPT:
${text}`;

    const result = await generateJson<RevisionResult>(prompt);

    const { data, error } = await supabaseAdmin
      .from("panelist_revisions")
      .insert({
        manuscript_id: manuscript.id,
        user_id: userId,
        panelist_comments: panelistComments.trim(),
        revised_sections: result.revisions,
      })
      .select("*")
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to save revisions" });
      return;
    }

    res.status(201).json({ revision: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Revision generation failed",
    });
  }
});
