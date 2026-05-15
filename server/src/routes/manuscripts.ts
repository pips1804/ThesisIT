import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { supabaseAdmin } from "../lib/supabase.js";
import { extractPdfText } from "../lib/pdf.js";
import { getManuscriptForUser } from "../lib/manuscriptAccess.js";

const MAX_BYTES = 20 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const manuscriptsRouter = Router();

manuscriptsRouter.get("/", async (req, res) => {
  const userId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from("manuscripts")
    .select(
      "id, title, filename, file_size_bytes, created_at, extracted_text",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: "Failed to load manuscripts" });
    return;
  }

  res.json(
    (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      filename: row.filename,
      file_size_bytes: row.file_size_bytes,
      created_at: row.created_at,
      has_extracted_text: Boolean(row.extracted_text?.trim()),
    })),
  );
});

manuscriptsRouter.get("/:id", async (req, res) => {
  const manuscript = await getManuscriptForUser(req.params.id, req.user!.id);

  if (!manuscript) {
    res.status(404).json({ error: "Manuscript not found" });
    return;
  }

  res.json({
    id: manuscript.id,
    title: manuscript.title,
    filename: manuscript.filename,
    file_size_bytes: manuscript.file_size_bytes,
    created_at: manuscript.created_at,
    has_extracted_text: Boolean(manuscript.extracted_text?.trim()),
  });
});

manuscriptsRouter.post(
  "/upload",
  upload.single("file"),
  async (req, res) => {
    const userId = req.user!.id;

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    try {
      const extractedText = await extractPdfText(req.file.buffer);
      const manuscriptId = randomUUID();
      const safeName = req.file.originalname.replace(/[^\w.\-() ]/g, "_");
      const storagePath = `${userId}/${manuscriptId}-${safeName}`;
      const title = safeName.replace(/\.pdf$/i, "") || "Untitled thesis";

      const { error: storageError } = await supabaseAdmin.storage
        .from("manuscripts")
        .upload(storagePath, req.file.buffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (storageError) {
        console.error(storageError);
        res.status(500).json({ error: "Failed to store PDF file" });
        return;
      }

      const { data, error: dbError } = await supabaseAdmin
        .from("manuscripts")
        .insert({
          id: manuscriptId,
          user_id: userId,
          title,
          filename: safeName,
          storage_path: storagePath,
          extracted_text: extractedText,
          file_size_bytes: req.file.size,
        })
        .select(
          "id, title, filename, file_size_bytes, created_at, extracted_text",
        )
        .single();

      if (dbError) {
        await supabaseAdmin.storage.from("manuscripts").remove([storagePath]);
        res.status(500).json({ error: "Failed to save manuscript record" });
        return;
      }

      res.status(201).json({
        id: data.id,
        title: data.title,
        filename: data.filename,
        file_size_bytes: data.file_size_bytes,
        created_at: data.created_at,
        has_extracted_text: Boolean(data.extracted_text?.trim()),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error:
          err instanceof Error ? err.message : "Failed to process PDF upload",
      });
    }
  },
);

manuscriptsRouter.delete("/:id", async (req, res) => {
  const userId = req.user!.id;
  const manuscript = await getManuscriptForUser(req.params.id, userId);

  if (!manuscript) {
    res.status(404).json({ error: "Manuscript not found" });
    return;
  }

  await supabaseAdmin.storage
    .from("manuscripts")
    .remove([manuscript.storage_path]);

  const { error } = await supabaseAdmin
    .from("manuscripts")
    .delete()
    .eq("id", manuscript.id)
    .eq("user_id", userId);

  if (error) {
    res.status(500).json({ error: "Failed to delete manuscript" });
    return;
  }

  res.status(204).send();
});
