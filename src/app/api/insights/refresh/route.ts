import { NextResponse } from "next/server";
import { refreshAllInsights } from "@/lib/workspace-store";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return true;
  }

  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await refreshAllInsights();

    return NextResponse.json({
      refreshed: result.refreshed,
      failures: result.failures,
      storage: result.storage,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while refreshing insights.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
