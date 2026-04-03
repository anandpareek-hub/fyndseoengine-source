import { NextResponse } from "next/server";
import { generateKeywordReport } from "@/lib/keyword-engine";
import type {
  AuditActionPlan,
  GeneratedPageDraft,
  KeywordReport,
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

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      profile?: Partial<WorkspaceProfile>;
      audit?: TechnicalAuditResult | null;
      actionPlan?: AuditActionPlan | null;
      pageDraft?: GeneratedPageDraft | null;
      seed?: string;
    };

    const report: KeywordReport = generateKeywordReport({
      profile: normalizeProfile(payload.profile || {}),
      audit: payload.audit || null,
      actionPlan: payload.actionPlan || null,
      pageDraft: payload.pageDraft || null,
      seed: clean(payload.seed),
    });

    return NextResponse.json(report);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while generating keywords.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
