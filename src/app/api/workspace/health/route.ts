import { NextResponse } from "next/server";
import { checkNeo4jHealth } from "@/lib/workspace-store";

export async function GET() {
  try {
    const health = await checkNeo4jHealth();
    return NextResponse.json(health);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while checking Neo4j.";

    return NextResponse.json(
      {
        storage: "neo4j",
        connected: false,
        checkedAt: new Date().toISOString(),
        message,
        uri: null,
      },
      { status: 500 }
    );
  }
}
