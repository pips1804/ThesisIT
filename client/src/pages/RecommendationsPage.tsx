import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NoTextBanner } from "@/components/manuscripts/NoTextBanner";
import { apiJson } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useManuscript } from "@/hooks/useManuscript";
import { useToast } from "@/hooks/useToast";
import type { PanelistRevision, RevisionSection } from "@/types";
import { cn } from "@/lib/utils";

function RevisionCard({
  section,
  onCopy,
}: {
  section: RevisionSection;
  onCopy: (text: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{section.section_name}</CardTitle>
        <CardDescription className="italic">
          &ldquo;{section.panelist_comment}&rdquo;
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Original
          </p>
          <p className="rounded-md bg-muted p-3 text-sm">{section.original_text}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Revised
          </p>
          <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
            {section.revised_text}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{section.explanation}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onCopy(section.revised_text)}
        >
          Copy revised text
        </Button>
      </CardContent>
    </Card>
  );
}

export function RecommendationsPage() {
  const { manuscriptId } = useParams<{ manuscriptId: string }>();
  const { hasText, loading: msLoading, error: msError } = useManuscript(manuscriptId);
  const { toast } = useToast();
  const [comments, setComments] = useState("");
  const [history, setHistory] = useState<PanelistRevision[]>([]);
  const [active, setActive] = useState<PanelistRevision | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manuscriptId) return;
    void (async () => {
      try {
        const data = await apiJson<{ history: PanelistRevision[] }>(
          `/api/recommendations/history/${manuscriptId}`,
        );
        setHistory(data.history);
        if (data.history[0]) setActive(data.history[0]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    })();
  }, [manuscriptId]);

  const generate = async () => {
    if (!manuscriptId || !comments.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const data = await apiJson<{ revision: PanelistRevision }>(
        "/api/recommendations/revise",
        {
          method: "POST",
          body: JSON.stringify({ manuscriptId, panelistComments: comments }),
        },
      );
      setActive(data.revision);
      setHistory((prev) => [data.revision, ...prev]);
      toast({
        title: "Revisions generated",
        description: `${data.revision.revised_sections.length} section(s) updated.`,
        variant: "success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      toast({ title: "Generation failed", description: msg, variant: "error" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppLayout title="Panelist recommendations">
      {msError && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {msError}
        </p>
      )}
      {!msLoading && !hasText && <NoTextBanner />}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_1fr]">
        <aside>
          <h2 className="mb-3 text-sm font-semibold">History</h2>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No revisions yet.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActive(item)}
                    className={cn(
                      "w-full rounded-md border px-3 py-2 text-left text-xs hover:bg-muted",
                      active?.id === item.id && "border-primary bg-primary/5",
                    )}
                  >
                    {formatDate(item.created_at)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paste panelist comments</CardTitle>
              <CardDescription>
                Paste one or more comments from your defense panel. The AI will suggest
                section-by-section rewrites. This takes about 20–30 seconds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="e.g. Strengthen the methodology section. Clarify how your sample was selected. The literature review needs more recent sources on…"
                rows={8}
              />
              <Button
                onClick={() => void generate()}
                disabled={generating || !comments.trim() || !hasText}
              >
                {generating ? "Generating revisions…" : "Generate revisions"}
              </Button>
              {generating && (
                <p className="text-sm text-muted-foreground">
                  This takes about 20–30 seconds. Please keep this tab open.
                </p>
              )}
            </CardContent>
          </Card>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {active && active.revised_sections.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Suggested revisions</h2>
              {active.revised_sections.map((section, i) => (
                <RevisionCard
                  key={i}
                  section={section}
                  onCopy={async (text) => {
                    await navigator.clipboard.writeText(text);
                    toast({ title: "Copied to clipboard", variant: "success" });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
