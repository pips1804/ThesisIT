import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";
import type { Manuscript } from "@/types";

export function useManuscript(manuscriptId: string | undefined) {
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [loading, setLoading] = useState(Boolean(manuscriptId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manuscriptId) {
      setManuscript(null);
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiJson<Manuscript>(`/api/manuscripts/${manuscriptId}`);
        setManuscript(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Manuscript not found");
        setManuscript(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [manuscriptId]);

  return { manuscript, loading, error, hasText: manuscript?.has_extracted_text ?? false };
}
