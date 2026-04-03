import { NextResponse } from "next/server";
import { generateDraft, type DraftKind, type DraftRequest } from "@/lib/openai";

const VALID_KINDS = new Set<DraftKind>([
  "strategy-snapshot",
  "content-calendar",
  "article-brief",
  "homepage-refresh",
  "content-audit",
]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<DraftRequest>;
    const kind = clean(payload.kind) as DraftKind;

    if (!VALID_KINDS.has(kind)) {
      return NextResponse.json({ error: "Choose a valid deliverable type." }, { status: 400 });
    }

    const normalized: DraftRequest = {
      kind,
      projectName: clean(payload.projectName),
      websiteUrl: clean(payload.websiteUrl),
      audience: clean(payload.audience),
      offer: clean(payload.offer),
      differentiators: clean(payload.differentiators),
      goals: clean(payload.goals),
      voice: clean(payload.voice),
      notes: clean(payload.notes),
      focusKeyword: clean(payload.focusKeyword),
      constraints: clean(payload.constraints),
    };

    if (!normalized.projectName || !normalized.websiteUrl || !normalized.offer) {
      return NextResponse.json(
        { error: "Project name, website URL, and offer are required." },
        { status: 400 }
      );
    }

    const content = await generateDraft(normalized);

    return NextResponse.json({
      content,
      title: `${normalized.projectName} ${kind.replace(/-/g, " ")}`,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while generating the draft.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
