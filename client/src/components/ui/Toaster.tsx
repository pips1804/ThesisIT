import { X } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-lg border bg-card p-4 shadow-lg",
            t.variant === "success" && "border-green-200",
            t.variant === "error" && "border-destructive/40",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{t.title}</p>
            {t.description && (
              <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded p-1 hover:bg-muted"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
