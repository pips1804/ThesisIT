import { Router } from "express";
import { generateJson, truncateManuscriptText } from "../lib/gemini.js";
import {
  getManuscriptForUser,
  manuscriptHasText,
} from "../lib/manuscriptAccess.js";
import { supabaseAdmin } from "../lib/supabase.js";

type AnalysisItem = {
  category: string;
  title: string;
  description: string;
  severity?: "high" | "medium" | "low";
  priority?: "high" | "medium" | "low";
};

type AnalysisResult = {
  overall_summary: string;
  strengths: AnalysisItem[];
  weaknesses: AnalysisItem[];
  recommendations: AnalysisItem[];
};

export const analysisRouter = Router();

analysisRouter.get("/reports/:manuscriptId", async (req, res) => {
  const userId = req.user!.id;
  const manuscript = await getManuscriptForUser(req.params.manuscriptId, userId);

  if (!manuscript) {
    res.status(404).json({ error: "Manuscript not found" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("analysis_reports")
    .select("*")
    .eq("manuscript_id", manuscript.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: "Failed to load report" });
    return;
  }

  if (!data) {
    res.json({ report: null });
    return;
  }

  res.json({ report: data });
});

analysisRouter.post("/analyze/:manuscriptId", async (req, res) => {
  const userId = req.user!.id;
  const manuscript = await getManuscriptForUser(req.params.manuscriptId, userId);

  if (!manuscript) {
    res.status(404).json({ error: "Manuscript not found" });
    return;
  }

  if (!manuscriptHasText(manuscript)) {
    res.status(400).json({
      error:
        "No text could be extracted from this PDF. Try re-uploading a text-based PDF.",
    });
    return;
  }

  try {
    const text = truncateManuscriptText(manuscript.extracted_text);
    const prompt = `You are an expert thesis defense coach. Analyze this thesis manuscript and return JSON only.

Required JSON shape:
{
  "overall_summary": "string (2-3 paragraphs)",
  "strengths": [{ "category": "string", "title": "string", "description": "string" }],
  "weaknesses": [{ "category": "string", "title": "string", "description": "string", "severity": "high"|"medium"|"low" }],
  "recommendations": [{ "category": "string", "title": "string", "description": "string", "priority": "high"|"medium"|"low" }]
}

Provide at least 4 strengths, 6 weaknesses, and 5 recommendations.
Group items by category (e.g. Methodology, Literature Review, Results, Discussion, Writing Quality).

MANUSCRIPT:
${text}`;

    const result = await generateJson<AnalysisResult>(prompt);

    const { data, error } = await supabaseAdmin
      .from("analysis_reports")
      .insert({
        manuscript_id: manuscript.id,
        user_id: userId,
        overall_summary: result.overall_summary,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
      })
      .select("*")
      .single();

    if (error) {
      res.status(500).json({ error: "Failed to save analysis report" });
      return;
    }

    res.status(201).json({ report: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Analysis failed",
    });
  }
});
