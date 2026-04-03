import { NextResponse } from "next/server";
import { runTechnicalAudit } from "@/lib/technical-audit";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { url?: string };
    const url = clean(payload.url);

    if (!url) {
      return NextResponse.json({ error: "Enter a URL to audit." }, { status: 400 });
    }

    const audit = await runTechnicalAudit(url);
    return NextResponse.json(audit);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while auditing the page.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
