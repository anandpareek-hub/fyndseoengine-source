import { NextResponse } from "next/server";
import { deriveWorkspaceKey, loadWorkspace, saveWorkspace } from "@/lib/workspace-store";
import type { SharedWorkspaceState, WorkspaceProfile } from "@/lib/studio-types";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawKey = clean(searchParams.get("key"));

    if (!rawKey) {
      return NextResponse.json({ error: "Workspace key is required." }, { status: 400 });
    }

    const key = deriveWorkspaceKey({ key: rawKey });
    const result = await loadWorkspace(key);

    return NextResponse.json({
      key,
      storage: result.storage,
      workspace: result.workspace,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while loading the workspace.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<SharedWorkspaceState> & {
      key?: string;
      profile?: Partial<WorkspaceProfile>;
    };

    const profile = normalizeProfile(payload.profile || {});
    const key = deriveWorkspaceKey({ key: payload.key, profile });

    const workspace: SharedWorkspaceState = {
      key,
      profile,
      history: payload.history || [],
      auditResult: payload.auditResult || null,
      actionPlan: payload.actionPlan || null,
      keywordReport: payload.keywordReport || null,
      pageDraft: payload.pageDraft || null,
      updatedAt: new Date().toISOString(),
    };

    const result = await saveWorkspace(workspace);

    return NextResponse.json({
      key,
      storage: result.storage,
      saved: result.saved,
      workspace: result.workspace,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while saving the workspace.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
