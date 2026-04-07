import { NextResponse } from "next/server";
import { runTechnicalAudit } from "@/lib/technical-audit";
import type { TechnicalAuditResult } from "@/lib/studio-types";

const MAX_URLS = 10;

type AssessmentResult =
  | (TechnicalAuditResult & { _failed?: never })
  | { url: string; error: string; _failed: true };

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function countIssues(result: TechnicalAuditResult): number {
  return (
    result.insights.technicalSeo.length +
    result.insights.pagePerformance.length +
    result.insights.contentQuality.length
  );
}

function collectIssueLabels(result: TechnicalAuditResult): string[] {
  const labels: string[] = [];
  for (const issue of result.insights.technicalSeo) labels.push(issue.title);
  for (const issue of result.insights.pagePerformance) labels.push(issue.title);
  for (const issue of result.insights.contentQuality) labels.push(issue.title);
  return labels;
}

function findCommonIssues(results: TechnicalAuditResult[]): string[] {
  if (results.length < 2) return [];

  const frequency = new Map<string, number>();
  for (const result of results) {
    const labels = new Set(collectIssueLabels(result));
    for (const label of labels) {
      frequency.set(label, (frequency.get(label) ?? 0) + 1);
    }
  }

  return Array.from(frequency.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { urls?: unknown };

    if (!Array.isArray(payload.urls) || payload.urls.length === 0) {
      return NextResponse.json(
        { error: "Provide a non-empty array of URLs in the request body." },
        { status: 400 }
      );
    }

    if (payload.urls.length > MAX_URLS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_URLS} URLs allowed per request.` },
        { status: 400 }
      );
    }

    const urls: string[] = [];
    for (const entry of payload.urls) {
      if (typeof entry !== "string" || !entry.trim()) {
        return NextResponse.json(
          { error: "Each URL must be a non-empty string." },
          { status: 400 }
        );
      }
      const trimmed = entry.trim();
      if (!isValidUrl(trimmed)) {
        return NextResponse.json(
          { error: `Invalid URL: ${trimmed}` },
          { status: 400 }
        );
      }
      urls.push(trimmed);
    }

    const settled = await Promise.allSettled(
      urls.map((url) => runTechnicalAudit(url))
    );

    const assessmentResults: AssessmentResult[] = settled.map((outcome, i) => {
      if (outcome.status === "fulfilled") {
        return outcome.value;
      }
      return {
        url: urls[i],
        error:
          outcome.reason instanceof Error
            ? outcome.reason.message
            : "Audit failed for this URL.",
        _failed: true as const,
      };
    });

    const successful = assessmentResults.filter(
      (r): r is TechnicalAuditResult => !("_failed" in r && r._failed)
    );

    const totalIssues = successful.reduce((sum, r) => sum + countIssues(r), 0);
    const averageScore =
      successful.length > 0
        ? Math.round(
            successful.reduce((sum, r) => sum + r.score, 0) / successful.length
          )
        : 0;

    const response = {
      results: assessmentResults.map((r) => {
        if ("_failed" in r && r._failed) {
          return { url: r.url, error: r.error };
        }
        const { url, finalUrl, title, score, status, fetchedAt, insights, metrics, snapshot, htmlEvidence, quickWins, majorFixes } = r;
        return { url, finalUrl, title, score, status, fetchedAt, insights, metrics, snapshot, htmlEvidence, quickWins, majorFixes };
      }),
      summary: {
        totalUrls: urls.length,
        averageScore,
        totalIssues,
        commonIssues: findCommonIssues(successful),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while running the assessment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
