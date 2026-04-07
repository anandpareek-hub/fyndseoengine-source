"use client";

import { startTransition, useEffect, useEffectEvent, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { marked } from "marked";
import {
  ArrowRight,
  BookText,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileSearch,
  FilePlus2,
  Globe2,
  LayoutDashboard,
  Link2,
  NotebookPen,
  PenTool,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Target,
  TriangleAlert,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  AuditActionPlan,
  ActionPlanItem,
  DraftKind,
  GeneratedPageDraft,
  InsightsReport,
  KeywordCluster,
  Neo4jHealthCheck,
  KeywordReport,
  NewPageOpportunity,
  SavedStrategyDraft,
  Severity,
  SiteChange,
  SharedWorkspaceState,
  TechnicalAuditResult,
  WorkspaceProfile,
  HtmlEvidence,
} from "@/lib/studio-types";

/* ─── Tab types ─── */

type WorkflowTab = "dashboard" | "assessment" | "content" | "settings";

type ContentPageType = "ai-tool" | "blog" | "new-page";

type ContentForm = {
  keyword: string;
  pageUrl: string;
  pageType: ContentPageType;
};

/* ─── Storage keys ─── */

const PROFILE_STORAGE_KEY = "fynd-personal-seo-profile";
const HISTORY_STORAGE_KEY = "fynd-personal-seo-history";
const AUDIT_STORAGE_KEY = "fynd-personal-seo-audit";
const ACTIONS_STORAGE_KEY = "fynd-personal-seo-actions";
const KEYWORDS_STORAGE_KEY = "fynd-personal-seo-keywords";
const CONTENT_FORM_STORAGE_KEY = "fynd-seo-content-form";
const CONTENT_RESULT_STORAGE_KEY = "fynd-seo-content-result";

/* ─── Defaults ─── */

const emptyProfile: WorkspaceProfile = {
  projectName: "",
  websiteUrl: "",
  audience: "",
  offer: "",
  differentiators: "",
  goals: "",
  voice: "",
  notes: "",
};

const emptyContentForm: ContentForm = {
  keyword: "",
  pageUrl: "",
  pageType: "ai-tool",
};

/* ─── Nav config ─── */

const navItems: Array<{
  id: WorkflowTab;
  label: string;
  icon: ReactNode;
}> = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
  { id: "assessment", label: "SEO Assessment", icon: <Shield className="size-4" /> },
  { id: "content", label: "Content", icon: <PenTool className="size-4" /> },
];

/* ─── Component ─── */

type PersonalSeoWorkspaceProps = {
  legacyPath: string | null;
};

export default function PersonalSeoWorkspace({ legacyPath }: PersonalSeoWorkspaceProps) {
  // Core state
  const [activeTab, setActiveTab] = useState<WorkflowTab>("dashboard");
  const [profile, setProfile] = useState<WorkspaceProfile>(emptyProfile);
  const [hydrated, setHydrated] = useState(false);

  // Dashboard / strategy
  const [kind, setKind] = useState<DraftKind>("strategy-snapshot");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [constraints, setConstraints] = useState("");
  const [activeDraft, setActiveDraft] = useState<SavedStrategyDraft | null>(null);
  const [history, setHistory] = useState<SavedStrategyDraft[]>([]);
  const [draftLoading, setDraftLoading] = useState(false);

  // Keywords
  const [keywordSeed, setKeywordSeed] = useState("");
  const [keywordReport, setKeywordReport] = useState<KeywordReport | null>(null);
  const [keywordLoading, setKeywordLoading] = useState(false);

  // Assessment (multi-URL)
  const [assessmentUrls, setAssessmentUrls] = useState<string[]>([""]);
  const [assessmentResults, setAssessmentResults] = useState<TechnicalAuditResult[]>([]);
  const [assessmentSummary, setAssessmentSummary] = useState<{
    totalUrls: number;
    averageScore: number;
    totalIssues: number;
    commonIssues: string[];
  } | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<{
    issue: { title: string; severity: Severity; evidence: string; action: string };
    evidence?: HtmlEvidence;
    url: string;
  } | null>(null);

  // Action plan (from assessment)
  const [actionPlan, setActionPlan] = useState<AuditActionPlan | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Content generation
  const [contentForm, setContentForm] = useState<ContentForm>(emptyContentForm);
  const [contentResult, setContentResult] = useState<Record<string, unknown> | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  // Workspace / settings
  const [workspaceKey, setWorkspaceKey] = useState("");
  const [workspaceStorage, setWorkspaceStorage] = useState<"local-only" | "neo4j" | "unknown">("unknown");
  const [neo4jHealth, setNeo4jHealth] = useState<Neo4jHealthCheck | null>(null);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [insightsReport, setInsightsReport] = useState<InsightsReport | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  /* ─── Hydration ─── */

  useEffect(() => {
    marked.setOptions({ breaks: true, gfm: true });
    try {
      const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      const savedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      const savedAudit = window.localStorage.getItem(AUDIT_STORAGE_KEY);
      const savedActions = window.localStorage.getItem(ACTIONS_STORAGE_KEY);
      const savedKeywords = window.localStorage.getItem(KEYWORDS_STORAGE_KEY);
      const savedContentForm = window.localStorage.getItem(CONTENT_FORM_STORAGE_KEY);
      const savedContentResult = window.localStorage.getItem(CONTENT_RESULT_STORAGE_KEY);

      if (savedProfile) {
        const parsed = JSON.parse(savedProfile) as WorkspaceProfile;
        setProfile(parsed);
        setWorkspaceKey(createWorkspaceKey(parsed));
      }
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory) as SavedStrategyDraft[];
        setHistory(parsed);
        setActiveDraft(parsed[0] ?? null);
      }
      if (savedAudit) {
        const parsed = JSON.parse(savedAudit) as TechnicalAuditResult[];
        if (Array.isArray(parsed)) setAssessmentResults(parsed);
      }
      if (savedActions) setActionPlan(JSON.parse(savedActions) as AuditActionPlan);
      if (savedKeywords) setKeywordReport(JSON.parse(savedKeywords) as KeywordReport);
      if (savedContentForm) setContentForm(JSON.parse(savedContentForm) as ContentForm);
      if (savedContentResult) setContentResult(JSON.parse(savedContentResult) as Record<string, unknown>);
    } catch (e) {
      console.error("Failed to load local workspace state", e);
    } finally {
      setHydrated(true);
    }
  }, []);

  /* ─── Persistence ─── */

  useEffect(() => { if (hydrated) window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile)); }, [hydrated, profile]);
  useEffect(() => { if (hydrated) window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history)); }, [hydrated, history]);
  useEffect(() => {
    if (!hydrated) return;
    if (assessmentResults.length) window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(assessmentResults));
    else window.localStorage.removeItem(AUDIT_STORAGE_KEY);
  }, [assessmentResults, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    if (actionPlan) window.localStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(actionPlan));
    else window.localStorage.removeItem(ACTIONS_STORAGE_KEY);
  }, [actionPlan, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    if (keywordReport) window.localStorage.setItem(KEYWORDS_STORAGE_KEY, JSON.stringify(keywordReport));
    else window.localStorage.removeItem(KEYWORDS_STORAGE_KEY);
  }, [hydrated, keywordReport]);
  useEffect(() => { if (hydrated) window.localStorage.setItem(CONTENT_FORM_STORAGE_KEY, JSON.stringify(contentForm)); }, [hydrated, contentForm]);
  useEffect(() => {
    if (!hydrated) return;
    if (contentResult) window.localStorage.setItem(CONTENT_RESULT_STORAGE_KEY, JSON.stringify(contentResult));
    else window.localStorage.removeItem(CONTENT_RESULT_STORAGE_KEY);
  }, [contentResult, hydrated]);

  /* ─── Handlers ─── */

  async function handleRunAssessment() {
    const validUrls = assessmentUrls.map((u) => u.trim()).filter(Boolean);
    if (!validUrls.length) {
      toast.error("Add at least one URL to assess.");
      return;
    }
    setAssessmentLoading(true);
    setAssessmentResults([]);
    setAssessmentSummary(null);
    try {
      const response = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: validUrls }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Assessment failed.");
      const results = (data.results || []).filter((r: Record<string, unknown>) => !r.error);
      setAssessmentResults(results as TechnicalAuditResult[]);
      setAssessmentSummary(data.summary || null);
      setActionPlan(null);
      toast.success(`Assessment complete for ${results.length} URL${results.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assessment failed.");
    } finally {
      setAssessmentLoading(false);
    }
  }

  async function handleGenerateKeywords() {
    setKeywordLoading(true);
    try {
      const response = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          audit: assessmentResults[0] || null,
          actionPlan,
          pageDraft: null,
          seed: keywordSeed,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.headline) throw new Error(data.error || "Keyword map failed.");
      setKeywordReport(data as KeywordReport);
      toast.success("Keyword map generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Keyword map failed.");
    } finally {
      setKeywordLoading(false);
    }
  }

  async function handleGenerateStrategy() {
    setDraftLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, focusKeyword, constraints, ...profile }),
      });
      const data = await response.json();
      if (!response.ok || !data.content) throw new Error(data.error || "Draft failed.");
      const item: SavedStrategyDraft = {
        id: crypto.randomUUID(),
        kind,
        title: data.title,
        createdAt: data.createdAt,
        focusKeyword,
        content: data.content,
      };
      startTransition(() => {
        setActiveDraft(item);
        setHistory((c) => [item, ...c].slice(0, 12));
      });
      toast.success("Strategy draft generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Draft failed.");
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleGenerateContent() {
    if (!contentForm.keyword.trim()) {
      toast.error("Enter a keyword to generate content.");
      return;
    }
    setContentLoading(true);
    setContentResult(null);
    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: contentForm.keyword,
          pageUrl: contentForm.pageUrl || undefined,
          pageType: contentForm.pageType,
          profile,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Content generation failed.");
      setContentResult(data);
      toast.success("Content generated with multi-agent system");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Content generation failed.");
    } finally {
      setContentLoading(false);
    }
  }

  async function handleGenerateActions() {
    if (!assessmentResults.length) {
      toast.error("Run an assessment first.");
      return;
    }
    setActionLoading(true);
    try {
      const response = await fetch("/api/fix-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, audit: assessmentResults[0] }),
      });
      const data = await response.json();
      if (!response.ok || !data.headline) throw new Error(data.error || "Action plan failed.");
      setActionPlan(data as AuditActionPlan);
      toast.success("Fix-action plan generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action plan failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function copyText(text: string, msg: string) {
    try { await navigator.clipboard.writeText(text); toast.success(msg); }
    catch { toast.error("Clipboard access failed"); }
  }

  function downloadText(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  }

  function resetWorkspace() {
    setProfile(emptyProfile);
    setHistory([]);
    setActiveDraft(null);
    setAssessmentResults([]);
    setAssessmentSummary(null);
    setActionPlan(null);
    setKeywordReport(null);
    setContentForm(emptyContentForm);
    setContentResult(null);
    [PROFILE_STORAGE_KEY, HISTORY_STORAGE_KEY, AUDIT_STORAGE_KEY, ACTIONS_STORAGE_KEY, KEYWORDS_STORAGE_KEY, CONTENT_FORM_STORAGE_KEY, CONTENT_RESULT_STORAGE_KEY].forEach((k) => window.localStorage.removeItem(k));
    toast.success("Workspace cleared");
  }

  // Derived
  const strategyHtml = renderMarkdown(activeDraft?.content || "");

  /* ─── Render ─── */

  return (
    <main className="min-h-screen bg-[#fafafa] text-[#34324a]">
      <div className="flex min-h-screen">
        {/* ─── Sidebar ─── */}
        <aside className="hidden w-[240px] border-r border-[#f0f0f0] bg-white md:flex md:flex-col">
          <div className="flex items-center gap-3 border-b border-[#f0f0f0] px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6933fa] text-white">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#34324a]">SEO Studio</p>
              <p className="text-[11px] text-[#6e6d74]">Growth Engine</p>
            </div>
          </div>

          <div className="flex-1 px-3 py-4">
            <div className="space-y-0.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-all",
                    activeTab === item.id
                      ? "border-l-[3px] border-[#6933fa] bg-[#f7f5fc] text-[#6933fa]"
                      : "border-l-[3px] border-transparent text-[#6e6d74] hover:bg-[#f7f5fc] hover:text-[#34324a]"
                  )}
                >
                  <span className={cn(activeTab === item.id ? "text-[#6933fa]" : "text-[#b5b5b5]")}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 border-t border-[#f0f0f0] pt-4">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b5b5b5]">
                System
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-all",
                  activeTab === "settings"
                    ? "border-l-[3px] border-[#6933fa] bg-[#f7f5fc] text-[#6933fa]"
                    : "border-l-[3px] border-transparent text-[#6e6d74] hover:bg-[#f7f5fc] hover:text-[#34324a]"
                )}
              >
                <span className={cn(activeTab === "settings" ? "text-[#6933fa]" : "text-[#b5b5b5]")}>
                  <Settings2 className="size-4" />
                </span>
                <span>Settings</span>
              </button>
            </div>
          </div>
        </aside>

        {/* ─── Main content ─── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#f0f0f0] bg-white px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f7f5fc] text-[#6933fa]">
                {navItems.find((n) => n.id === activeTab)?.icon || <Settings2 className="size-4" />}
              </div>
              <div>
                <h1 className="text-[15px] font-semibold text-[#34324a]">
                  {navItems.find((n) => n.id === activeTab)?.label || "Settings"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[#f0f0f0] bg-white px-3 py-1.5 text-[11px] font-medium text-[#6e6d74]">
                {profile.projectName || "No project"}
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">

              {/* ═══════════════════════════════════════════════ */}
              {/*                  DASHBOARD TAB                  */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === "dashboard" ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* KPI Row */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard label="Assessment Score" value={assessmentSummary ? String(assessmentSummary.averageScore) : "--"} change={assessmentSummary ? `${assessmentSummary.totalUrls} URLs` : "Not run"} positive={assessmentSummary ? assessmentSummary.averageScore >= 70 : null} />
                    <KpiCard label="Issues Found" value={assessmentSummary ? String(assessmentSummary.totalIssues) : "--"} change={assessmentSummary?.commonIssues[0] || "Run assessment"} positive={assessmentSummary ? assessmentSummary.totalIssues < 10 : null} />
                    <KpiCard label="Keywords Mapped" value={keywordReport ? String(keywordReport.clusters.reduce((s, c) => s + c.suggestions.length, 0)) : "--"} change={keywordReport?.provider === "ahrefs" ? "Ahrefs live" : "Local model"} positive={null} />
                    <KpiCard label="Strategy Drafts" value={String(history.length).padStart(2, "0")} change={activeDraft ? activeDraft.kind.replace(/-/g, " ") : "None yet"} positive={null} />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    {/* Keywords section */}
                    <PanelCard title="Keyword Intelligence" description="Generate keyword clusters from your project context.">
                      <Field label="Seed topic" icon={<Target className="size-4" />} value={keywordSeed} onChange={setKeywordSeed} placeholder="e.g. ai image upscaler, watermark removal..." />
                      <div className="mt-4 flex gap-3">
                        <PrimaryButton onClick={handleGenerateKeywords} disabled={keywordLoading}>
                          {keywordLoading ? <RefreshCcw className="size-4 animate-spin" /> : <Target className="size-4" />}
                          {keywordLoading ? "Generating..." : "Generate keywords"}
                        </PrimaryButton>
                      </div>
                      {keywordReport ? (
                        <div className="mt-5 space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {keywordReport.quickWins.map((kw) => (
                              <span key={kw} className="rounded-full bg-[#f7f5fc] px-3 py-1 text-xs font-medium text-[#6933fa]">{kw}</span>
                            ))}
                          </div>
                          {keywordReport.clusters.map((cluster) => (
                            <div key={cluster.label} className="rounded-xl border border-[#f0f0f0] bg-white p-4">
                              <p className="text-sm font-semibold text-[#34324a]">{cluster.label}</p>
                              <p className="mt-1 text-xs text-[#6e6d74]">{cluster.description}</p>
                              <div className="mt-3 space-y-1">
                                {cluster.suggestions.slice(0, 5).map((s) => (
                                  <div key={s.keyword} className="flex items-center justify-between rounded-lg bg-[#fafafa] px-3 py-2 text-sm">
                                    <span>{s.keyword}</span>
                                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                                      s.intent === "commercial" ? "bg-[#e8e8fc] text-[#6933fa]" :
                                      s.intent === "informational" ? "bg-[#e6f7ee] text-[#27AE60]" :
                                      s.intent === "comparison" ? "bg-[#fef3e2] text-[#F39C12]" :
                                      "bg-[#f0f0f0] text-[#6e6d74]"
                                    )}>{s.intent}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </PanelCard>

                    {/* Strategy section */}
                    <PanelCard title="Content Strategy" description="Generate SEO strategy drafts, content calendars, and briefs.">
                      <div className="grid grid-cols-2 gap-2">
                        {(["strategy-snapshot", "content-calendar", "article-brief", "content-audit"] as DraftKind[]).map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setKind(k)}
                            className={cn(
                              "rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all",
                              kind === k
                                ? "border-[#6933fa] bg-[#f7f5fc] text-[#6933fa]"
                                : "border-[#f0f0f0] bg-white text-[#6e6d74] hover:border-[#e8e8fc]"
                            )}
                          >
                            {k.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4">
                        <Field label="Focus keyword" icon={<Search className="size-4" />} value={focusKeyword} onChange={setFocusKeyword} placeholder="Optional topic or target keyword" />
                      </div>
                      <div className="mt-4 flex gap-3">
                        <PrimaryButton onClick={handleGenerateStrategy} disabled={draftLoading}>
                          {draftLoading ? <RefreshCcw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                          {draftLoading ? "Generating..." : "Generate draft"}
                        </PrimaryButton>
                      </div>
                      {activeDraft ? (
                        <div className="mt-5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-[#34324a]">{activeDraft.title}</p>
                            <div className="flex gap-2">
                              <GhostButton onClick={() => copyText(activeDraft.content, "Copied")}>
                                <Copy className="size-3.5" />
                              </GhostButton>
                              <GhostButton onClick={() => downloadText(activeDraft.content, `${activeDraft.kind}.md`)}>
                                <Download className="size-3.5" />
                              </GhostButton>
                            </div>
                          </div>
                          <div className="mt-3 max-h-[400px] overflow-y-auto rounded-xl border border-[#f0f0f0] bg-white p-4">
                            <div className="article-content" dangerouslySetInnerHTML={{ __html: strategyHtml }} />
                          </div>
                        </div>
                      ) : null}
                    </PanelCard>
                  </div>

                  {/* GEO Optimization tips */}
                  <PanelCard title="GEO Optimization Insights" description="Geographic and generative engine optimization strategies.">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <InfoCard icon={<Globe2 className="size-5" />} title="Multi-region targeting" description="Use hreflang tags, locale-specific content, and CDN edge delivery to serve the right content for each geography." />
                      <InfoCard icon={<Zap className="size-5" />} title="AI Search readiness" description="Structure content with clear Q&A patterns, data tables, and authoritative citations to appear in AI-generated search results." />
                      <InfoCard icon={<Target className="size-5" />} title="Local schema markup" description="Add LocalBusiness, FAQ, and HowTo schema to improve visibility in both traditional and AI-driven search surfaces." />
                    </div>
                  </PanelCard>
                </motion.div>
              ) : null}

              {/* ═══════════════════════════════════════════════ */}
              {/*              SEO ASSESSMENT TAB                 */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === "assessment" ? (
                <motion.div
                  key="assessment"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* URL input */}
                  <PanelCard title="Run SEO Assessment" description="Add multiple URLs to run a comprehensive technical and content assessment.">
                    <div className="space-y-3">
                      {assessmentUrls.map((url, idx) => (
                        <div key={idx} className="flex gap-2">
                          <div className="flex-1">
                            <input
                              value={url}
                              onChange={(e) => {
                                const next = [...assessmentUrls];
                                next[idx] = e.target.value;
                                setAssessmentUrls(next);
                              }}
                              placeholder="https://example.com/page"
                              className="h-11 w-full rounded-xl border border-[#f0f0f0] bg-white px-4 text-sm text-[#34324a] outline-none transition placeholder:text-[#b5b5b5] focus:border-[#6933fa] focus:ring-2 focus:ring-[#6933fa]/10"
                            />
                          </div>
                          {assessmentUrls.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setAssessmentUrls(assessmentUrls.filter((_, i) => i !== idx))}
                              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#f0f0f0] text-[#b5b5b5] transition hover:border-[#E74C3C] hover:text-[#E74C3C]"
                            >
                              <X className="size-4" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <GhostButton onClick={() => setAssessmentUrls([...assessmentUrls, ""])}>
                        <Plus className="size-4" />
                        Add URL
                      </GhostButton>
                      <PrimaryButton onClick={handleRunAssessment} disabled={assessmentLoading}>
                        {assessmentLoading ? <RefreshCcw className="size-4 animate-spin" /> : <FileSearch className="size-4" />}
                        {assessmentLoading ? "Analyzing..." : "Run Assessment"}
                      </PrimaryButton>
                    </div>
                  </PanelCard>

                  {/* Summary */}
                  {assessmentSummary ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <KpiCard label="Average Score" value={String(assessmentSummary.averageScore)} change={`${assessmentSummary.totalUrls} URLs assessed`} positive={assessmentSummary.averageScore >= 70} />
                      <KpiCard label="Total Issues" value={String(assessmentSummary.totalIssues)} change="Across all URLs" positive={assessmentSummary.totalIssues < 10} />
                      <KpiCard label="Common Issues" value={String(assessmentSummary.commonIssues.length)} change={assessmentSummary.commonIssues[0] || "None"} positive={assessmentSummary.commonIssues.length === 0} />
                      <div className="card-shadow flex flex-col justify-center rounded-2xl border border-[#f0f0f0] bg-white p-4">
                        <PrimaryButton onClick={handleGenerateActions} disabled={actionLoading || !assessmentResults.length}>
                          {actionLoading ? <RefreshCcw className="size-4 animate-spin" /> : <Zap className="size-4" />}
                          {actionLoading ? "Building plan..." : "Generate Fix Plan"}
                        </PrimaryButton>
                      </div>
                    </div>
                  ) : null}

                  {/* Results per URL */}
                  {assessmentResults.map((result, idx) => (
                    <AssessmentResultCard
                      key={result.url + idx}
                      result={result}
                      onClickIssue={(issue, evidence) =>
                        setSelectedIssue({ issue, evidence, url: result.finalUrl })
                      }
                    />
                  ))}

                  {/* Action plan */}
                  {actionPlan ? (
                    <PanelCard title="Fix Action Plan" description={actionPlan.headline}>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#27AE60]">Quick Wins</p>
                          {actionPlan.quickWins.map((item) => (
                            <ActionItem key={item.title} item={item} />
                          ))}
                        </div>
                        <div>
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#F39C12]">Strategic Fixes</p>
                          {actionPlan.strategicFixes.map((item) => (
                            <ActionItem key={item.title} item={item} />
                          ))}
                        </div>
                      </div>
                    </PanelCard>
                  ) : null}

                  {/* Loading state */}
                  {assessmentLoading ? (
                    <div className="flex min-h-[200px] flex-col items-center justify-center">
                      <RefreshCcw className="size-8 animate-spin text-[#6933fa]" />
                      <p className="mt-4 text-sm text-[#6e6d74]">Running assessment on {assessmentUrls.filter(Boolean).length} URL{assessmentUrls.filter(Boolean).length === 1 ? "" : "s"}...</p>
                    </div>
                  ) : null}

                  {!assessmentResults.length && !assessmentLoading ? (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <InfoCard icon={<Shield className="size-5" />} title="Technical assessment" description="Check titles, meta, canonical, schema, robots, sitemap, viewport, and more." />
                      <InfoCard icon={<FileSearch className="size-5" />} title="Content assessment" description="Evaluate word count, headings, internal links, images, and content depth." />
                      <InfoCard icon={<CheckCircle2 className="size-5" />} title="Actionable fixes" description="Each issue shows current state and recommended fix with HTML evidence." />
                    </div>
                  ) : null}
                </motion.div>
              ) : null}

              {/* ═══════════════════════════════════════════════ */}
              {/*                 CONTENT TAB                     */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === "content" ? (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="grid gap-6 xl:grid-cols-[0.4fr_0.6fr]">
                    {/* Input panel */}
                    <PanelCard title="Content Generator" description="Multi-agent system: one agent writes, another humanizes for natural tone.">
                      <Field
                        label="Target keyword"
                        icon={<Target className="size-4" />}
                        value={contentForm.keyword}
                        onChange={(v) => setContentForm((c) => ({ ...c, keyword: v }))}
                        placeholder="e.g. ai watermark remover, image upscaler"
                      />
                      <div className="mt-4">
                        <Field
                          label="Existing page URL (optional)"
                          icon={<Link2 className="size-4" />}
                          value={contentForm.pageUrl}
                          onChange={(v) => setContentForm((c) => ({ ...c, pageUrl: v }))}
                          placeholder="https://example.com/tools/watermark-remover"
                        />
                      </div>

                      <div className="mt-4">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e6d74]">Page type</p>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { id: "ai-tool" as ContentPageType, label: "AI Tool Page", icon: <Zap className="size-4" /> },
                            { id: "blog" as ContentPageType, label: "Blog Post", icon: <BookText className="size-4" /> },
                            { id: "new-page" as ContentPageType, label: "New Page", icon: <FilePlus2 className="size-4" /> },
                          ]).map((pt) => (
                            <button
                              key={pt.id}
                              type="button"
                              onClick={() => setContentForm((c) => ({ ...c, pageType: pt.id }))}
                              className={cn(
                                "flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-center text-xs font-medium transition-all",
                                contentForm.pageType === pt.id
                                  ? "border-[#6933fa] bg-[#f7f5fc] text-[#6933fa]"
                                  : "border-[#f0f0f0] bg-white text-[#6e6d74] hover:border-[#e8e8fc]"
                              )}
                            >
                              {pt.icon}
                              {pt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 flex gap-3">
                        <PrimaryButton onClick={handleGenerateContent} disabled={contentLoading}>
                          {contentLoading ? <RefreshCcw className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                          {contentLoading ? "Generating..." : "Generate Content"}
                        </PrimaryButton>
                      </div>

                      <div className="mt-4 rounded-xl border border-[#e8e8fc] bg-[#f7f5fc] p-3">
                        <p className="text-xs font-medium text-[#6933fa]">Multi-agent pipeline</p>
                        <p className="mt-1 text-[11px] text-[#6e6d74]">
                          Agent 1 (Writer) creates structured SEO content. Agent 2 (Humanizer) rewrites prose to avoid AI detection patterns with varied sentence structure and natural tone.
                        </p>
                      </div>
                    </PanelCard>

                    {/* Content result */}
                    <PanelCard
                      title={contentResult ? "Generated Content" : "Content Preview"}
                      description={contentResult ? `${(contentResult as Record<string, string>).pageType || contentForm.pageType} for "${(contentResult as Record<string, string>).keyword || contentForm.keyword}"` : "Generate content to see the output here."}
                    >
                      {contentResult ? (
                        <ContentResultView
                          result={contentResult}
                          pageType={contentForm.pageType}
                          onCopy={(text) => copyText(text, "Copied to clipboard")}
                        />
                      ) : contentLoading ? (
                        <div className="flex min-h-[300px] flex-col items-center justify-center">
                          <RefreshCcw className="size-8 animate-spin text-[#6933fa]" />
                          <p className="mt-4 text-sm text-[#6e6d74]">Writer agent creating content...</p>
                          <p className="mt-1 text-xs text-[#b5b5b5]">Humanizer agent will refine the output next</p>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          <InfoCard icon={<Zap className="size-5" />} title="AI Tool Page" description="Hero, how-it-works, features, use cases, tips, FAQ, related tools, and schema markup." />
                          <InfoCard icon={<BookText className="size-5" />} title="Blog Post" description="Introduction, structured sections with H2/H3, conclusion, FAQ, and internal links." />
                        </div>
                      )}
                    </PanelCard>
                  </div>
                </motion.div>
              ) : null}

              {/* ═══════════════════════════════════════════════ */}
              {/*                 SETTINGS TAB                    */}
              {/* ═══════════════════════════════════════════════ */}
              {activeTab === "settings" ? (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <PanelCard title="Project Profile" description="Shared context used across all tabs.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Project name" icon={<NotebookPen className="size-4" />} value={profile.projectName} onChange={(v) => setProfile((c) => ({ ...c, projectName: v }))} placeholder="Your project or site name" />
                      <Field label="Website URL" icon={<Globe2 className="size-4" />} value={profile.websiteUrl} onChange={(v) => setProfile((c) => ({ ...c, websiteUrl: v }))} placeholder="https://example.com" />
                      <LongField label="Audience" value={profile.audience} onChange={(v) => setProfile((c) => ({ ...c, audience: v }))} placeholder="Who the site serves" />
                      <LongField label="Offer" value={profile.offer} onChange={(v) => setProfile((c) => ({ ...c, offer: v }))} placeholder="What the site sells or helps users accomplish" />
                      <LongField label="Differentiators" value={profile.differentiators} onChange={(v) => setProfile((c) => ({ ...c, differentiators: v }))} placeholder="Why this project deserves attention" />
                      <LongField label="Goals" value={profile.goals} onChange={(v) => setProfile((c) => ({ ...c, goals: v }))} placeholder="Traffic, conversion, authority targets" />
                      <LongField label="Voice" value={profile.voice} onChange={(v) => setProfile((c) => ({ ...c, voice: v }))} placeholder="Direct, warm, analytical..." />
                      <LongField label="Notes" value={profile.notes} onChange={(v) => setProfile((c) => ({ ...c, notes: v }))} placeholder="Any constraints or business context" />
                    </div>
                    <div className="mt-4">
                      <GhostButton onClick={resetWorkspace}>
                        <RefreshCcw className="size-4" />
                        Clear all data
                      </GhostButton>
                    </div>
                  </PanelCard>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ─── Fix Modal ─── */}
      {selectedIssue ? (
        <FixModal
          issue={selectedIssue.issue}
          evidence={selectedIssue.evidence}
          url={selectedIssue.url}
          onClose={() => setSelectedIssue(null)}
        />
      ) : null}
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*                       SUB-COMPONENTS                               */
/* ═══════════════════════════════════════════════════════════════════ */

function createWorkspaceKey(profile: WorkspaceProfile) {
  const raw = `${profile.projectName}-${profile.websiteUrl}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return raw || "";
}

function renderMarkdown(markdown: string) {
  const rendered = marked.parse(markdown);
  return typeof rendered === "string" ? rendered : "";
}

function toTitleCase(text: string) {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

function severityColor(s: Severity) {
  switch (s) {
    case "high": return { bg: "bg-[#fde8e8]", text: "text-[#E74C3C]", border: "border-[#E74C3C]/20" };
    case "medium": return { bg: "bg-[#fef3e2]", text: "text-[#F39C12]", border: "border-[#F39C12]/20" };
    case "low": return { bg: "bg-[#e6f7ee]", text: "text-[#27AE60]", border: "border-[#27AE60]/20" };
  }
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, change, positive }: { label: string; value: string; change: string; positive: boolean | null }) {
  return (
    <div className="card-shadow rounded-2xl border border-[#f0f0f0] bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#b5b5b5]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#34324a]">{value}</p>
      <p className={cn("mt-1 text-xs font-medium", positive === true ? "text-[#27AE60]" : positive === false ? "text-[#E74C3C]" : "text-[#6e6d74]")}>
        {change}
      </p>
    </div>
  );
}

/* ─── Panel Card ─── */
function PanelCard({ title, description, children, actions }: { title: string; description: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card-shadow rounded-2xl border border-[#f0f0f0] bg-white p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#34324a]">{title}</h2>
          <p className="mt-1 text-[13px] text-[#6e6d74]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

/* ─── Field ─── */
function Field({ label, value, onChange, placeholder, icon }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; icon: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e6d74]">{icon}{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[#f0f0f0] bg-white px-4 text-sm text-[#34324a] outline-none transition placeholder:text-[#b5b5b5] focus:border-[#6933fa] focus:ring-2 focus:ring-[#6933fa]/10"
      />
    </label>
  );
}

/* ─── LongField ─── */
function LongField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6e6d74]">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-xl border border-[#f0f0f0] bg-white px-4 py-3 text-sm leading-6 text-[#34324a] outline-none transition placeholder:text-[#b5b5b5] focus:border-[#6933fa] focus:ring-2 focus:ring-[#6933fa]/10"
      />
    </label>
  );
}

/* ─── Buttons ─── */
function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full bg-[#6933fa] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#3535f3] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border border-[#f0f0f0] bg-white px-4 py-2 text-[13px] font-medium text-[#6e6d74] transition hover:border-[#6933fa] hover:text-[#6933fa]"
    >
      {children}
    </button>
  );
}

/* ─── Info Card ─── */
function InfoCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="card-shadow rounded-2xl border border-[#f0f0f0] bg-white p-5">
      <div className="inline-flex rounded-xl bg-[#f7f5fc] p-3 text-[#6933fa]">{icon}</div>
      <h3 className="font-display mt-3 text-sm font-semibold text-[#34324a]">{title}</h3>
      <p className="mt-2 text-[13px] leading-6 text-[#6e6d74]">{description}</p>
    </div>
  );
}

/* ─── Assessment Result Card ─── */
function AssessmentResultCard({
  result,
  onClickIssue,
}: {
  result: TechnicalAuditResult;
  onClickIssue: (issue: TechnicalAuditResult["insights"]["technicalSeo"][0], evidence?: HtmlEvidence) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const allIssues = [...result.insights.technicalSeo, ...result.insights.pagePerformance, ...result.insights.contentQuality];
  const scoreColor = result.score >= 85 ? "text-[#27AE60]" : result.score >= 70 ? "text-[#F39C12]" : "text-[#E74C3C]";

  return (
    <div className="card-shadow rounded-2xl border border-[#f0f0f0] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-4">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold", scoreColor,
            result.score >= 85 ? "bg-[#e6f7ee]" : result.score >= 70 ? "bg-[#fef3e2]" : "bg-[#fde8e8]"
          )}>
            {result.score}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#34324a]">{result.title}</p>
            <p className="mt-0.5 text-xs text-[#6e6d74]">{result.finalUrl}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("rounded-full px-3 py-1 text-xs font-semibold",
            result.score >= 85 ? "bg-[#e6f7ee] text-[#27AE60]" : result.score >= 70 ? "bg-[#fef3e2] text-[#F39C12]" : "bg-[#fde8e8] text-[#E74C3C]"
          )}>
            {result.status}
          </span>
          <button type="button" onClick={() => setExpanded(!expanded)} className="rounded-lg p-2 text-[#6e6d74] transition hover:bg-[#f7f5fc]">
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-px border-t border-[#f0f0f0] bg-[#f0f0f0]">
        <MiniMetric label="Words" value={String(result.metrics.wordCount)} />
        <MiniMetric label="Links" value={String(result.metrics.internalLinks)} />
        <MiniMetric label="Images" value={String(result.metrics.images)} />
        <MiniMetric label="Issues" value={String(allIssues.length)} />
      </div>

      {/* Expanded issues */}
      {expanded ? (
        <div className="border-t border-[#f0f0f0] p-5">
          {/* Snapshot */}
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SnapshotItem label="Title" value={result.snapshot.titleTag || "Missing"} />
            <SnapshotItem label="Meta description" value={result.snapshot.metaDescription || "Missing"} />
            <SnapshotItem label="H1" value={result.snapshot.h1s[0] || "Missing"} />
            <SnapshotItem label="Canonical" value={result.snapshot.canonical || "Missing"} />
          </div>

          {/* Issues grouped */}
          {(["technicalSeo", "pagePerformance", "contentQuality"] as const).map((bucket) => {
            const issues = result.insights[bucket];
            if (!issues.length) return null;
            const bucketLabels = { technicalSeo: "Technical SEO", pagePerformance: "Performance", contentQuality: "Content Quality" };
            return (
              <div key={bucket} className="mb-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6933fa]">{bucketLabels[bucket]}</p>
                <div className="space-y-2">
                  {issues.map((issue) => {
                    const colors = severityColor(issue.severity);
                    const matchingEvidence = result.htmlEvidence.find((e) => e.label.toLowerCase().includes(issue.title.split(" ")[0].toLowerCase()));
                    return (
                      <button
                        key={issue.title}
                        type="button"
                        onClick={() => onClickIssue(issue, matchingEvidence)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all hover:shadow-sm",
                          colors.border, "bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", colors.bg, colors.text)}>
                            {issue.severity}
                          </span>
                          <span className="text-sm text-[#34324a]">{issue.title}</span>
                        </div>
                        <span className="text-xs text-[#6933fa]">View fix →</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Quick wins + Major fixes */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#27AE60]">Quick wins</p>
              {result.quickWins.map((w) => <p key={w} className="mt-1 text-xs text-[#6e6d74]">{w}</p>)}
            </div>
            <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#E74C3C]">Major fixes</p>
              {result.majorFixes.map((f) => <p key={f} className="mt-1 text-xs text-[#6e6d74]">{f}</p>)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3 text-center">
      <p className="text-xs text-[#b5b5b5]">{label}</p>
      <p className="text-sm font-semibold text-[#34324a]">{value}</p>
    </div>
  );
}

function SnapshotItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#b5b5b5]">{label}</p>
      <p className="mt-1 truncate text-xs text-[#34324a]">{value}</p>
    </div>
  );
}

/* ─── Fix Modal ─── */
function FixModal({
  issue,
  evidence,
  url,
  onClose,
}: {
  issue: { title: string; severity: Severity; evidence: string; action: string };
  evidence?: HtmlEvidence;
  url: string;
  onClose: () => void;
}) {
  const colors = severityColor(issue.severity);
  return (
    <div className="fix-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase", colors.bg, colors.text)}>
                {issue.severity}
              </span>
              <h3 className="text-lg font-semibold text-[#34324a]">{issue.title}</h3>
            </div>
            <p className="mt-1 text-xs text-[#6e6d74]">{url}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#b5b5b5] transition hover:bg-[#f7f5fc] hover:text-[#34324a]">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6e6d74]">Issue</p>
            <p className="mt-2 text-sm leading-6 text-[#34324a]">{issue.evidence}</p>
          </div>

          <div className="rounded-xl border border-[#e8e8fc] bg-[#f7f5fc] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6933fa]">Recommended Action</p>
            <p className="mt-2 text-sm leading-6 text-[#34324a]">{issue.action}</p>
          </div>

          {evidence ? (
            <>
              <div className="rounded-xl border border-[#E74C3C]/20 bg-[#fde8e8]/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#E74C3C]">Current State</p>
                <code className="mt-2 block overflow-x-auto rounded-lg bg-white p-3 text-xs text-[#34324a]">
                  {evidence.current}
                </code>
              </div>
              <div className="rounded-xl border border-[#27AE60]/20 bg-[#e6f7ee]/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#27AE60]">Recommended Fix</p>
                <code className="mt-2 block overflow-x-auto rounded-lg bg-white p-3 text-xs text-[#34324a]">
                  {evidence.solution}
                </code>
              </div>
              <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#6e6d74]">Why this matters</p>
                <p className="mt-2 text-sm leading-6 text-[#6e6d74]">{evidence.why}</p>
              </div>
            </>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Action Item ─── */
function ActionItem({ item }: { item: ActionPlanItem }) {
  const [open, setOpen] = useState(false);
  const colors = severityColor(item.impact);
  return (
    <div className="mb-3 rounded-xl border border-[#f0f0f0] bg-white p-4">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <div className="flex items-center gap-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", colors.bg, colors.text)}>{item.impact}</span>
          <span className="text-sm font-medium text-[#34324a]">{item.title}</span>
        </div>
        <ChevronRight className={cn("size-4 text-[#b5b5b5] transition", open && "rotate-90")} />
      </button>
      {open ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-[#6e6d74]">{item.why}</p>
          {item.steps.map((step) => (
            <div key={step} className="flex items-start gap-2 rounded-lg bg-[#fafafa] px-3 py-2 text-xs text-[#6e6d74]">
              <ChevronRight className="mt-0.5 size-3 shrink-0 text-[#6933fa]" />
              {step}
            </div>
          ))}
          <p className="text-xs text-[#b5b5b5]">Done when: {item.doneWhen}</p>
        </div>
      ) : null}
    </div>
  );
}

/* ─── Content Result View ─── */
function ContentResultView({
  result,
  pageType,
  onCopy,
}: {
  result: Record<string, unknown>;
  pageType: ContentPageType;
  onCopy: (text: string) => void;
}) {
  const content = (result as Record<string, Record<string, unknown>>).content || result;

  if (pageType === "ai-tool") {
    return <AIToolContentView content={content as Record<string, unknown>} onCopy={onCopy} />;
  }

  if (pageType === "blog") {
    return <BlogContentView content={content as Record<string, unknown>} onCopy={onCopy} />;
  }

  return <GenericContentView content={content as Record<string, unknown>} onCopy={onCopy} />;
}

/* ─── AI Tool Content View ─── */
function AIToolContentView({ content, onCopy }: { content: Record<string, unknown>; onCopy: (t: string) => void }) {
  const c = content as Record<string, unknown>;
  const howItWorks = (c.howItWorks || []) as Array<{ step: number; title: string; description: string }>;
  const features = (c.features || []) as Array<{ title: string; description: string }>;
  const useCases = (c.useCases || []) as Array<{ title: string; description: string }>;
  const tips = (c.tipsForBetterResults || []) as Array<{ title: string; description: string }>;
  const faq = (c.faq || []) as Array<{ question: string; answer: string }>;
  const relatedTools = (c.relatedTools || []) as string[];

  return (
    <div className="space-y-5">
      {/* Meta */}
      <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6933fa]">Meta Tags</p>
          <button type="button" onClick={() => onCopy(`<title>${c.metaTitle}</title>\n<meta name="description" content="${c.metaDescription}">`)} className="text-xs text-[#6933fa] hover:underline">Copy</button>
        </div>
        <p className="mt-2 text-sm font-medium text-[#34324a]">{String(c.metaTitle || "")}</p>
        <p className="mt-1 text-xs text-[#6e6d74]">{String(c.metaDescription || "")}</p>
      </div>

      {/* Hero */}
      <div className="rounded-xl border border-[#e8e8fc] bg-[#f7f5fc] p-5">
        <h2 className="font-display text-xl font-bold text-[#34324a]">{String(c.h1 || "")}</h2>
        <p className="mt-2 text-sm leading-6 text-[#6e6d74]">{String(c.heroDescription || "")}</p>
        <div className="mt-3 flex gap-2">
          <span className="rounded-full bg-[#6933fa] px-4 py-1.5 text-xs font-semibold text-white">{String(c.ctaPrimary || "Get Started")}</span>
          <span className="rounded-full border border-[#6933fa] px-4 py-1.5 text-xs font-semibold text-[#6933fa]">{String(c.ctaSecondary || "Learn More")}</span>
        </div>
      </div>

      {/* How it works */}
      {howItWorks.length ? (
        <div>
          <SectionLabel label="How It Works" />
          <div className="grid gap-3 sm:grid-cols-3">
            {howItWorks.map((step) => (
              <div key={step.step} className="rounded-xl border border-[#f0f0f0] bg-white p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6933fa] text-sm font-bold text-white">{step.step}</div>
                <p className="mt-3 text-sm font-semibold text-[#34324a]">{step.title}</p>
                <p className="mt-1 text-xs text-[#6e6d74]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Features */}
      {features.length ? (
        <div>
          <SectionLabel label="Features" />
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-[#f0f0f0] bg-white p-4">
                <p className="text-sm font-semibold text-[#34324a]">{f.title}</p>
                <p className="mt-1 text-xs text-[#6e6d74]">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Use Cases */}
      {useCases.length ? (
        <div>
          <SectionLabel label="Use Cases" />
          <div className="space-y-2">
            {useCases.map((u) => (
              <div key={u.title} className="rounded-xl border border-[#f0f0f0] bg-white p-4">
                <p className="text-sm font-semibold text-[#34324a]">{u.title}</p>
                <p className="mt-1 text-xs text-[#6e6d74]">{u.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Tips */}
      {tips.length ? (
        <div>
          <SectionLabel label="Tips for Better Results" />
          <div className="space-y-2">
            {tips.map((t) => (
              <div key={t.title} className="flex gap-3 rounded-xl border border-[#f0f0f0] bg-white p-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#27AE60]" />
                <div>
                  <p className="text-sm font-medium text-[#34324a]">{t.title}</p>
                  <p className="text-xs text-[#6e6d74]">{t.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* FAQ */}
      {faq.length ? (
        <div>
          <SectionLabel label="FAQ" />
          <div className="space-y-2">
            {faq.map((f) => (
              <FAQItem key={f.question} question={f.question} answer={f.answer} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Related Tools */}
      {relatedTools.length ? (
        <div>
          <SectionLabel label="Related Tools" />
          <div className="flex flex-wrap gap-2">
            {relatedTools.map((t) => (
              <span key={t} className="rounded-full border border-[#f0f0f0] bg-white px-3 py-1.5 text-xs text-[#6e6d74]">{t}</span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Schema */}
      {c.schemaMarkup ? (
        <div>
          <div className="flex items-center justify-between">
            <SectionLabel label="Schema Markup (JSON-LD)" />
            <button type="button" onClick={() => onCopy(String(c.schemaMarkup))} className="text-xs text-[#6933fa] hover:underline">Copy schema</button>
          </div>
          <pre className="mt-2 max-h-48 overflow-auto rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-3 text-[11px] text-[#6e6d74]">
            {String(c.schemaMarkup)}
          </pre>
        </div>
      ) : null}

      {/* Copy all */}
      <div className="flex gap-2">
        <GhostButton onClick={() => onCopy(JSON.stringify(content, null, 2))}>
          <Copy className="size-3.5" />
          Copy all as JSON
        </GhostButton>
      </div>
    </div>
  );
}

/* ─── Blog Content View ─── */
function BlogContentView({ content, onCopy }: { content: Record<string, unknown>; onCopy: (t: string) => void }) {
  const c = content as Record<string, unknown>;
  const sections = (c.sections || []) as Array<{ h2: string; content: string; h3s?: Array<{ title: string; content: string }> }>;
  const faq = (c.faq || []) as Array<{ question: string; answer: string }>;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6933fa]">Meta</p>
        <p className="mt-2 text-sm font-medium text-[#34324a]">{String(c.metaTitle || "")}</p>
        <p className="mt-1 text-xs text-[#6e6d74]">{String(c.metaDescription || "")}</p>
      </div>

      <div className="rounded-xl border border-[#e8e8fc] bg-[#f7f5fc] p-5">
        <h2 className="font-display text-xl font-bold text-[#34324a]">{String(c.h1 || "")}</h2>
        <p className="mt-2 text-sm leading-6 text-[#6e6d74]">{String(c.introduction || "")}</p>
      </div>

      {sections.map((s) => (
        <div key={s.h2} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
          <h3 className="text-base font-semibold text-[#34324a]">{s.h2}</h3>
          <p className="mt-2 text-sm leading-7 text-[#6e6d74]">{s.content}</p>
          {s.h3s?.map((h3) => (
            <div key={h3.title} className="mt-4 rounded-lg bg-[#fafafa] p-3">
              <p className="text-sm font-medium text-[#34324a]">{h3.title}</p>
              <p className="mt-1 text-xs leading-6 text-[#6e6d74]">{h3.content}</p>
            </div>
          ))}
        </div>
      ))}

      {c.conclusion ? (
        <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6933fa]">Conclusion</p>
          <p className="mt-2 text-sm leading-6 text-[#6e6d74]">{String(c.conclusion)}</p>
        </div>
      ) : null}

      {faq.length ? (
        <div>
          <SectionLabel label="FAQ" />
          {faq.map((f) => <FAQItem key={f.question} question={f.question} answer={f.answer} />)}
        </div>
      ) : null}

      <GhostButton onClick={() => onCopy(JSON.stringify(content, null, 2))}>
        <Copy className="size-3.5" /> Copy all as JSON
      </GhostButton>
    </div>
  );
}

/* ─── Generic Content View ─── */
function GenericContentView({ content, onCopy }: { content: Record<string, unknown>; onCopy: (t: string) => void }) {
  const c = content as Record<string, unknown>;
  const sections = (c.sections || []) as Array<{ h2: string; content: string }>;
  const faq = (c.faq || []) as Array<{ question: string; answer: string }>;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6933fa]">Meta</p>
        <p className="mt-2 text-sm font-medium text-[#34324a]">{String(c.metaTitle || "")}</p>
        <p className="mt-1 text-xs text-[#6e6d74]">{String(c.metaDescription || "")}</p>
      </div>

      <div className="rounded-xl border border-[#e8e8fc] bg-[#f7f5fc] p-5">
        <h2 className="font-display text-xl font-bold text-[#34324a]">{String(c.h1 || "")}</h2>
        <p className="mt-2 text-sm leading-6 text-[#6e6d74]">{String(c.heroDescription || "")}</p>
      </div>

      {sections.map((s) => (
        <div key={s.h2} className="rounded-xl border border-[#f0f0f0] bg-white p-5">
          <h3 className="text-base font-semibold text-[#34324a]">{s.h2}</h3>
          <p className="mt-2 text-sm leading-7 text-[#6e6d74]">{s.content}</p>
        </div>
      ))}

      {faq.length ? (
        <div>
          <SectionLabel label="FAQ" />
          {faq.map((f) => <FAQItem key={f.question} question={f.question} answer={f.answer} />)}
        </div>
      ) : null}

      <GhostButton onClick={() => onCopy(JSON.stringify(content, null, 2))}>
        <Copy className="size-3.5" /> Copy all as JSON
      </GhostButton>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6933fa]">{label}</p>;
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-white">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-medium text-[#34324a]">{question}</span>
        <ChevronRight className={cn("size-4 text-[#b5b5b5] transition", open && "rotate-90")} />
      </button>
      {open ? (
        <div className="border-t border-[#f0f0f0] px-4 py-3">
          <p className="text-sm leading-6 text-[#6e6d74]">{answer}</p>
        </div>
      ) : null}
    </div>
  );
}
