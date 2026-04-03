import slugify from "slugify";
import { getDriver, hasNeo4jConfig } from "@/lib/neo4j";
import type { SharedWorkspaceState, WorkspaceProfile } from "@/lib/studio-types";

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
      workspace: JSON.parse(snapshotJson) as SharedWorkspaceState,
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
          w.updatedAt = datetime($updatedAt),
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
