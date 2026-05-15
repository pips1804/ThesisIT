import { supabaseAdmin } from "./supabase.js";

export type ManuscriptRow = {
  id: string;
  user_id: string;
  title: string;
  filename: string;
  storage_path: string;
  extracted_text: string;
  file_size_bytes: number;
  created_at: string;
};

export async function getManuscriptForUser(
  manuscriptId: string,
  userId: string,
): Promise<ManuscriptRow | null> {
  const { data, error } = await supabaseAdmin
    .from("manuscripts")
    .select("*")
    .eq("id", manuscriptId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getManuscriptForUser", error);
    return null;
  }

  return data as ManuscriptRow | null;
}

export function manuscriptHasText(manuscript: ManuscriptRow): boolean {
  return Boolean(manuscript.extracted_text?.trim());
}
