import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ManuscriptUpload } from "@/components/manuscripts/ManuscriptUpload";
import { ManuscriptCard } from "@/components/manuscripts/ManuscriptCard";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, apiJson } from "@/lib/api";
import type { Manuscript } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

export function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiJson<Manuscript[]>("/api/manuscripts");
      setManuscripts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manuscripts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this manuscript? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/manuscripts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setManuscripts((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Manuscript deleted", variant: "success" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      toast({ title: "Delete failed", description: msg, variant: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    "there";

  return (
    <AppLayout title={`Welcome, ${displayName}`}>
      <section className="mb-10">
        <h2 className="mb-3 text-lg font-medium">Upload thesis</h2>
        <ManuscriptUpload
          onUploaded={(m) => setManuscripts((prev) => [m, ...prev])}
        />
      </section>

      <section>
        <h2 className="mb-4 text-lg font-medium">Your manuscripts</h2>
        {error && (
          <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : manuscripts.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
            <p className="font-medium">No manuscripts yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload your thesis PDF above to unlock analysis, chat, mock defense, and
              panelist revision tools.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {manuscripts.map((m) => (
              <ManuscriptCard
                key={m.id}
                manuscript={m}
                onDelete={handleDelete}
                deleting={deletingId === m.id}
              />
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
