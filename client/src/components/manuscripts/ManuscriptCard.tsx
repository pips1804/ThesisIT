import { Link } from "react-router-dom";
import { FileText, Trash2 } from "lucide-react";
import type { Manuscript } from "@/types";
import { formatDate, formatFileSize } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ManuscriptCard({
  manuscript,
  onDelete,
  deleting,
}: {
  manuscript: Manuscript;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <CardTitle className="text-base leading-snug">{manuscript.title}</CardTitle>
              <CardDescription className="mt-1">
                {formatDate(manuscript.created_at)} · {formatFileSize(manuscript.file_size_bytes)}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={deleting}
            onClick={() => onDelete(manuscript.id)}
            aria-label="Delete manuscript"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
        {!manuscript.has_extracted_text && (
          <p className="text-xs text-amber-700">
            Text extraction failed — AI features may not work until you re-upload.
          </p>
        )}
      </CardHeader>
      <CardContent className="mt-auto grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/mock-defense/${manuscript.id}`}>Mock Defense</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/analysis/${manuscript.id}`}>Analysis</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/chat/${manuscript.id}`}>Chat</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/recommendations/${manuscript.id}`}>Panelist Recs</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
