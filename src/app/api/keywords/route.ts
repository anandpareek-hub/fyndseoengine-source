import { NextResponse } from "next/server";
import { getAhrefsKeywordIntel } from "@/lib/ahrefs";
import { generateKeywordReport } from "@/lib/keyword-engine";
import type {
  AuditActionPlan,
  GeneratedPageDraft,
  KeywordCluster,
  KeywordReport,
  KeywordSuggestion,
  TechnicalAuditResult,
  WorkspaceProfile,
} from "@/lib/studio-types";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeProfile(payload: Partial<WorkspaceProfile>): WorkspaceProfile {
  return {
    projectName: clean(payload.projectName),
    websiteUrl: clean(payload.websiteUrl),
    audience: clean(payload.audience),
    offer: clean(payload.offer),
    differentiators: clean(payload.differentiators),
    goals: clean(payload.goals),
    voice: clean(payload.voice),
    notes: clean(payload.notes),
  };
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function mergeSuggestions(localSuggestions: KeywordSuggestion[], liveSuggestions: KeywordSuggestion[]) {
  const seen = new Set<string>();
  const merged = [...liveSuggestions, ...localSuggestions].filter((item) => {
    const key = item.keyword.trim().toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  return merged;
}

function mergeKeywordReports(
  localReport: KeywordReport,
  live: Awaited<ReturnType<typeof getAhrefsKeywordIntel>>
): KeywordReport {
  const liveCluster: KeywordCluster = {
    label: "Ahrefs live opportunities",
    description:
      "Current organic keywords pulled from Ahrefs for this domain. These are the fastest opportunities to improve because the site already has search visibility.",
    suggestions: live.liveSuggestions.slice(0, 8),
  };

  const enhancedClusters = localReport.clusters.map((cluster) => {
    if (cluster.label !== "Money keywords") {
      return cluster;
    }

    return {
      ...cluster,
      suggestions: mergeSuggestions(cluster.suggestions, live.liveSuggestions.slice(0, 5)).slice(0, 8),
    };
  });

  return {
    ...localReport,
    headline: live.headline,
    seedTerms: unique([...live.liveSuggestions.slice(0, 6).map((item) => item.keyword), ...localReport.seedTerms]).slice(0, 12),
    quickWins: unique([...live.quickWins, ...localReport.quickWins]).slice(0, 8),
    clusters: [liveCluster, ...enhancedClusters],
    provider: "ahrefs",
    providerLabel: "Ahrefs + local model",
    providerNote: live.providerNote,
    siteMetrics: live.siteMetrics,
    competitors: live.competitors,
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      profile?: Partial<WorkspaceProfile>;
      audit?: TechnicalAuditResult | null;
      actionPlan?: AuditActionPlan | null;
      pageDraft?: GeneratedPageDraft | null;
      seed?: string;
    };

    const localReport: KeywordReport = generateKeywordReport({
      profile: normalizeProfile(payload.profile || {}),
      audit: payload.audit || null,
      actionPlan: payload.actionPlan || null,
      pageDraft: payload.pageDraft || null,
      seed: clean(payload.seed),
    });

    const websiteUrl =
      clean(payload.profile?.websiteUrl) ||
      clean(payload.audit?.finalUrl) ||
      clean(payload.audit?.url);

    if (!websiteUrl || !process.env.AHREFS_API_KEY) {
      const providerNote = !process.env.AHREFS_API_KEY
        ? "Ahrefs is not configured, so the app used the local keyword model."
        : "Add a valid website URL to unlock Ahrefs-backed keyword intelligence. The local keyword model is still available.";

      return NextResponse.json({
        ...localReport,
        provider: "local-fallback",
        providerLabel: "Local keyword model",
        providerNote,
      });
    }

    try {
      const liveIntel = await getAhrefsKeywordIntel({
        websiteUrl,
        seedTerms: localReport.seedTerms,
      });

      return NextResponse.json(mergeKeywordReports(localReport, liveIntel));
    } catch (error) {
      const fallbackNote =
        error instanceof Error
          ? `Ahrefs was unavailable, so the app switched to the local keyword model. ${error.message}`
          : "Ahrefs was unavailable, so the app switched to the local keyword model.";

      return NextResponse.json({
        ...localReport,
        provider: "local-fallback",
        providerLabel: "Local fallback",
        providerNote: fallbackNote,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while generating keywords.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
