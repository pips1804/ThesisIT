import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoTextBanner } from "@/components/manuscripts/NoTextBanner";
import { apiJson } from "@/lib/api";
import { useManuscript } from "@/hooks/useManuscript";
import { useToast } from "@/hooks/useToast";
import type { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";

const STARTERS = [
  "What is the main argument of my thesis?",
  "What methodology did I use and why?",
  "What are my key findings?",
  "What limitations should I be prepared to discuss?",
  "How does my literature review support my research questions?",
];

export function ChatPage() {
  const { manuscriptId } = useParams<{ manuscriptId: string }>();
  const { hasText, loading: msLoading, error: msError } = useManuscript(manuscriptId);
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!manuscriptId) return;
    void (async () => {
      try {
        const data = await apiJson<{ messages: ChatMessage[] }>(
          `/api/chat/history/${manuscriptId}`,
        );
        setMessages(data.messages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load chat");
      } finally {
        setLoading(false);
      }
    })();
  }, [manuscriptId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string) => {
    if (!manuscriptId || !text.trim() || sending) return;
    setSending(true);
    setError(null);
    setInput("");

    const optimistic: ChatMessage[] = [
      ...messages,
      { role: "user", content: text.trim() },
    ];
    setMessages(optimistic);

    try {
      const data = await apiJson<{ messages: ChatMessage[] }>("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          manuscriptId,
          message: text.trim(),
          history: messages,
        }),
      });
      setMessages(data.messages);
    } catch (err) {
      setMessages(messages);
      const msg = err instanceof Error ? err.message : "Failed to send message";
      setError(msg);
      toast({ title: "Message failed", description: msg, variant: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <AppLayout title="Chat with manuscript">
      {msError && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {msError}
        </p>
      )}
      {!msLoading && !hasText && <NoTextBanner />}
      <div className="flex h-[min(70svh,640px)] flex-col rounded-xl border bg-card sm:h-[calc(100svh-14rem)]">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {loading && <p className="text-sm text-muted-foreground">Loading chat…</p>}
          {!loading && messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ask anything about your thesis. Try a starter question:
              </p>
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    disabled={!hasText || sending}
                    className="rounded-full border bg-muted/50 px-3 py-1.5 text-left text-xs hover:bg-muted disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-lg px-4 py-2 text-sm",
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
          {sending && (
            <p className="text-sm text-muted-foreground">Assistant is thinking…</p>
          )}
          <div ref={bottomRef} />
        </div>
        {error && (
          <p className="border-t px-4 py-2 text-sm text-destructive">{error}</p>
        )}
        <form
          className="flex gap-2 border-t p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your thesis…"
            disabled={sending || !hasText}
          />
          <Button type="submit" disabled={sending || !input.trim() || !hasText}>
            Send
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
