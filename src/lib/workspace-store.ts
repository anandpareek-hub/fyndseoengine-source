import neo4j from "neo4j-driver";
import slugify from "slugify";
import { getDriver, getNeo4jUri, hasNeo4jConfig } from "@/lib/neo4j";
import { compareSiteSnapshots, crawlSiteSnapshot } from "@/lib/site-crawler";
import type {
  InsightsReport,
  Neo4jHealthCheck,
  SharedWorkspaceState,
  SiteSnapshot,
  WorkspaceProfile,
} from "@/lib/studio-types";

function compact(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function hostnameFromUrl(value: string) {
  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function trimWorkspaceValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isSnapshotFresh(snapshot: SiteSnapshot | null, hours = 18) {
  if (!snapshot) {
    return false;
  }

  const age = Date.now() - new Date(snapshot.generatedAt).getTime();
  return age < hours * 60 * 60 * 1000;
}

type WorkspaceTarget = {
  key: string;
  projectName: string;
  websiteUrl: string;
};

function toNeo4jInt(value: number) {
  return neo4j.int(Math.trunc(value));
}

export function deriveWorkspaceKey(input: {
  key?: string;
  profile?: Partial<WorkspaceProfile>;
}) {
  const explicit = compact(input.key || "");

  if (explicit) {
    return slugify(explicit, { lower: true, strict: true });
  }

  const host = hostnameFromUrl(input.profile?.websiteUrl || "");

  if (host) {
    return slugify(host, { lower: true, strict: true });
  }

  const project = compact(input.profile?.projectName || "");

  if (project) {
    return slugify(project, { lower: true, strict: true });
  }

  return "default-workspace";
}

export async function loadWorkspace(key: string) {
  if (!hasNeo4jConfig()) {
    return { storage: "local-only" as const, workspace: null };
  }

  const driver = getDriver();

  if (!driver) {
    return { storage: "local-only" as const, workspace: null };
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (w:Workspace {key: $key})
      RETURN w.snapshotJson AS snapshotJson
      `,
      { key }
    );

    const record = result.records[0];

    if (!record) {
      return { storage: "neo4j" as const, workspace: null };
    }

    const snapshotJson = record.get("snapshotJson");

    if (!snapshotJson) {
      return { storage: "neo4j" as const, workspace: null };
    }

    return {
      storage: "neo4j" as const,
      workspace: JSON.parse(String(snapshotJson)) as SharedWorkspaceState,
    };
  } finally {
    await session.close();
  }
}

export async function saveWorkspace(input: SharedWorkspaceState) {
  if (!hasNeo4jConfig()) {
    return { storage: "local-only" as const, workspace: input, saved: false };
  }

  const driver = getDriver();

  if (!driver) {
    return { storage: "local-only" as const, workspace: input, saved: false };
  }

  const session = driver.session();

  try {
    await session.run(
      `
      MERGE (w:Workspace {key: $key})
      SET w.projectName = $projectName,
          w.websiteUrl = $websiteUrl,
          w.updatedAt = $updatedAt,
          w.snapshotJson = $snapshotJson
      RETURN w
      `,
      {
        key: input.key,
        projectName: input.profile.projectName || input.key,
        websiteUrl: input.profile.websiteUrl || "",
        updatedAt: input.updatedAt,
        snapshotJson: JSON.stringify(input),
      }
    );

    return { storage: "neo4j" as const, workspace: input, saved: true };
  } finally {
    await session.close();
  }
}

export async function checkNeo4jHealth(): Promise<Neo4jHealthCheck> {
  const checkedAt = new Date().toISOString();
  const uri = getNeo4jUri();

  if (!hasNeo4jConfig()) {
    return {
      storage: "local-only",
      connected: false,
      checkedAt,
      message: "Neo4j env vars are missing, so the app is still local-only.",
      uri,
    };
  }

  const driver = getDriver();

  if (!driver) {
    return {
      storage: "local-only",
      connected: false,
      checkedAt,
      message: "Neo4j driver could not be created from the current environment variables.",
      uri,
    };
  }

  try {
    await driver.verifyConnectivity();

    return {
      storage: "neo4j",
      connected: true,
      checkedAt,
      message: "Neo4j connection verified. Shared workspaces and Insights snapshots are available.",
      uri,
    };
  } catch (error) {
    return {
      storage: "neo4j",
      connected: false,
      checkedAt,
      message:
        error instanceof Error
          ? `Neo4j connection failed: ${error.message}`
          : "Neo4j connection failed.",
      uri,
    };
  }
}

async function loadWorkspaceTarget(key: string): Promise<WorkspaceTarget | null> {
  const driver = getDriver();

  if (!driver) {
    return null;
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (w:Workspace {key: $key})
      RETURN w.key AS key, w.projectName AS projectName, w.websiteUrl AS websiteUrl
      `,
      { key }
    );

    const record = result.records[0];

    if (!record) {
      return null;
    }

    return {
      key: trimWorkspaceValue(record.get("key")),
      projectName: trimWorkspaceValue(record.get("projectName")),
      websiteUrl: trimWorkspaceValue(record.get("websiteUrl")),
    };
  } finally {
    await session.close();
  }
}

async function loadLatestSnapshots(key: string, limit = 2): Promise<SiteSnapshot[]> {
  const driver = getDriver();

  if (!driver) {
    return [];
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (:Workspace {key: $key})-[:HAS_SNAPSHOT]->(s:SiteSnapshot)
      RETURN s.snapshotJson AS snapshotJson
      ORDER BY s.generatedAtEpoch DESC
      LIMIT $limit
      `,
      { key, limit: toNeo4jInt(limit) }
    );

    return result.records
      .map((record) => record.get("snapshotJson"))
      .filter(Boolean)
      .map((value) => JSON.parse(String(value)) as SiteSnapshot);
  } finally {
    await session.close();
  }
}

async function saveSiteSnapshot(key: string, projectName: string, snapshot: SiteSnapshot) {
  const driver = getDriver();

  if (!driver) {
    return;
  }

  const session = driver.session();

  try {
    await session.run(
      `
      MERGE (w:Workspace {key: $key})
      SET w.projectName = CASE
            WHEN coalesce(w.projectName, "") = "" THEN $projectName
            ELSE w.projectName
          END,
          w.websiteUrl = $websiteUrl,
          w.insightsUpdatedAt = $generatedAt
      CREATE (s:SiteSnapshot {
        snapshotId: $snapshotId,
        workspaceKey: $key,
        generatedAt: $generatedAt,
        generatedAtEpoch: $generatedAtEpoch,
        pageCount: $pageCount,
        snapshotJson: $snapshotJson
      })
      MERGE (w)-[:HAS_SNAPSHOT]->(s)
      `,
      {
        key,
        projectName,
        websiteUrl: snapshot.websiteUrl,
        generatedAt: snapshot.generatedAt,
        generatedAtEpoch: toNeo4jInt(new Date(snapshot.generatedAt).getTime()),
        snapshotId: snapshot.snapshotId,
        pageCount: toNeo4jInt(snapshot.pages.length),
        snapshotJson: JSON.stringify(snapshot),
      }
    );
  } finally {
    await session.close();
  }
}

async function buildInsightsReport(
  key: string,
  target: WorkspaceTarget,
  latest: SiteSnapshot | null,
  previous: SiteSnapshot | null,
  refreshMode: InsightsReport["refreshMode"],
  storage: InsightsReport["storage"]
): Promise<InsightsReport> {
  if (!latest) {
    return {
      workspaceKey: key,
      projectName: target.projectName || key,
      websiteUrl: target.websiteUrl,
      storage,
      hasBaseline: false,
      syncedAt: null,
      previousSnapshotAt: null,
      refreshMode: "unavailable",
      summary: {
        pagesTracked: 0,
        newPages: 0,
        removedPages: 0,
        changedPages: 0,
        warningSignals: 0,
      },
      warnings: ["No site snapshot has been stored yet."],
      changes: [],
      latestSnapshot: null,
    };
  }

  const comparison = compareSiteSnapshots(previous, latest);

  return {
    workspaceKey: key,
    projectName: target.projectName || key,
    websiteUrl: target.websiteUrl,
    storage,
    hasBaseline: comparison.hasBaseline,
    syncedAt: latest.generatedAt,
    previousSnapshotAt: comparison.previousSnapshotAt,
    refreshMode,
    summary: comparison.summary,
    warnings: comparison.warnings,
    changes: comparison.changes,
    latestSnapshot: latest,
  };
}

export async function loadInsightsReport(
  key: string,
  options?: {
    refresh?: boolean;
  }
) {
  if (!hasNeo4jConfig()) {
    return {
      storage: "local-only" as const,
      report: null,
      message: "Neo4j is not configured, so Insights can only run after shared storage is connected.",
    };
  }

  const target = await loadWorkspaceTarget(key);

  if (!target) {
    return {
      storage: "neo4j" as const,
      report: null,
      message: "No shared workspace exists for this key yet.",
    };
  }

  if (!target.websiteUrl) {
    return {
      storage: "neo4j" as const,
      report: null,
      message: "Add a website URL in Settings before Insights can track changes.",
    };
  }

  const [latestSnapshot, previousSnapshot] = await loadLatestSnapshots(key, 2);
  const shouldRefresh = options?.refresh || !latestSnapshot || !isSnapshotFresh(latestSnapshot);

  if (shouldRefresh) {
    const freshSnapshot = await crawlSiteSnapshot(target.websiteUrl);
    await saveSiteSnapshot(key, target.projectName, freshSnapshot);

    return {
      storage: "neo4j" as const,
      report: await buildInsightsReport(
        key,
        target,
        freshSnapshot,
        latestSnapshot || null,
        latestSnapshot ? "fresh" : "baseline",
        "neo4j"
      ),
      message: latestSnapshot
        ? "Insights refreshed from the latest crawl."
        : "Insights baseline created from the first site snapshot.",
    };
  }

  return {
    storage: "neo4j" as const,
    report: await buildInsightsReport(
      key,
      target,
      latestSnapshot,
      previousSnapshot || null,
      "cached",
      "neo4j"
    ),
    message: "Insights loaded from the latest stored snapshot.",
  };
}

export async function listWorkspaceTargets(): Promise<WorkspaceTarget[]> {
  const driver = getDriver();

  if (!driver) {
    return [];
  }

  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (w:Workspace)
      WHERE coalesce(w.websiteUrl, "") <> ""
      RETURN w.key AS key, w.projectName AS projectName, w.websiteUrl AS websiteUrl
      ORDER BY coalesce(w.updatedAt, "") DESC
      `
    );

    return result.records.map((record) => ({
      key: trimWorkspaceValue(record.get("key")),
      projectName: trimWorkspaceValue(record.get("projectName")),
      websiteUrl: trimWorkspaceValue(record.get("websiteUrl")),
    }));
  } finally {
    await session.close();
  }
}

export async function refreshAllInsights() {
  if (!hasNeo4jConfig()) {
    return {
      storage: "local-only" as const,
      refreshed: 0,
      failures: [] as Array<{ key: string; message: string }>,
    };
  }

  const targets = await listWorkspaceTargets();
  let refreshed = 0;
  const failures: Array<{ key: string; message: string }> = [];

  for (const target of targets.slice(0, 10)) {
    try {
      const snapshot = await crawlSiteSnapshot(target.websiteUrl);
      await saveSiteSnapshot(target.key, target.projectName, snapshot);
      refreshed += 1;
    } catch (error) {
      failures.push({
        key: target.key,
        message: error instanceof Error ? error.message : "Snapshot refresh failed.",
      });
    }
  }

  return {
    storage: "neo4j" as const,
    refreshed,
    failures,
  };
}
