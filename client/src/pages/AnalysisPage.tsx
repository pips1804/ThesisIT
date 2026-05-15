import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NoTextBanner } from "@/components/manuscripts/NoTextBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { apiJson } from "@/lib/api";
import { useManuscript } from "@/hooks/useManuscript";
import { useToast } from "@/hooks/useToast";
import type { AnalysisItem, AnalysisReport } from "@/types";

function severityVariant(severity?: string) {
  if (severity === "high") return "destructive" as const;
  if (severity === "medium") return "warning" as const;
  return "info" as const;
}

function groupByCategory(items: AnalysisItem[]) {
  return items.reduce<Record<string, AnalysisItem[]>>((acc, item) => {
    const key = item.category || "General";
    acc[key] = acc[key] ? [...acc[key], item] : [item];
    return acc;
  }, {});
}

function ItemCards({
  items,
  type,
}: {
  items: AnalysisItem[];
  type: "strength" | "weakness" | "recommendation";
}) {
  const grouped = groupByCategory(items);
  const border =
    type === "strength"
      ? "border-green-200 bg-green-50/50"
      : type === "weakness"
        ? "border-amber-200 bg-red-50/30"
        : "border-blue-200 bg-blue-50/40";

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, list]) => (
        <div key={category}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {category}
          </h3>
          <div className="grid gap-3">
            {list.map((item, i) => (
              <Card key={`${category}-${i}`} className={border}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    {item.severity && (
                      <Badge variant={severityVariant(item.severity)}>
                        {item.severity}
                      </Badge>
                    )}
                    {item.priority && (
                      <Badge variant={severityVariant(item.priority)}>
                        {item.priority}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalysisPage() {
  const { manuscriptId } = useParams<{ manuscriptId: string }>();
  const { hasText, loading: msLoading, error: msError } = useManuscript(manuscriptId);
  const { toast } = useToast();
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manuscriptId) return;
    void (async () => {
      try {
        const data = await apiJson<{ report: AnalysisReport | null }>(
          `/api/analysis/reports/${manuscriptId}`,
        );
        setReport(data.report);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    })();
  }, [manuscriptId]);

  const runAnalysis = async () => {
    if (!manuscriptId) return;
    setAnalyzing(true);
    setError(null);
    try {
      const data = await apiJson<{ report: AnalysisReport }>(
        `/api/analysis/analyze/${manuscriptId}`,
        { method: "POST" },
      );
      setReport(data.report);
      toast({
        title: "Analysis complete",
        description: "Your report is ready to review.",
        variant: "success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setError(msg);
      toast({ title: "Analysis failed", description: msg, variant: "error" });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <AppLayout title="Strengths & weaknesses">
      {msError && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {msError}
        </p>
      )}
      {!msLoading && !hasText && <NoTextBanner />}
      {(loading || msLoading) && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}
      {error && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {!loading && !msLoading && !report && !analyzing && (
        <Card>
          <CardHeader>
            <CardTitle>Analyze your manuscript</CardTitle>
            <CardDescription>
              Get AI feedback on strengths, weaknesses, and recommendations before your
              defense. This usually takes 10–20 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void runAnalysis()} disabled={!hasText}>
              Analyze manuscript
            </Button>
          </CardContent>
        </Card>
      )}
      {analyzing && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">Analyzing your thesis…</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This may take 10–20 seconds. Please keep this tab open.
            </p>
          </CardContent>
        </Card>
      )}
      {report && !analyzing && (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Overall summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {report.overall_summary}
              </p>
            </CardContent>
          </Card>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-green-800">Strengths</h2>
            <ItemCards items={report.strengths} type="strength" />
          </section>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-red-800">Weaknesses</h2>
            <ItemCards items={report.weaknesses} type="weakness" />
          </section>
          <section>
            <h2 className="mb-4 text-lg font-semibold text-blue-800">Recommendations</h2>
            <ItemCards items={report.recommendations} type="recommendation" />
          </section>
        </div>
      )}
    </AppLayout>
  );
}
