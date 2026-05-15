import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { DefenseMessage, DefenseSessionSummary } from "@/types";
import { cn } from "@/lib/utils";

export function MockDefensePage() {
  const { manuscriptId } = useParams<{ manuscriptId: string }>();
  const { hasText, loading: msLoading, error: msError } = useManuscript(manuscriptId);
  const { toast } = useToast();
  const [sessions, setSessions] = useState<DefenseSessionSummary[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DefenseMessage[]>([]);
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!manuscriptId) return;
    void (async () => {
      try {
        const data = await apiJson<{ sessions: DefenseSessionSummary[] }>(
          `/api/mock-defense/sessions/${manuscriptId}`,
        );
        setSessions(data.sessions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    })();
  }, [manuscriptId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const startSession = async () => {
    if (!manuscriptId) return;
    setSending(true);
    setError(null);
    try {
      const data = await apiJson<{
        sessionId: string;
        messages: DefenseMessage[];
        completed: boolean;
        score: number | null;
        summary: string | null;
      }>("/api/mock-defense/message", {
        method: "POST",
        body: JSON.stringify({ manuscriptId }),
      });
      setSessionId(data.sessionId);
      setMessages(data.messages);
      setCompleted(data.completed);
      setScore(data.score);
      setSummary(data.summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start session";
      setError(msg);
      toast({ title: "Could not start", description: msg, variant: "error" });
    } finally {
      setSending(false);
    }
  };

  const submitAnswer = async () => {
    if (!manuscriptId || !sessionId || !answer.trim() || sending) return;
    setSending(true);
    setError(null);
    const text = answer.trim();
    setAnswer("");

    try {
      const data = await apiJson<{
        messages: DefenseMessage[];
        completed: boolean;
        score: number | null;
        summary: string | null;
      }>("/api/mock-defense/message", {
        method: "POST",
        body: JSON.stringify({ manuscriptId, sessionId, answer: text }),
      });
      setMessages(data.messages);
      setCompleted(data.completed);
      setScore(data.score);
      setSummary(data.summary);
      if (data.completed) {
        toast({
          title: "Mock defense complete",
          description:
            data.score != null ? `Your score: ${data.score}/10` : "See your summary below.",
          variant: "success",
        });
        const list = await apiJson<{ sessions: DefenseSessionSummary[] }>(
          `/api/mock-defense/sessions/${manuscriptId}`,
        );
        setSessions(list.sessions);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send answer";
      setError(msg);
      toast({ title: "Request failed", description: msg, variant: "error" });
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setSessionId(null);
    setMessages([]);
    setCompleted(false);
    setScore(null);
    setSummary(null);
    setAnswer("");
  };

  return (
    <AppLayout title="Mock defense">
      {msError && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {msError}
        </p>
      )}
      {!msLoading && !hasText && <NoTextBanner />}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,240px)_1fr]">
        <aside className="space-y-3">
          <h2 className="text-sm font-semibold">Past sessions</h2>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No sessions yet.</p>
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="rounded-md border bg-card px-3 py-2 text-xs"
                >
                  <p>{formatDate(s.created_at)}</p>
                  <p className="font-medium">
                    {s.completed && s.score != null
                      ? `Score: ${s.score}/10`
                      : s.completed
                        ? "Completed"
                        : "In progress"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="space-y-4">
          {!sessionId && (
            <Card>
              <CardHeader>
                <CardTitle>Start mock defense</CardTitle>
                <CardDescription>
                  A strict AI panel examiner will ask challenging questions about your
                  thesis one at a time. After 8–10 answers you will receive a score and
                  summary.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => void startSession()} disabled={sending || !hasText}>
                  {sending ? "Starting…" : "Start mock defense"}
                </Button>
              </CardContent>
            </Card>
          )}

          {sessionId && (
            <div className="flex h-[calc(100svh-14rem)] flex-col rounded-xl border bg-card">
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "max-w-[90%] rounded-lg px-4 py-3 text-sm",
                      m.role === "examiner"
                        ? "border-l-4 border-primary bg-muted"
                        : "ml-auto bg-primary/10",
                    )}
                  >
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                      {m.role === "examiner" ? "Examiner" : "You"}
                    </p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
                {sending && (
                  <p className="text-sm text-muted-foreground">Examiner is thinking…</p>
                )}
                <div ref={bottomRef} />
              </div>

              {completed && (
                <Card className="m-4 border-primary/30 bg-primary/5">
                  <CardHeader>
                    <CardTitle>
                      Session complete{score != null ? ` — ${score}/10` : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {summary && (
                      <p className="whitespace-pre-wrap text-sm">{summary}</p>
                    )}
                    <Button onClick={reset}>Try again</Button>
                  </CardContent>
                </Card>
              )}

              {!completed && (
                <form
                  className="flex gap-2 border-t p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitAnswer();
                  }}
                >
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer…"
                    disabled={sending}
                  />
                  <Button type="submit" disabled={sending || !answer.trim()}>
                    Submit
                  </Button>
                </form>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
