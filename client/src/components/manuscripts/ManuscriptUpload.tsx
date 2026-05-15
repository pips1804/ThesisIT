import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { apiUpload } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import type { Manuscript } from "@/types";
import { cn } from "@/lib/utils";

const MAX_BYTES = 20 * 1024 * 1024;

export function ManuscriptUpload({
  onUploaded,
}: {
  onUploaded: (manuscript: Manuscript) => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.type !== "application/pdf") {
        const msg = "Only PDF files are allowed.";
        setError(msg);
        toast({ title: "Upload failed", description: msg, variant: "error" });
        return;
      }
      if (file.size > MAX_BYTES) {
        const msg = "File must be under 20MB.";
        setError(msg);
        toast({ title: "Upload failed", description: msg, variant: "error" });
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      setProgress(0);

      try {
        const manuscript = await apiUpload<Manuscript>(
          "/api/manuscripts/upload",
          formData,
          setProgress,
        );
        onUploaded(manuscript);
        toast({
          title: "Upload complete",
          description: `"${manuscript.title}" is ready.`,
          variant: "success",
        });
        if (!manuscript.has_extracted_text) {
          toast({
            title: "Text extraction issue",
            description:
              "We could not read text from this PDF. AI features may not work until you upload a text-based PDF.",
            variant: "error",
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setError(msg);
        toast({ title: "Upload failed", description: msg, variant: "error" });
      } finally {
        setProgress(null);
      }
    },
    [onUploaded, toast],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void uploadFile(file);
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors sm:py-12",
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50",
        )}
      >
        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-center text-sm font-medium">
          Drag and drop your thesis PDF here
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          or click to browse · PDF only · max 20MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {progress !== null && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
        </div>
      )}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
