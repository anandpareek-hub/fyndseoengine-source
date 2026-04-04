import { NextResponse } from "next/server";
import { deriveWorkspaceKey, loadInsightsReport } from "@/lib/workspace-store";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawKey = clean(searchParams.get("key"));
    const refresh = clean(searchParams.get("refresh")) === "1";

    if (!rawKey) {
      return NextResponse.json({ error: "Workspace key is required." }, { status: 400 });
    }

    const key = deriveWorkspaceKey({ key: rawKey });
    const result = await loadInsightsReport(key, { refresh });

    return NextResponse.json({
      key,
      storage: result.storage,
      report: result.report,
      message: result.message,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while loading insights.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
