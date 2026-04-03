import { NextResponse } from "next/server";
import { generateFixActionPlan } from "@/lib/openai";
import type { TechnicalAuditResult, WorkspaceProfile } from "@/lib/studio-types";

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
    };

    const profile = normalizeProfile(payload.profile || {});
    const audit = payload.audit;

    if (!audit?.url || !audit?.title) {
      return NextResponse.json({ error: "Run a technical audit first." }, { status: 400 });
    }

    const actionPlan = await generateFixActionPlan(profile, audit);
    return NextResponse.json(actionPlan);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while creating the fix-action plan.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
