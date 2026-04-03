import { NextResponse } from "next/server";
import { generateNewPageDraft } from "@/lib/openai";
import type {
  AuditActionPlan,
  GeneratedPageDraft,
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

type NewPagePayload = {
  profile?: Partial<WorkspaceProfile>;
  pageTitle?: string;
  targetKeyword?: string;
  pageGoal?: string;
  pageType?: string;
  notes?: string;
  audit?: TechnicalAuditResult | null;
  actionPlan?: AuditActionPlan | null;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as NewPagePayload;
    const profile = normalizeProfile(payload.profile || {});
    const pageTitle = clean(payload.pageTitle);
    const targetKeyword = clean(payload.targetKeyword);

    if (!pageTitle || !targetKeyword) {
      return NextResponse.json(
        { error: "Page title and target keyword are required." },
        { status: 400 }
      );
    }

    const draft: GeneratedPageDraft = await generateNewPageDraft({
      profile,
      pageTitle,
      targetKeyword,
      pageGoal: clean(payload.pageGoal),
      pageType: clean(payload.pageType),
      notes: clean(payload.notes),
      audit: payload.audit || null,
      actionPlan: payload.actionPlan || null,
    });

    return NextResponse.json(draft);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while generating the page.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
