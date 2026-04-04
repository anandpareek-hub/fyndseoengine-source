export type DraftKind =
  | "strategy-snapshot"
  | "content-calendar"
  | "article-brief"
  | "homepage-refresh"
  | "content-audit";

export type WorkspaceProfile = {
  projectName: string;
  websiteUrl: string;
  audience: string;
  offer: string;
  differentiators: string;
  goals: string;
  voice: string;
  notes: string;
};

export type DraftRequest = WorkspaceProfile & {
  kind: DraftKind;
  focusKeyword: string;
  constraints: string;
};

export type SavedStrategyDraft = {
  id: string;
  title: string;
  kind: DraftKind;
  createdAt: string;
  focusKeyword: string;
  content: string;
};

export type Severity = "low" | "medium" | "high";

export type AuditIssue = {
  title: string;
  severity: Severity;
  evidence: string;
  action: string;
};

export type HtmlEvidence = {
  label: string;
  current: string;
  solution: string;
  why: string;
};

export type AuditMetrics = {
  statusCode: number;
  titleLength: number;
  metaDescriptionLength: number;
  h1Count: number;
  h2Count: number;
  paragraphCount: number;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  images: number;
  imagesMissingAlt: number;
  scripts: number;
  stylesheets: number;
  domNodes: number;
  structuredDataBlocks: number;
  hreflangCount: number;
  hasCanonical: boolean;
  hasNoindex: boolean;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  hasSchema: boolean;
  hasViewport: boolean;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  hasLang: boolean;
};

export type AuditSnapshot = {
  titleTag: string;
  metaDescription: string;
  canonical: string;
  robotsMeta: string;
  h1s: string[];
  h2s: string[];
  ogTitle: string;
  ogDescription: string;
  twitterCard: string;
};

export type TechnicalAuditResult = {
  url: string;
  finalUrl: string;
  title: string;
  score: number;
  status: string;
  fetchedAt: string;
  quickWins: string[];
  majorFixes: string[];
  htmlEvidence: HtmlEvidence[];
  snapshot: AuditSnapshot;
  insights: {
    technicalSeo: AuditIssue[];
    pagePerformance: AuditIssue[];
    contentQuality: AuditIssue[];
  };
  metrics: AuditMetrics;
};

export type ActionPlanItem = {
  title: string;
  impact: Severity;
  effort: "small" | "medium" | "large";
  why: string;
  steps: string[];
  doneWhen: string;
};

export type NewPageOpportunity = {
  title: string;
  targetKeyword: string;
  priority: Severity;
  reason: string;
  pageType: string;
  slug: string;
};

export type AuditActionPlan = {
  headline: string;
  quickWins: ActionPlanItem[];
  strategicFixes: ActionPlanItem[];
  newPages: NewPageOpportunity[];
  contentMotions: string[];
};

export type GeneratedPageDraft = {
  title: string;
  slug: string;
  pageType: string;
  targetKeyword: string;
  intent: string;
  summary: string;
  metaTitle: string;
  metaDescription: string;
  cta: string;
  internalLinks: string[];
  schemaOpportunities: string[];
  conversionNotes: string[];
  qaSummary: string;
  markdown: string;
  createdAt: string;
};

export type KeywordSuggestion = {
  keyword: string;
  intent: "commercial" | "informational" | "comparison" | "transactional";
  score: number;
  source: string;
  why: string;
  volume?: number | null;
  traffic?: number | null;
  difficulty?: number | null;
  position?: number | null;
  rankingUrl?: string | null;
};

export type KeywordCluster = {
  label: string;
  description: string;
  suggestions: KeywordSuggestion[];
};

export type KeywordMetric = {
  label: string;
  value: string;
  detail: string;
};

export type KeywordCompetitor = {
  domain: string;
  domainRating: number | null;
  sharedKeywords: number;
  traffic: number | null;
  share: number | null;
};

export type KeywordProvider = "ahrefs" | "local-fallback";

export type KeywordReport = {
  headline: string;
  seedTerms: string[];
  quickWins: string[];
  clusters: KeywordCluster[];
  provider: KeywordProvider;
  providerLabel: string;
  providerNote: string;
  siteMetrics: KeywordMetric[];
  competitors: KeywordCompetitor[];
};

export type Neo4jHealthCheck = {
  storage: "neo4j" | "local-only";
  connected: boolean;
  checkedAt: string;
  message: string;
  uri: string | null;
};

export type SitePageSnapshot = {
  url: string;
  path: string;
  title: string;
  metaDescription: string;
  canonical: string;
  h1: string;
  statusCode: number;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  imagesMissingAlt: number;
  hasNoindex: boolean;
  pageHash: string;
  excerpt: string;
  discoveredFrom: "homepage" | "sitemap" | "internal";
  lastmod: string | null;
};

export type SiteSnapshot = {
  snapshotId: string;
  websiteUrl: string;
  finalOrigin: string;
  generatedAt: string;
  pageLimit: number;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  sitemapUrl: string | null;
  pages: SitePageSnapshot[];
  warnings: string[];
};

export type SiteChangeType =
  | "page-added"
  | "page-removed"
  | "status-changed"
  | "title-updated"
  | "meta-updated"
  | "content-shift"
  | "canonical-changed"
  | "indexability-changed";

export type SiteChange = {
  type: SiteChangeType;
  severity: Severity;
  url: string;
  title: string;
  summary: string;
  action: string;
  before?: string;
  after?: string;
};

export type InsightsReport = {
  workspaceKey: string;
  projectName: string;
  websiteUrl: string;
  storage: "neo4j" | "local-only";
  hasBaseline: boolean;
  syncedAt: string | null;
  previousSnapshotAt: string | null;
  refreshMode: "baseline" | "fresh" | "cached" | "unavailable";
  summary: {
    pagesTracked: number;
    newPages: number;
    removedPages: number;
    changedPages: number;
    warningSignals: number;
  };
  warnings: string[];
  changes: SiteChange[];
  latestSnapshot: SiteSnapshot | null;
};

export type SharedWorkspaceState = {
  key: string;
  profile: WorkspaceProfile;
  history: SavedStrategyDraft[];
  auditResult: TechnicalAuditResult | null;
  actionPlan: AuditActionPlan | null;
  keywordReport: KeywordReport | null;
  pageDraft: GeneratedPageDraft | null;
  updatedAt: string;
};
