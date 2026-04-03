"use client";

import { startTransition, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { marked } from "marked";
import {
  ArrowLeft,
  ArrowRight,
  BookText,
  CheckCircle2,
  Database,
  Copy,
  Download,
  EllipsisVertical,
  FilePlus2,
  FileSearch,
  Globe2,
  Gauge,
  Hammer,
  History,
  LayoutGrid,
  Link2,
  Monitor,
  NotebookPen,
  RefreshCcw,
  Rocket,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type {
  AuditActionPlan,
  ActionPlanItem,
  DraftKind,
  GeneratedPageDraft,
  KeywordCluster,
  KeywordReport,
  NewPageOpportunity,
  SavedStrategyDraft,
  Severity,
  SharedWorkspaceState,
  TechnicalAuditResult,
  WorkspaceProfile,
} from "@/lib/studio-types";

type WorkflowTab = "strategy" | "audit" | "keywords" | "actions" | "pages" | "settings";

type NewPageForm = {
  pageTitle: string;
  targetKeyword: string;
  pageGoal: string;
  pageType: string;
  notes: string;
};

const PROFILE_STORAGE_KEY = "fynd-personal-seo-profile";
const HISTORY_STORAGE_KEY = "fynd-personal-seo-history";
const AUDIT_STORAGE_KEY = "fynd-personal-seo-audit";
const ACTIONS_STORAGE_KEY = "fynd-personal-seo-actions";
const KEYWORDS_STORAGE_KEY = "fynd-personal-seo-keywords";
const PAGE_FORM_STORAGE_KEY = "fynd-personal-seo-page-form";
const PAGE_DRAFT_STORAGE_KEY = "fynd-personal-seo-page-draft";

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

const sampleProfile: WorkspaceProfile = {
  projectName: "Northstar Running Notes",
  websiteUrl: "https://northstarrunningnotes.com",
  audience: "Curious runners who want practical training advice without elite-athlete jargon",
  offer: "A personal brand publishing training guides, lightweight coaching offers, and email courses",
  differentiators: "Practical lived experience, clear explanations, and an editorial tone that respects beginner runners",
  goals: "Grow organic traffic, build an email list, and turn core category pages into product discovery paths",
  voice: "Thoughtful, practical, warm, and lightly opinionated",
  notes: "Favor realistic SEO moves a solo creator can ship. Keep the plan commercially useful, not just informational.",
};

const emptyNewPageForm: NewPageForm = {
  pageTitle: "",
  targetKeyword: "",
  pageGoal: "",
  pageType: "landing page",
  notes: "",
};

const deliverables: Array<{
  id: DraftKind;
  label: string;
  eyebrow: string;
  description: string;
}> = [
  {
    id: "strategy-snapshot",
    label: "Strategy Snapshot",
    eyebrow: "Big picture",
    description: "A fast operator memo with positioning, keyword themes, and a 30-day execution plan.",
  },
  {
    id: "content-calendar",
    label: "Content Calendar",
    eyebrow: "Publishing rhythm",
    description: "A practical publishing slate with topic sequencing, intent, and CTA logic.",
  },
  {
    id: "article-brief",
    label: "Article Brief",
    eyebrow: "Execution",
    description: "A sharp brief for one page with angle, outline, proof points, and CTA guidance.",
  },
  {
    id: "homepage-refresh",
    label: "Homepage Refresh",
    eyebrow: "Messaging",
    description: "A critique plus homepage copy rewrite focused on conversion and search clarity.",
  },
  {
    id: "content-audit",
    label: "Content Audit",
    eyebrow: "Diagnosis",
    description: "A quick audit of content strengths, weak spots, refresh opportunities, and fast wins.",
  },
];

const workflows: Array<{
  id: WorkflowTab;
  label: string;
  eyebrow: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    id: "strategy",
    label: "Dashboard",
    eyebrow: "Audit",
    description: "Overview, strategy drafts, and the current SEO operating state.",
    icon: <LayoutGrid className="size-4" />,
  },
  {
    id: "keywords",
    label: "Basic SEO",
    eyebrow: "Audit",
    description: "Keyword clustering, intent mapping, and foundational SEO opportunities.",
    icon: <ShieldCheck className="size-4" />,
  },
  {
    id: "actions",
    label: "Advanced",
    eyebrow: "Audit",
    description: "Turn the latest audit into a concrete fix backlog and follow-up page ideas.",
    icon: <Rocket className="size-4" />,
  },
  {
    id: "audit",
    label: "PageSpeed",
    eyebrow: "Audit",
    description: "Run a page-speed style audit with HTML evidence, quick wins, and major fixes.",
    icon: <Gauge className="size-4" />,
  },
  {
    id: "pages",
    label: "Pages",
    eyebrow: "Audit",
    description: "Draft fresh SEO pages with metadata, structure, CTA, and publishing copy.",
    icon: <FilePlus2 className="size-4" />,
  },
  {
    id: "settings",
    label: "Settings",
    eyebrow: "Settings",
    description: "Project profile, shared workspace, and deployment-aware storage controls.",
    icon: <Settings2 className="size-4" />,
  },
];

type PersonalSeoWorkspaceProps = {
  legacyPath: string | null;
};

export default function PersonalSeoWorkspace({
  legacyPath,
}: PersonalSeoWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkflowTab>("audit");
  const [profile, setProfile] = useState<WorkspaceProfile>(emptyProfile);
  const [kind, setKind] = useState<DraftKind>("strategy-snapshot");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [constraints, setConstraints] = useState("");
  const [activeDraft, setActiveDraft] = useState<SavedStrategyDraft | null>(null);
  const [history, setHistory] = useState<SavedStrategyDraft[]>([]);
  const [auditUrl, setAuditUrl] = useState("");
  const [auditResult, setAuditResult] = useState<TechnicalAuditResult | null>(null);
  const [actionPlan, setActionPlan] = useState<AuditActionPlan | null>(null);
  const [keywordSeed, setKeywordSeed] = useState("");
  const [keywordReport, setKeywordReport] = useState<KeywordReport | null>(null);
  const [workspaceKey, setWorkspaceKey] = useState("");
  const [workspaceStorage, setWorkspaceStorage] = useState<"local-only" | "neo4j" | "unknown">(
    "unknown"
  );
  const [sharedLoading, setSharedLoading] = useState(false);
  const [pageForm, setPageForm] = useState<NewPageForm>(emptyNewPageForm);
  const [pageDraft, setPageDraft] = useState<GeneratedPageDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [auditDevice, setAuditDevice] = useState<"mobile" | "desktop">("mobile");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    marked.setOptions({ breaks: true, gfm: true });

    try {
      const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      const savedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      const savedAudit = window.localStorage.getItem(AUDIT_STORAGE_KEY);
      const savedActions = window.localStorage.getItem(ACTIONS_STORAGE_KEY);
      const savedKeywords = window.localStorage.getItem(KEYWORDS_STORAGE_KEY);
      const savedPageForm = window.localStorage.getItem(PAGE_FORM_STORAGE_KEY);
      const savedPageDraft = window.localStorage.getItem(PAGE_DRAFT_STORAGE_KEY);
      const params = new URLSearchParams(window.location.search);
      const sharedKey = params.get("project")?.trim() || "";

      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile) as WorkspaceProfile;
        setProfile(parsedProfile);
        setAuditUrl(parsedProfile.websiteUrl || "");
        setWorkspaceKey(sharedKey || createWorkspaceKey(parsedProfile));
      }

      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as SavedStrategyDraft[];
        setHistory(parsedHistory);
        setActiveDraft(parsedHistory[0] ?? null);
      }

      if (savedAudit) {
        const parsedAudit = JSON.parse(savedAudit) as TechnicalAuditResult;
        setAuditResult(parsedAudit);
        setAuditUrl(parsedAudit.url);
      }

      if (savedActions) {
        setActionPlan(JSON.parse(savedActions) as AuditActionPlan);
      }

      if (savedKeywords) {
        setKeywordReport(JSON.parse(savedKeywords) as KeywordReport);
      }

      if (savedPageForm) {
        setPageForm(JSON.parse(savedPageForm) as NewPageForm);
      }

      if (savedPageDraft) {
        setPageDraft(JSON.parse(savedPageDraft) as GeneratedPageDraft);
      }

      if (!savedProfile && sharedKey) {
        setWorkspaceKey(sharedKey);
      }
    } catch (error) {
      console.error("Failed to load local workspace state", error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const params = new URLSearchParams(window.location.search);
    const sharedKey = params.get("project")?.trim() || "";

    if (!sharedKey) {
      return;
    }

    setSharedLoading(true);

    void fetch(`/api/workspace?key=${encodeURIComponent(sharedKey)}`)
      .then(async (response) => {
        const data = (await response.json()) as {
          key?: string;
          storage?: "local-only" | "neo4j";
          workspace?: SharedWorkspaceState | null;
        };

        if (!response.ok) {
          return;
        }

        setWorkspaceKey(data.key || sharedKey);
        setWorkspaceStorage(data.storage || "unknown");

        if (data.workspace) {
          applyWorkspaceState(data.workspace);
          toast.success("Shared workspace loaded");
        }
      })
      .finally(() => {
        setSharedLoading(false);
      });
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [hydrated, profile]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [hydrated, history]);

  useEffect(() => {
    if (!hydrated) return;

    if (auditResult) {
      window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(auditResult));
    } else {
      window.localStorage.removeItem(AUDIT_STORAGE_KEY);
    }
  }, [auditResult, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    if (actionPlan) {
      window.localStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(actionPlan));
    } else {
      window.localStorage.removeItem(ACTIONS_STORAGE_KEY);
    }
  }, [actionPlan, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    if (keywordReport) {
      window.localStorage.setItem(KEYWORDS_STORAGE_KEY, JSON.stringify(keywordReport));
    } else {
      window.localStorage.removeItem(KEYWORDS_STORAGE_KEY);
    }
  }, [hydrated, keywordReport]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(PAGE_FORM_STORAGE_KEY, JSON.stringify(pageForm));
  }, [hydrated, pageForm]);

  useEffect(() => {
    if (!hydrated) return;

    if (pageDraft) {
      window.localStorage.setItem(PAGE_DRAFT_STORAGE_KEY, JSON.stringify(pageDraft));
    } else {
      window.localStorage.removeItem(PAGE_DRAFT_STORAGE_KEY);
    }
  }, [hydrated, pageDraft]);

  const strategyHtml = renderMarkdown(activeDraft?.content || "");
  const pageDraftHtml = renderMarkdown(pageDraft?.markdown || "");
  const totalAssets =
    history.length +
    (auditResult ? 1 : 0) +
    (keywordReport ? 1 : 0) +
    (actionPlan ? 1 : 0) +
    (pageDraft ? 1 : 0);
  const keywordProvider = keywordReport?.provider || "local-fallback";
  const keywordProviderLabel = keywordReport?.providerLabel || "Local keyword model";
  const keywordProviderNote =
    keywordReport?.providerNote ||
    "The keyword map is currently using the local model. Add a website URL and a working Ahrefs key to enrich it with live search data.";
  const keywordSiteMetrics = keywordReport?.siteMetrics || [];
  const keywordCompetitors = keywordReport?.competitors || [];
  const activeView = workflows.find((item) => item.id === activeTab) || workflows[3];
  const operationsOverview = [
    {
      label: "Crawler",
      value: "Open-source HTML pass",
      detail: "Cheerio-backed technical inspection with robots and sitemap checks.",
    },
    {
      label: "Intelligence",
      value: keywordReport ? keywordProviderLabel : "Ahrefs when available",
      detail: keywordReport
        ? keywordProvider === "ahrefs"
          ? "Live Ahrefs enrichment is active for the current keyword map."
          : "The local fallback model is active and keeps the workflow available if Ahrefs fails."
        : "Live Ahrefs enrichment with an automatic local fallback.",
    },
    {
      label: "Storage",
      value: workspaceStorage === "unknown" ? "Local-first" : workspaceStorage,
      detail:
        workspaceStorage === "neo4j"
          ? "Shared workspace is connected."
          : "Browser storage stays active even when Neo4j is unavailable.",
    },
    {
      label: "Publishing flow",
      value: "Audit -> actions -> pages",
      detail: "Move from diagnosis into fix plans, keyword priorities, and ready-to-edit drafts.",
    },
  ];

  function buildWorkspaceState(nextKey?: string): SharedWorkspaceState {
    const key = (nextKey || workspaceKey || createWorkspaceKey(profile)).trim() || "default-workspace";

    return {
      key,
      profile,
      history,
      auditResult,
      actionPlan,
      keywordReport,
      pageDraft,
      updatedAt: new Date().toISOString(),
    };
  }

  function applyWorkspaceState(workspace: SharedWorkspaceState) {
    setWorkspaceKey(workspace.key);
    setProfile(workspace.profile);
    setHistory(workspace.history || []);
    setActiveDraft(workspace.history?.[0] ?? null);
    setAuditResult(workspace.auditResult || null);
    setActionPlan(workspace.actionPlan || null);
    setKeywordReport(workspace.keywordReport || null);
    setPageDraft(workspace.pageDraft || null);
    setAuditUrl(workspace.auditResult?.url || workspace.profile.websiteUrl || "");
  }

  async function loadSharedWorkspace(rawKey?: string) {
    const key = (rawKey || workspaceKey || createWorkspaceKey(profile)).trim();

    if (!key) {
      toast.error("Add a workspace key first.");
      return;
    }

    setSharedLoading(true);

    try {
      const response = await fetch(`/api/workspace?key=${encodeURIComponent(key)}`);
      const data = (await response.json()) as {
        key?: string;
        storage?: "local-only" | "neo4j";
        workspace?: SharedWorkspaceState | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "The shared workspace could not be loaded.");
      }

      setWorkspaceKey(data.key || key);
      setWorkspaceStorage(data.storage || "unknown");

      if (data.workspace) {
        applyWorkspaceState(data.workspace);
        toast.success("Shared workspace loaded");
      } else if (data.storage === "local-only") {
        toast.message("Neo4j is not configured yet. Workspace stays local for now.");
      } else {
        toast.message("No shared workspace exists for this key yet.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The shared workspace could not be loaded.";
      toast.error(message);
    } finally {
      setSharedLoading(false);
    }
  }

  async function saveSharedWorkspace() {
    const state = buildWorkspaceState();

    setSharedLoading(true);

    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });

      const data = (await response.json()) as {
        key?: string;
        storage?: "local-only" | "neo4j";
        saved?: boolean;
        workspace?: SharedWorkspaceState;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "The shared workspace could not be saved.");
      }

      setWorkspaceKey(data.key || state.key);
      setWorkspaceStorage(data.storage || "unknown");

      if (data.workspace) {
        applyWorkspaceState(data.workspace);
      }

      if (data.saved) {
        updateShareUrl(data.key || state.key);
        toast.success("Workspace saved to Neo4j");
      } else {
        toast.message("Neo4j is not configured yet. Workspace stayed local.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The shared workspace could not be saved.";
      toast.error(message);
    } finally {
      setSharedLoading(false);
    }
  }

  async function handleGenerateStrategy() {
    setDraftLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          focusKeyword,
          constraints,
          ...profile,
        }),
      });

      const data = (await response.json()) as {
        content?: string;
        title?: string;
        createdAt?: string;
        error?: string;
      };

      if (!response.ok || !data.content || !data.createdAt || !data.title) {
        throw new Error(data.error || "The draft could not be generated.");
      }

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
        setHistory((current) => [item, ...current].slice(0, 12));
      });

      toast.success("Strategy draft generated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The draft could not be generated.";
      toast.error(message);
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleRunAudit() {
    const url = auditUrl.trim() || profile.websiteUrl.trim();

    if (!url) {
      toast.error("Add a URL before running the audit.");
      return;
    }

    setAuditLoading(true);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = (await response.json()) as TechnicalAuditResult & { error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "The audit could not be completed.");
      }

      startTransition(() => {
        setAuditResult(data);
        setActionPlan(null);
        setKeywordReport(null);
        setAuditUrl(data.finalUrl);
        setProfile((current) => ({
          ...current,
          websiteUrl: current.websiteUrl || data.finalUrl,
          projectName: current.projectName || data.title,
        }));
      });

      toast.success("Technical audit completed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The audit could not be completed.";
      toast.error(message);
    } finally {
      setAuditLoading(false);
    }
  }

  async function handleGenerateActions() {
    if (!auditResult) {
      toast.error("Run a technical audit before generating action items.");
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch("/api/fix-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          audit: auditResult,
        }),
      });

      const data = (await response.json()) as AuditActionPlan & { error?: string };

      if (!response.ok || !data.headline) {
        throw new Error(data.error || "The action plan could not be generated.");
      }

      setActionPlan(data);
      toast.success("Fix-action plan generated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The action plan could not be generated.";
      toast.error(message);
    } finally {
      setActionLoading(false);
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
          audit: auditResult,
          actionPlan,
          pageDraft,
          seed: keywordSeed,
        }),
      });

      const data = (await response.json()) as KeywordReport & { error?: string };

      if (!response.ok || !data.headline) {
        throw new Error(data.error || "The keyword map could not be generated.");
      }

      setKeywordReport(data);
      toast.success(
        data.provider === "ahrefs"
          ? "Keyword map generated with Ahrefs + local model"
          : "Keyword map generated with the local fallback model"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The keyword map could not be generated.";
      toast.error(message);
    } finally {
      setKeywordLoading(false);
    }
  }

  async function handleGeneratePageDraft() {
    if (!pageForm.pageTitle.trim() || !pageForm.targetKeyword.trim()) {
      toast.error("Add a page title and target keyword first.");
      return;
    }

    setPageLoading(true);

    try {
      const response = await fetch("/api/new-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          ...pageForm,
          audit: auditResult,
          actionPlan,
        }),
      });

      const data = (await response.json()) as GeneratedPageDraft & { error?: string };

      if (!response.ok || !data.markdown) {
        throw new Error(data.error || "The page draft could not be generated.");
      }

      setPageDraft(data);
      toast.success("New page draft generated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The page draft could not be generated.";
      toast.error(message);
    } finally {
      setPageLoading(false);
    }
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error("Clipboard access failed");
    }
  }

  function updateShareUrl(key: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("project", key);
    window.history.replaceState({}, "", url.toString());
  }

  async function copyShareLink() {
    const key = (workspaceKey || createWorkspaceKey(profile)).trim();

    if (!key) {
      toast.error("Add a workspace key first.");
      return;
    }

    updateShareUrl(key);
    await copyText(window.location.href, "Share link copied");
  }

  function downloadText(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);

    toast.success("Markdown exported");
  }

  function applyOpportunity(opportunity: NewPageOpportunity) {
    setPageForm({
      pageTitle: opportunity.title,
      targetKeyword: opportunity.targetKeyword,
      pageGoal: opportunity.reason,
      pageType: opportunity.pageType,
      notes: `Prompted from the latest action plan. Priority: ${opportunity.priority}.`,
    });
    setActiveTab("pages");
    toast.success("Page idea moved into the generator");
  }

  function applyKeyword(keyword: string) {
    setPageForm((current) => ({
      ...current,
      targetKeyword: keyword,
      pageTitle: current.pageTitle || toTitleCase(keyword),
    }));
    setActiveTab("pages");
    toast.success("Keyword moved into the page generator");
  }

  function loadSample() {
    setProfile(sampleProfile);
    setAuditUrl(sampleProfile.websiteUrl);
    setWorkspaceKey(createWorkspaceKey(sampleProfile));
    setKeywordSeed("running plan for beginners");
    setPageForm({
      pageTitle: "Half marathon coaching for beginners",
      targetKeyword: "half marathon coaching for beginners",
      pageGoal: "Create a commercial landing page that also supports informational internal links.",
      pageType: "service page",
      notes: "Keep the offer approachable and realistic for non-elite runners.",
    });
    toast.success("Sample project loaded");
  }

  function resetWorkspace() {
    setProfile(emptyProfile);
    setFocusKeyword("");
    setConstraints("");
    setActiveDraft(null);
    setHistory([]);
    setAuditUrl("");
    setAuditResult(null);
    setActionPlan(null);
    setKeywordSeed("");
    setKeywordReport(null);
    setPageForm(emptyNewPageForm);
    setPageDraft(null);
    setWorkspaceKey("");
    setWorkspaceStorage("unknown");

    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    window.localStorage.removeItem(AUDIT_STORAGE_KEY);
    window.localStorage.removeItem(ACTIONS_STORAGE_KEY);
    window.localStorage.removeItem(KEYWORDS_STORAGE_KEY);
    window.localStorage.removeItem(PAGE_FORM_STORAGE_KEY);
    window.localStorage.removeItem(PAGE_DRAFT_STORAGE_KEY);
    const url = new URL(window.location.href);
    url.searchParams.delete("project");
    window.history.replaceState({}, "", url.toString());

    toast.success("Local workspace cleared");
  }

  return (
    <main className="min-h-screen bg-[#050816] text-[#dbe8ff]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[248px] border-r border-[#15223c] bg-[#0e1525] md:flex md:flex-col">
          <div className="flex items-center gap-3 border-b border-[#15223c] px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eef2f7] text-[#111827] shadow-sm">
              <Sparkles className="size-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#f8fbff]">SEO - Growth</p>
              <p className="text-xs text-[#60708d]">SEO Health Check</p>
            </div>
          </div>

          <div className="flex-1 px-3 py-5">
            <div className="space-y-1">
              {workflows
                .filter((item) => item.id !== "settings")
                .map((workflow) => (
                  <button
                    key={workflow.id}
                    type="button"
                    onClick={() => setActiveTab(workflow.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition",
                      activeTab === workflow.id
                        ? "bg-[#162846] text-[#7db0ff]"
                        : "text-[#b4bfd2] hover:bg-[#121d33] hover:text-[#f8fbff]"
                    )}
                  >
                    <span className={cn(activeTab === workflow.id ? "text-[#69a6ff]" : "text-[#6d7f9d]")}>
                      {workflow.icon}
                    </span>
                    <span>{workflow.label}</span>
                  </button>
                ))}
            </div>

            <div className="mt-6 border-t border-[#15223c] pt-5">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#60708d]">
                Settings
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition",
                  activeTab === "settings"
                    ? "bg-[#162846] text-[#7db0ff]"
                    : "text-[#b4bfd2] hover:bg-[#121d33] hover:text-[#f8fbff]"
                )}
              >
                <span className={cn(activeTab === "settings" ? "text-[#69a6ff]" : "text-[#6d7f9d]")}>
                  <Settings2 className="size-4" />
                </span>
                <span>Settings</span>
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[58px] items-center justify-between border-b border-[#d7dde8] bg-[#eef2f7] px-4 text-[#111827] shadow-[0_1px_0_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("audit")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#4f46e5] transition hover:bg-[#dfe7f4]"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ffffff] text-[#6b7280] shadow-sm">
                <Sparkles className="size-4" />
              </div>
              <span className="text-[15px] font-semibold">SEO - Growth</span>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#4b5563] transition hover:bg-[#dfe7f4]"
            >
              <EllipsisVertical className="size-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mb-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-[#69a6ff]">
                    {activeView.icon}
                    <h1 className="text-[17px] font-semibold text-[#f8fbff]">{activeView.label}</h1>
                  </div>
                  <p className="mt-1 text-[13px] text-[#7f8ea8]">{activeView.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-[#1c2a45] bg-[#0d1528] px-3 py-1.5 text-[11px] font-medium text-[#93a4bf]">
                    Storage: {workspaceStorage === "unknown" ? "not checked" : workspaceStorage}
                  </span>
                  <span className="rounded-md border border-[#1c2a45] bg-[#0d1528] px-3 py-1.5 text-[11px] font-medium text-[#93a4bf]">
                    Ahrefs: {keywordProvider === "ahrefs" ? "live" : "fallback"}
                  </span>
                </div>
              </div>

              {legacyPath ? (
                <div className="mt-3 rounded-xl border border-[#1c2a45] bg-[#0d1528] px-4 py-3 text-[12px] text-[#8ea0bc]">
                  Opened from legacy path <span className="font-semibold text-[#dbe8ff]">{legacyPath}</span>.
                </div>
              ) : null}
            </motion.section>

            {activeTab === "settings" ? (
              <motion.section
                key="settings-shell"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.24 }}
                className="mb-6 space-y-6"
              >
                <div className="grid gap-4 lg:grid-cols-4">
                  <StatCard label="Saved assets" value={String(totalAssets).padStart(2, "0")} />
                  <StatCard label="Strategy drafts" value={String(history.length).padStart(2, "0")} />
                  <StatCard label="Audit score" value={auditResult ? String(auditResult.score) : "--"} />
                  <StatCard label="Page drafts" value={pageDraft ? "01" : "00"} />
                </div>

                <div className="grid gap-4 lg:grid-cols-4">
                  {operationsOverview.map((item) => (
                    <MiniInfoCard key={item.label} label={item.label} value={item.detail} />
                  ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                  <PanelCard
                    eyebrow="Project settings"
                    title="Give SEO - Growth real context"
                    description="This is the shared profile used across audits, actions, keyword mapping, and page drafting."
                    actions={
                      <>
                        <GhostButton onClick={loadSample}>
                          <Sparkles className="size-4" />
                          Load sample
                        </GhostButton>
                        <GhostButton onClick={resetWorkspace}>
                          <RefreshCcw className="size-4" />
                          Clear local data
                        </GhostButton>
                      </>
                    }
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Project name"
                        icon={<NotebookPen className="size-4" />}
                        value={profile.projectName}
                        onChange={(value) => setProfile((current) => ({ ...current, projectName: value }))}
                        placeholder="Personal brand, side project, or focused site name"
                      />
                      <Field
                        label="Website URL"
                        icon={<Globe2 className="size-4" />}
                        value={profile.websiteUrl}
                        onChange={(value) => {
                          setProfile((current) => ({ ...current, websiteUrl: value }));
                          setAuditUrl(value);
                        }}
                        placeholder="https://example.com"
                      />
                      <LongField
                        label="Audience"
                        value={profile.audience}
                        onChange={(value) => setProfile((current) => ({ ...current, audience: value }))}
                        placeholder="Who the site serves, what they already know, and where they get stuck."
                      />
                      <LongField
                        label="Offer"
                        value={profile.offer}
                        onChange={(value) => setProfile((current) => ({ ...current, offer: value }))}
                        placeholder="What the site sells, teaches, or helps users accomplish."
                      />
                      <LongField
                        label="Differentiators"
                        value={profile.differentiators}
                        onChange={(value) => setProfile((current) => ({ ...current, differentiators: value }))}
                        placeholder="Why this project deserves attention over alternatives."
                      />
                      <LongField
                        label="Goals"
                        value={profile.goals}
                        onChange={(value) => setProfile((current) => ({ ...current, goals: value }))}
                        placeholder="Traffic, conversion, authority, email signups, lead flow, or category ownership."
                      />
                      <LongField
                        label="Voice"
                        value={profile.voice}
                        onChange={(value) => setProfile((current) => ({ ...current, voice: value }))}
                        placeholder="Direct, warm, analytical, premium, practical..."
                      />
                      <LongField
                        label="Notes"
                        value={profile.notes}
                        onChange={(value) => setProfile((current) => ({ ...current, notes: value }))}
                        placeholder="Any guardrails, constraints, or business context the assistant should respect."
                      />
                    </div>
                  </PanelCard>

                  <PanelCard
                    eyebrow="Shared workspace"
                    title="Neo4j and sharing controls"
                    description="Use a stable key so the team can open the same project state when Neo4j is connected to a public host."
                  >
                    <div className="grid gap-4">
                      <Field
                        label="Workspace key"
                        icon={<Database className="size-4" />}
                        value={workspaceKey}
                        onChange={setWorkspaceKey}
                        placeholder="northstar-running-notes"
                      />
                      <div className="flex flex-wrap gap-3">
                        <PrimaryButton onClick={() => void loadSharedWorkspace()} disabled={sharedLoading}>
                          <Database className="size-4" />
                          {sharedLoading ? "Loading..." : "Load shared"}
                        </PrimaryButton>
                        <GhostButton onClick={() => void saveSharedWorkspace()}>
                          <Database className="size-4" />
                          {sharedLoading ? "Saving..." : "Save shared"}
                        </GhostButton>
                        <GhostButton onClick={() => void copyShareLink()}>
                          <Link2 className="size-4" />
                          Copy link
                        </GhostButton>
                      </div>
                      <div className="grid gap-3">
                        <MiniInfoCard
                          label="Workspace status"
                          value={
                            workspaceStorage === "neo4j"
                              ? "Neo4j is connected and shared workspaces are available."
                              : "The app is still local-first. Use a public Neo4j instance like Aura for deployed team sharing."
                          }
                        />
                        <MiniInfoCard
                          label="Recommended flow"
                          value="Run PageSpeed, review Basic SEO keywords, convert issues into Advanced actions, then ship the next Page draft."
                        />
                      </div>
                    </div>
                  </PanelCard>
                </div>
              </motion.section>
            ) : null}

            <AnimatePresence mode="wait">
          {activeTab === "strategy" ? (
            <motion.section
              key="strategy"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.28 }}
              className="mt-6 grid gap-6 xl:grid-cols-[0.38fr_0.62fr]"
            >
              <PanelCard
                eyebrow="Dashboard"
                title="Generate operator-ready strategy drafts"
                description="Use the dashboard to shape content calendars, briefs, refreshes, and high-level SEO direction."
              >
                <div className="grid gap-3">
                  {deliverables.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setKind(item.id)}
                        className={cn(
                          "rounded-[1.4rem] border p-4 text-left transition-all",
                          kind === item.id
                            ? "border-[#d1582a]/35 bg-[#2a1d18] text-white"
                            : "border-[#1f2d4b] bg-[#10192d] text-[#f8fbff] hover:border-[#315aa4]"
                        )}
                      >
                      <p
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-[0.22em]",
                          kind === item.id ? "text-white/56" : "text-[#7db0ff]"
                        )}
                      >
                        {item.eyebrow}
                      </p>
                      <p className="mt-2 text-base font-semibold">{item.label}</p>
                      <p
                        className={cn(
                          "mt-2 text-sm leading-6",
                          kind === item.id ? "text-white/72" : "text-[#6f5a4d]"
                        )}
                      >
                        {item.description}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid gap-4">
                  <Field
                    label="Focus keyword"
                    icon={<Target className="size-4" />}
                    value={focusKeyword}
                    onChange={setFocusKeyword}
                    placeholder="Optional topic or target keyword"
                  />
                  <LongField
                    label="Constraints"
                    value={constraints}
                    onChange={setConstraints}
                    placeholder="Required angle, exclusions, pacing, format preferences, or business constraints."
                  />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <PrimaryButton onClick={handleGenerateStrategy} disabled={draftLoading}>
                    {draftLoading ? <WandSparkles className="size-4 animate-pulse" /> : <Sparkles className="size-4" />}
                    {draftLoading ? "Generating draft..." : "Generate draft"}
                    <ArrowRight className="size-4" />
                  </PrimaryButton>
                </div>

                <div className="mt-6 border-t border-[#1f2d4b] pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7db0ff]">
                        Recent drafts
                      </p>
                      <p className="mt-1 text-sm text-[#7f8ea8]">Switch between the latest saved outputs.</p>
                    </div>
                    <History className="size-4 text-[#7db0ff]" />
                  </div>

                  <div className="space-y-3">
                    {history.length ? (
                      history.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveDraft(item)}
                          className={cn(
                            "w-full rounded-[1.3rem] border px-4 py-3 text-left transition-all",
                            activeDraft?.id === item.id
                              ? "border-[#d1582a]/35 bg-[#2a1d18] text-white"
                              : "border-[#1f2d4b] bg-[#10192d] text-[#f8fbff] hover:border-[#315aa4]"
                          )}
                        >
                          <p
                            className={cn(
                              "text-[11px] font-semibold uppercase tracking-[0.22em]",
                              activeDraft?.id === item.id ? "text-white/56" : "text-[#7db0ff]"
                            )}
                          >
                            {item.kind.replace(/-/g, " ")}
                          </p>
                          <p className="mt-2 text-sm font-semibold">{item.title}</p>
                          <p
                            className={cn(
                              "mt-2 text-xs",
                              activeDraft?.id === item.id ? "text-white/58" : "text-[#6f5a4d]"
                            )}
                          >
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </button>
                      ))
                    ) : (
                      <EmptyState
                        title="Your first strategy draft will land here"
                        description="Start with a strategy snapshot if you want the quickest path to a practical SEO plan."
                      />
                    )}
                  </div>
                </div>
              </PanelCard>

              <PanelCard
                eyebrow="Draft Canvas"
                title={activeDraft ? activeDraft.title : "Generate a draft to begin"}
                description="Rendered markdown stays easy to scan, copy, and export."
                actions={
                  activeDraft ? (
                    <>
                      <GhostButton
                        onClick={() => copyText(activeDraft.content, "Draft copied to clipboard")}
                      >
                        <Copy className="size-4" />
                        Copy markdown
                      </GhostButton>
                      <GhostButton
                        onClick={() =>
                          downloadText(
                            activeDraft.content,
                            `${activeDraft.kind}-${activeDraft.createdAt.slice(0, 10)}.md`
                          )
                        }
                      >
                        <Download className="size-4" />
                        Download .md
                      </GhostButton>
                    </>
                  ) : null
                }
              >
                {activeDraft ? (
                  <div className="rounded-[1.6rem] border border-[#1f2d4b] bg-[#0b1426] p-5 sm:p-6">
                    <div
                      className="article-content font-sans"
                      dangerouslySetInnerHTML={{ __html: strategyHtml }}
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    <HintCard
                      icon={<BookText className="size-5" />}
                      title="Start with the landscape"
                      description="A strategy snapshot turns vague goals into a tight list of next moves."
                    />
                    <HintCard
                      icon={<Target className="size-5" />}
                      title="Sharpen with a keyword"
                      description="Optional focus keywords help the draft pull toward a specific opportunity."
                    />
                    <HintCard
                      icon={<NotebookPen className="size-5" />}
                      title="Keep notes real"
                      description="Add business constraints, time limits, and what you actually need the site to do."
                    />
                  </div>
                )}
              </PanelCard>
            </motion.section>
          ) : null}

          {activeTab === "audit" ? (
            <motion.section
              key="audit"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.28 }}
              className="mt-6 grid gap-6 xl:grid-cols-[0.34fr_0.66fr]"
            >
              <PanelCard
                eyebrow="PageSpeed Insights"
                title="Full Lighthouse-style audit with opportunities, diagnostics & core technical SEO"
                description="Run the open-source page audit from one test URL, review the current state, and turn issues into action items the team can ship."
              >
                <Field
                  label="Test URL"
                  icon={<Globe2 className="size-4" />}
                  value={auditUrl}
                  onChange={setAuditUrl}
                  placeholder="https://example.com/page"
                />

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex rounded-lg border border-[#1f2d4b] bg-[#0b1426] p-1">
                    <button
                      type="button"
                      onClick={() => setAuditDevice("mobile")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium transition",
                        auditDevice === "mobile"
                          ? "bg-[#274b8c] text-[#dce7ff]"
                          : "text-[#7f8ea8] hover:text-[#dbe8ff]"
                      )}
                    >
                      <Smartphone className="size-3.5" />
                      Mobile
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuditDevice("desktop")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium transition",
                        auditDevice === "desktop"
                          ? "bg-[#274b8c] text-[#dce7ff]"
                          : "text-[#7f8ea8] hover:text-[#dbe8ff]"
                      )}
                    >
                      <Monitor className="size-3.5" />
                      Desktop
                    </button>
                  </div>
                  <PrimaryButton onClick={handleRunAudit} disabled={auditLoading}>
                    {auditLoading ? <WandSparkles className="size-4 animate-pulse" /> : <FileSearch className="size-4" />}
                    {auditLoading ? "Analyzing..." : "Analyze"}
                  </PrimaryButton>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => profile.websiteUrl && setAuditUrl(profile.websiteUrl)}
                    className="rounded-md border border-[#1f2d4b] bg-[#111a2d] px-3 py-1.5 text-[12px] text-[#91a2bf] transition hover:border-[#2c4f92] hover:text-[#dbe8ff]"
                  >
                    Homepage
                  </button>
                  <button
                    type="button"
                    onClick={() => auditResult?.finalUrl && setAuditUrl(auditResult.finalUrl)}
                    className="rounded-md border border-[#1f2d4b] bg-[#111a2d] px-3 py-1.5 text-[12px] text-[#91a2bf] transition hover:border-[#2c4f92] hover:text-[#dbe8ff]"
                  >
                    Current page
                  </button>
                </div>

                <div className="mt-6 grid gap-3">
                  <MiniInfoCard
                    label="Checks"
                    value="Titles, canonicals, headings, robots, sitemap, schema, media, links, and action-ready HTML evidence."
                  />
                  <MiniInfoCard
                    label="Runtime"
                    value={auditLoading ? "Analyzing performance, SEO, accessibility & best practices..." : "Live page HTML fetched directly at request time"}
                  />
                  <MiniInfoCard
                    label="Output"
                    value="Score, quick wins, major fixes, issue buckets, and current-vs-to-be recommendations"
                  />
                </div>
              </PanelCard>

              <PanelCard
                eyebrow="Diagnostics"
                title={auditResult ? auditResult.title : auditLoading ? "Running Lighthouse audit..." : "Run an audit to inspect a page"}
                description={
                  auditResult
                    ? `${auditResult.status} at ${auditResult.score}/100 for ${auditResult.finalUrl}`
                    : auditLoading
                      ? "Analyzing performance, SEO, accessibility & best practices. This usually takes a few seconds."
                      : "Once the audit completes, this area becomes your technical SEO review board."
                }
              >
                {auditResult ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-4">
                      <MetricCard label="Score" value={String(auditResult.score)} detail={auditResult.status} />
                      <MetricCard
                        label="Issues"
                        value={String(
                          auditResult.insights.technicalSeo.length +
                            auditResult.insights.pagePerformance.length +
                            auditResult.insights.contentQuality.length
                        )}
                        detail="Across all buckets"
                      />
                      <MetricCard
                        label="Word count"
                        value={String(auditResult.metrics.wordCount)}
                        detail="Visible copy"
                      />
                      <MetricCard
                        label="Internal links"
                        value={String(auditResult.metrics.internalLinks)}
                        detail="Detected on page"
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                      <MiniInfoCard
                        label="Current title"
                        value={auditResult.snapshot.titleTag || "Missing title tag"}
                      />
                      <MiniInfoCard
                        label="Current meta"
                        value={auditResult.snapshot.metaDescription || "Missing meta description"}
                      />
                      <MiniInfoCard
                        label="Current H1"
                        value={auditResult.snapshot.h1s[0] || "No H1 found"}
                      />
                      <MiniInfoCard
                        label="Canonical"
                        value={auditResult.snapshot.canonical || "Missing canonical"}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <SimpleListCard
                        title="Quick wins"
                        badge={`${auditResult.quickWins.length}`}
                        items={auditResult.quickWins}
                      />
                      <SimpleListCard
                        title="Major fixes"
                        badge={`${auditResult.majorFixes.length}`}
                        items={auditResult.majorFixes}
                      />
                    </div>

                    <div className="grid gap-4 xl:grid-cols-3">
                      <IssueBucketCard
                        title="Technical SEO"
                        issues={auditResult.insights.technicalSeo}
                        emptyMessage="No major technical blockers were found."
                      />
                      <IssueBucketCard
                        title="Performance"
                        issues={auditResult.insights.pagePerformance}
                        emptyMessage="The page structure looks relatively lean from the HTML pass."
                      />
                      <IssueBucketCard
                        title="Content Quality"
                        issues={auditResult.insights.contentQuality}
                        emptyMessage="The content signals look healthy for this first-pass audit."
                      />
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7db0ff]">
                            HTML evidence
                          </p>
                          <p className="mt-1 text-sm text-[#7f8ea8]">
                            Current markup snapshots with the direction of the recommended fix.
                          </p>
                        </div>
                      </div>

                      {auditResult.htmlEvidence.length ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          {auditResult.htmlEvidence.map((item) => (
                            <div
                              key={`${item.label}-${item.current}`}
                            className="rounded-[1.4rem] border border-[#1f2d4b] bg-[#0b1426] p-4"
                            >
                              <p className="text-sm font-semibold text-[#f8fbff]">{item.label}</p>
                              <div className="mt-3 space-y-3 text-sm leading-6 text-[#c0d0e7]">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7db0ff]">
                                    Current
                                  </p>
                                  <code className="mt-2 block rounded-xl bg-[#152340] px-3 py-3 text-xs text-[#cfe0ff]">
                                    {item.current}
                                  </code>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7db0ff]">
                                    To-be
                                  </p>
                                  <code className="mt-2 block rounded-xl bg-[#152340] px-3 py-3 text-xs text-[#cfe0ff]">
                                    {item.solution}
                                  </code>
                                </div>
                                <p>{item.why}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="No HTML evidence cards were needed"
                          description="This usually means the audit surfaced fewer markup-specific corrections."
                        />
                      )}
                    </div>
                  </div>
                ) : auditLoading ? (
                  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[1.2rem] border border-[#1f2d4b] bg-[#0b1426] text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#2a467d]">
                      <RefreshCcw className="size-7 animate-spin text-[#5f93ff]" />
                    </div>
                    <p className="mt-5 text-[15px] font-medium text-[#dbe8ff]">Running Lighthouse audit...</p>
                    <p className="mt-2 max-w-md text-[13px] leading-6 text-[#7f8ea8]">
                      Analyzing performance, SEO, accessibility & best practices with the current open-source audit stack.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    <HintCard
                      icon={<FileSearch className="size-5" />}
                      title="Audit one page first"
                      description="Start with your most important commercial or category page before checking supporting URLs."
                    />
                    <HintCard
                      icon={<TriangleAlert className="size-5" />}
                      title="Expect practical findings"
                      description="The output separates smaller fixes from structural issues so you can sequence work sensibly."
                    />
                    <HintCard
                      icon={<CheckCircle2 className="size-5" />}
                      title="Use it as the source of truth"
                      description="The next workflows pull from the latest audit so you do not need to re-explain what is wrong."
                    />
                  </div>
                )}
              </PanelCard>
            </motion.section>
          ) : null}

          {activeTab === "keywords" ? (
            <motion.section
              key="keywords"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.28 }}
              className="mt-6 grid gap-6 xl:grid-cols-[0.34fr_0.66fr]"
            >
              <PanelCard
                eyebrow="Basic SEO"
                title="Blend Ahrefs live intel with local fallback"
                description="The keyword engine tries Ahrefs first when the key and website URL are available, then falls back to the local model so the workflow never blocks."
              >
                <Field
                  label="Optional seed topic"
                  icon={<Target className="size-4" />}
                  value={keywordSeed}
                  onChange={setKeywordSeed}
                  placeholder="seo audit for saas, beginner marathon plan, ai photo restoration..."
                />

                <div className="mt-6 flex flex-wrap gap-3">
                  <PrimaryButton onClick={handleGenerateKeywords} disabled={keywordLoading}>
                    {keywordLoading ? <WandSparkles className="size-4 animate-pulse" /> : <Target className="size-4" />}
                    {keywordLoading ? "Building keyword map..." : "Generate keyword map"}
                  </PrimaryButton>
                </div>

                <div className="mt-6 grid gap-3">
                  <MiniInfoCard
                    label="Source stack"
                    value="Profile fields, audit snapshot, action plan, page draft context, plus Ahrefs organic keywords when the API is available."
                  />
                  <MiniInfoCard
                    label="Intent buckets"
                    value="Money keywords, comparisons, supporting content, and FAQ-style questions."
                  />
                  <MiniInfoCard
                    label="Failure mode"
                    value="If Ahrefs is missing or errors, the tab stays usable with the local keyword model."
                  />
                </div>
              </PanelCard>

              <PanelCard
                eyebrow="Basic SEO Results"
                title={keywordReport ? keywordProviderLabel : "Generate the keyword map"}
                description={
                  keywordReport
                    ? keywordReport.headline
                    : "Use this after the audit if you want a sharper bridge from page diagnosis into content expansion."
                }
              >
                {keywordReport ? (
                  <div className="space-y-6">
                    <div className="rounded-[1.4rem] border border-[#1f2d4b] bg-[#0b1426] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7db0ff]">
                            Intelligence mode
                          </p>
                          <p className="mt-2 text-sm font-semibold text-[#f8fbff]">
                            {keywordProviderLabel}
                          </p>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#c0d0e7]">
                            {keywordProviderNote}
                          </p>
                        </div>
                        <span className="rounded-full border border-[#315aa4] bg-[#13213c] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9ec1ff]">
                          {keywordProvider === "ahrefs" ? "Live provider" : "Fallback provider"}
                        </span>
                      </div>
                    </div>

                    {keywordSiteMetrics.length ? (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {keywordSiteMetrics.map((item) => (
                          <MetricCard
                            key={`${item.label}-${item.value}`}
                            label={item.label}
                            value={item.value}
                            detail={item.detail}
                          />
                        ))}
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                      <SimpleListCard
                        title="Seed terms"
                        badge={`${keywordReport.seedTerms.length}`}
                        items={keywordReport.seedTerms}
                      />
                      <SimpleListCard
                        title="Quick wins"
                        badge={`${keywordReport.quickWins.length}`}
                        items={keywordReport.quickWins}
                      />
                    </div>

                    {keywordCompetitors.length ? (
                      <div>
                        <div className="mb-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7db0ff]">
                            Organic competitors
                          </p>
                          <p className="mt-1 text-sm text-[#7f8ea8]">
                            Live overlap domains from Ahrefs that your team can inspect during content and internal-link reviews.
                          </p>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                          {keywordCompetitors.map((item) => (
                            <CompetitorCard key={item.domain} competitor={item} />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4 xl:grid-cols-2">
                      {keywordReport.clusters.map((cluster) => (
                        <KeywordClusterCard
                          key={cluster.label}
                          cluster={cluster}
                          onUseKeyword={applyKeyword}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    <HintCard
                      icon={<Target className="size-5" />}
                      title="Use it after the audit"
                      description="The richer the audit context, the more useful the local keyword ideas become."
                    />
                    <HintCard
                      icon={<BookText className="size-5" />}
                      title="Multiple intent buckets"
                      description="You get commercial, comparison, educational, and question-based opportunities in one pass."
                    />
                    <HintCard
                      icon={<ArrowRight className="size-5" />}
                      title="Bridge straight to content"
                      description="Any promising keyword can be pushed into the page generator without retyping it."
                    />
                  </div>
                )}
              </PanelCard>
            </motion.section>
          ) : null}

          {activeTab === "actions" ? (
            <motion.section
              key="actions"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.28 }}
              className="mt-6 grid gap-6 xl:grid-cols-[0.34fr_0.66fr]"
            >
              <PanelCard
                eyebrow="Advanced"
                title="Turn findings into a ship list"
                description="This workflow converts the most recent audit into quick wins, strategic fixes, and expansion ideas."
              >
                {auditResult ? (
                  <div className="rounded-[1.4rem] border border-[#1f2d4b] bg-[#0b1426] p-4">
                    <p className="text-sm font-semibold text-[#f8fbff]">Using latest audit context</p>
                    <p className="mt-2 text-sm leading-6 text-[#c0d0e7]">
                      {auditResult.title} on {auditResult.finalUrl}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MiniInfoCard label="Score" value={`${auditResult.score}/100`} />
                      <MiniInfoCard
                        label="Priority fixes"
                        value={`${auditResult.majorFixes.length} major, ${auditResult.quickWins.length} quick`}
                      />
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title="Run a technical audit first"
                    description="The action planner needs a live audit so the recommendations stay anchored in actual page evidence."
                  />
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <PrimaryButton
                    onClick={handleGenerateActions}
                    disabled={!auditResult || actionLoading}
                  >
                    {actionLoading ? <WandSparkles className="size-4 animate-pulse" /> : <Hammer className="size-4" />}
                    {actionLoading ? "Building action plan..." : "Generate fix actions"}
                  </PrimaryButton>
                </div>
              </PanelCard>

              <PanelCard
                eyebrow="Advanced Results"
                title={actionPlan ? "Prioritized fixes and follow-up content" : "Generate an action plan"}
                description={
                  actionPlan
                    ? actionPlan.headline
                    : "This becomes your operator checklist once the planner has audit context."
                }
              >
                {actionPlan ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <PlanListCard title="Quick wins" items={actionPlan.quickWins} />
                      <PlanListCard title="Strategic fixes" items={actionPlan.strategicFixes} />
                    </div>

                    <div>
                      <div className="mb-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7db0ff]">
                            New page opportunities
                          </p>
                          <p className="mt-1 text-sm text-[#7f8ea8]">
                            Content expansions suggested from the latest audit and fix plan.
                          </p>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {actionPlan.newPages.map((item) => (
                          <OpportunityCard
                            key={`${item.slug}-${item.targetKeyword}`}
                            opportunity={item}
                            onUse={() => applyOpportunity(item)}
                          />
                        ))}
                      </div>
                    </div>

                    <SimpleListCard
                      title="Content motions"
                      badge={`${actionPlan.contentMotions.length}`}
                      items={actionPlan.contentMotions}
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    <HintCard
                      icon={<Hammer className="size-5" />}
                      title="Small fixes first"
                      description="Quick wins keep momentum up while bigger structural work gets scheduled properly."
                    />
                    <HintCard
                      icon={<BookText className="size-5" />}
                      title="Content ideas stay grounded"
                      description="Suggested new pages are generated from the audit instead of generic keyword stuffing."
                    />
                    <HintCard
                      icon={<ArrowRight className="size-5" />}
                      title="Flow into page creation"
                      description="Move any suggested page directly into the page generator with one click."
                    />
                  </div>
                )}
              </PanelCard>
            </motion.section>
          ) : null}

          {activeTab === "pages" ? (
            <motion.section
              key="pages"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.28 }}
              className="mt-6 grid gap-6 xl:grid-cols-[0.38fr_0.62fr]"
            >
              <PanelCard
                eyebrow="Pages"
                title="Draft the next page you should publish"
                description="Use the report-style page pattern to generate a page with metadata, structure, CTA, and publishable copy."
              >
                {keywordReport?.quickWins?.length ? (
                  <div className="mb-5 rounded-[1.4rem] border border-[#1f2d4b] bg-[#0b1426] p-4">
                    <p className="text-sm font-semibold text-[#f8fbff]">Keyword quick wins</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {keywordReport.quickWins.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => applyKeyword(item)}
                          className="rounded-lg border border-[#315aa4] bg-[#13213c] px-3 py-1.5 text-xs font-medium text-[#9ec1ff] transition hover:border-[#4b78ca]"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {actionPlan?.newPages?.length ? (
                  <div className="mb-5 rounded-[1.4rem] border border-[#1f2d4b] bg-[#0b1426] p-4">
                    <p className="text-sm font-semibold text-[#f8fbff]">Suggested from the latest action plan</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {actionPlan.newPages.map((item) => (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => applyOpportunity(item)}
                          className="rounded-lg border border-[#315aa4] bg-[#13213c] px-3 py-1.5 text-xs font-medium text-[#9ec1ff] transition hover:border-[#4b78ca]"
                        >
                          {item.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4">
                  <Field
                    label="Page title"
                    icon={<NotebookPen className="size-4" />}
                    value={pageForm.pageTitle}
                    onChange={(value) => setPageForm((current) => ({ ...current, pageTitle: value }))}
                    placeholder="Beginner trail running shoes guide"
                  />
                  <Field
                    label="Target keyword"
                    icon={<Target className="size-4" />}
                    value={pageForm.targetKeyword}
                    onChange={(value) =>
                      setPageForm((current) => ({ ...current, targetKeyword: value }))
                    }
                    placeholder="best beginner trail running shoes"
                  />
                  <Field
                    label="Page type"
                    icon={<BookText className="size-4" />}
                    value={pageForm.pageType}
                    onChange={(value) => setPageForm((current) => ({ ...current, pageType: value }))}
                    placeholder="landing page, category page, comparison page..."
                  />
                  <LongField
                    label="Page goal"
                    value={pageForm.pageGoal}
                    onChange={(value) => setPageForm((current) => ({ ...current, pageGoal: value }))}
                    placeholder="What should this page accomplish for the business and the reader?"
                  />
                  <LongField
                    label="Notes"
                    value={pageForm.notes}
                    onChange={(value) => setPageForm((current) => ({ ...current, notes: value }))}
                    placeholder="Proof points, internal link targets, CTA constraints, tone notes, objections to address."
                  />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <PrimaryButton onClick={handleGeneratePageDraft} disabled={pageLoading}>
                    {pageLoading ? <WandSparkles className="size-4 animate-pulse" /> : <FilePlus2 className="size-4" />}
                    {pageLoading ? "Generating page..." : "Generate new page"}
                  </PrimaryButton>
                </div>
              </PanelCard>

              <PanelCard
                eyebrow="Pages Result"
                title={pageDraft ? pageDraft.title : "Generate a page to preview it here"}
                description={
                  pageDraft
                    ? `${pageDraft.pageType} for ${pageDraft.targetKeyword}`
                    : "The generator returns metadata, CTA guidance, schema opportunities, and publishable markdown."
                }
                actions={
                  pageDraft ? (
                    <>
                      <GhostButton
                        onClick={() => copyText(pageDraft.markdown, "Page draft copied to clipboard")}
                      >
                        <Copy className="size-4" />
                        Copy markdown
                      </GhostButton>
                      <GhostButton
                        onClick={() =>
                          downloadText(pageDraft.markdown, `${pageDraft.slug || "new-page"}.md`)
                        }
                      >
                        <Download className="size-4" />
                        Download .md
                      </GhostButton>
                    </>
                  ) : null
                }
              >
                {pageDraft ? (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard label="Slug" value={pageDraft.slug} detail="SEO-safe URL" />
                      <MetricCard label="Intent" value={pageDraft.intent} detail="Primary search intent" />
                      <MetricCard label="CTA" value={pageDraft.cta} detail="Primary conversion move" />
                      <MetricCard label="Keyword" value={pageDraft.targetKeyword} detail="Main phrase" />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <SimpleListCard title="Internal links" badge={`${pageDraft.internalLinks.length}`} items={pageDraft.internalLinks} />
                      <SimpleListCard
                        title="Schema opportunities"
                        badge={`${pageDraft.schemaOpportunities.length}`}
                        items={pageDraft.schemaOpportunities}
                      />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <SimpleListCard
                        title="Conversion notes"
                        badge={`${pageDraft.conversionNotes.length}`}
                        items={pageDraft.conversionNotes}
                      />
                      <div className="rounded-[1.4rem] border border-[#1f2d4b] bg-[#0b1426] p-4">
                        <p className="text-sm font-semibold text-[#f8fbff]">Metadata QA</p>
                        <div className="mt-3 space-y-3 text-sm leading-6 text-[#c0d0e7]">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7db0ff]">
                              Meta title
                            </p>
                            <p className="mt-1">{pageDraft.metaTitle}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7db0ff]">
                              Meta description
                            </p>
                            <p className="mt-1">{pageDraft.metaDescription}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7db0ff]">
                              QA summary
                            </p>
                            <p className="mt-1">{pageDraft.qaSummary}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] border border-[#1f2d4b] bg-[#0b1426] p-5 sm:p-6">
                      <div
                        className="article-content font-sans"
                        dangerouslySetInnerHTML={{ __html: pageDraftHtml }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    <HintCard
                      icon={<FilePlus2 className="size-5" />}
                      title="Use the latest audit"
                      description="If you have one, the generator will pull in audit and action-plan context automatically."
                    />
                    <HintCard
                      icon={<BookText className="size-5" />}
                      title="Pattern-driven copy"
                      description="The page structure follows the richer report-studio landing page pattern instead of a generic blog draft."
                    />
                    <HintCard
                      icon={<Target className="size-5" />}
                      title="Built to publish"
                      description="You get a slug, metadata, CTA logic, internal links, schema ideas, and ready-to-edit markdown."
                    />
                  </div>
                )}
              </PanelCard>
            </motion.section>
          ) : null}
        </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}

function renderMarkdown(markdown: string) {
  const rendered = marked.parse(markdown);
  return typeof rendered === "string" ? rendered : "";
}

function toneClasses(severity: Severity) {
  switch (severity) {
    case "high":
      return "border-[#7f1d1d]/70 bg-[#2a1118] text-[#fda4af]";
    case "medium":
      return "border-[#5b4a1d]/70 bg-[#251f12] text-[#facc15]";
    case "low":
      return "border-[#1f4b3d]/70 bg-[#0f231d] text-[#86efac]";
  }
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#1c2a45] bg-[#0d1528] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#6e83a7]">{label}</p>
      <p className="mt-2 text-[1.15rem] font-semibold text-[#f8fbff]">{value}</p>
    </div>
  );
}

function PanelCard({
  eyebrow,
  title,
  description,
  children,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#1c2a45] bg-[#0d1528] p-5 shadow-[0_18px_50px_rgba(2,8,23,0.28)] sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6e83a7]">{eyebrow}</p>
          <h2 className="font-display mt-2 text-[1.35rem] leading-tight text-[#f8fbff]">{title}</h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-6 text-[#7f8ea8]">{description}</p>
        </div>

        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>

      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7f8ea8]">
        {icon}
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-[#1f2d4b] bg-[#182235] px-4 text-sm text-[#e6eefc] outline-none transition placeholder:text-[#637795] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#1d4ed8]/20"
      />
    </label>
  );
}

function LongField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7f8ea8]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-[#1f2d4b] bg-[#182235] px-4 py-3 text-sm leading-6 text-[#e6eefc] outline-none transition placeholder:text-[#637795] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#1d4ed8]/20"
      />
    </label>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-xl bg-[#2d5ca8] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_12px_24px_rgba(29,78,216,0.24)] transition hover:bg-[#3567b9] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-[#1f2d4b] bg-[#111a2d] px-4 py-2.5 text-[13px] font-medium text-[#c3d1e7] transition hover:border-[#315aa4] hover:text-[#ffffff]"
    >
      {children}
    </button>
  );
}

function HintCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1c2a45] bg-[#10192d] p-5">
      <div className="inline-flex rounded-xl bg-[#152340] p-3 text-[#6ca4ff]">{icon}</div>
      <h3 className="font-display mt-4 text-[1.05rem] leading-tight text-[#f8fbff]">{title}</h3>
      <p className="mt-3 text-[13px] leading-6 text-[#7f8ea8]">{description}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#24314e] bg-[#0b1426] px-4 py-5 text-sm leading-6 text-[#7f8ea8]">
      <p className="font-semibold text-[#f8fbff]">{title}</p>
      <p className="mt-2">{description}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1c2a45] bg-[#10192d] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6e83a7]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#f8fbff]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#7f8ea8]">{detail}</p>
    </div>
  );
}

function MiniInfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1c2a45] bg-[#10192d] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6e83a7]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[#c0d0e7]">{value}</p>
    </div>
  );
}

function SimpleListCard({
  title,
  badge,
  items,
}: {
  title: string;
  badge: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-[#1c2a45] bg-[#10192d] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#f8fbff]">{title}</p>
        <span className="rounded-full bg-[#152340] px-3 py-1 text-xs font-semibold text-[#7db0ff]">
          {badge}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${title}-${item}`}
              className="rounded-xl border border-[#1b2945] bg-[#0b1426] px-4 py-3 text-sm leading-6 text-[#c0d0e7]"
            >
              {item}
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-[#7f8ea8]">No items yet.</p>
        )}
      </div>
    </div>
  );
}

function IssueBucketCard({
  title,
  issues,
  emptyMessage,
}: {
  title: string;
  issues: TechnicalAuditResult["insights"][keyof TechnicalAuditResult["insights"]];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border border-[#1c2a45] bg-[#10192d] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#f8fbff]">{title}</p>
        <span className="rounded-full bg-[#152340] px-3 py-1 text-xs font-semibold text-[#7db0ff]">
          {issues.length}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {issues.length ? (
          issues.map((issue) => (
            <div
              key={`${title}-${issue.title}`}
              className="rounded-xl border border-[#1b2945] bg-[#0b1426] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#f8fbff]">{issue.title}</p>
                <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", toneClasses(issue.severity))}>
                  {issue.severity}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#c0d0e7]">{issue.evidence}</p>
              <div className="mt-3 rounded-xl bg-[#152340] px-3 py-3 text-sm leading-6 text-[#bdd4ff]">
                <span className="font-semibold text-[#f8fbff]">Next action:</span> {issue.action}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-[#7f8ea8]">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

function PlanListCard({
  title,
  items,
}: {
  title: string;
  items: ActionPlanItem[];
}) {
  return (
    <div className="rounded-2xl border border-[#1c2a45] bg-[#10192d] p-4">
      <p className="text-sm font-semibold text-[#f8fbff]">{title}</p>
      <div className="mt-4 space-y-4">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${title}-${item.title}`}
              className="rounded-xl border border-[#1b2945] bg-[#0b1426] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#f8fbff]">{item.title}</p>
                <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", toneClasses(item.impact))}>
                  {item.impact} impact
                </span>
                <span className="rounded-full border border-[#263757] bg-[#10192d] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea0bc]">
                  {item.effort}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#c0d0e7]">{item.why}</p>
              <div className="mt-3 space-y-2">
                {item.steps.map((step) => (
                  <div
                    key={`${item.title}-${step}`}
                    className="rounded-xl bg-[#152340] px-3 py-3 text-sm leading-6 text-[#bdd4ff]"
                  >
                    {step}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-[#8ea0bc]">
                <span className="font-semibold text-[#f8fbff]">Done when:</span> {item.doneWhen}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-[#7f8ea8]">No actions yet.</p>
        )}
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  onUse,
}: {
  opportunity: NewPageOpportunity;
  onUse: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#1c2a45] bg-[#10192d] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-[#f8fbff]">{opportunity.title}</p>
        <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", toneClasses(opportunity.priority))}>
          {opportunity.priority}
        </span>
      </div>
      <p className="mt-2 text-sm text-[#7db0ff]">{opportunity.targetKeyword}</p>
      <p className="mt-3 text-sm leading-6 text-[#c0d0e7]">{opportunity.reason}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.22em] text-[#7f8ea8]">{opportunity.pageType}</div>
        <button
          type="button"
          onClick={onUse}
          className="rounded-lg border border-[#315aa4] bg-[#13213c] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9ec1ff] transition hover:border-[#4b78ca]"
        >
          Use this idea
        </button>
      </div>
    </div>
  );
}

function CompetitorCard({
  competitor,
}: {
  competitor: KeywordReport["competitors"][number];
}) {
  return (
    <div className="rounded-2xl border border-[#1c2a45] bg-[#10192d] p-4">
      <p className="text-sm font-semibold text-[#f8fbff]">{competitor.domain}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[#152340] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7db0ff]">Shared kws</p>
          <p className="mt-1 text-sm font-semibold text-[#f8fbff]">{competitor.sharedKeywords}</p>
        </div>
        <div className="rounded-xl bg-[#152340] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7db0ff]">Domain rating</p>
          <p className="mt-1 text-sm font-semibold text-[#f8fbff]">{competitor.domainRating ?? "n/a"}</p>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-6 text-[#c0d0e7]">
        Traffic {competitor.traffic ?? "n/a"} · Overlap share {competitor.share ?? "n/a"}%
      </p>
    </div>
  );
}

function KeywordClusterCard({
  cluster,
  onUseKeyword,
}: {
  cluster: KeywordCluster;
  onUseKeyword: (keyword: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#1c2a45] bg-[#10192d] p-4">
      <p className="text-sm font-semibold text-[#f8fbff]">{cluster.label}</p>
      <p className="mt-2 text-sm leading-6 text-[#7f8ea8]">{cluster.description}</p>

      <div className="mt-4 space-y-3">
        {cluster.suggestions.map((item) => (
          <div
            key={`${cluster.label}-${item.keyword}`}
            className="rounded-xl border border-[#1b2945] bg-[#0b1426] p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#f8fbff]">{item.keyword}</p>
              <span className="rounded-full border border-[#263757] bg-[#10192d] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ea0bc]">
                {item.intent}
              </span>
              <span className="rounded-full bg-[#152340] px-2.5 py-1 text-[11px] font-semibold text-[#7db0ff]">
                score {item.score}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#c0d0e7]">{item.why}</p>
            {item.volume || item.traffic || item.position || item.difficulty ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {typeof item.position === "number" ? (
                  <span className="rounded-full bg-[#152340] px-2.5 py-1 text-[11px] font-semibold text-[#7db0ff]">
                    Pos #{item.position}
                  </span>
                ) : null}
                {typeof item.volume === "number" ? (
                  <span className="rounded-full bg-[#152340] px-2.5 py-1 text-[11px] font-semibold text-[#7db0ff]">
                    Vol {item.volume}
                  </span>
                ) : null}
                {typeof item.traffic === "number" ? (
                  <span className="rounded-full bg-[#152340] px-2.5 py-1 text-[11px] font-semibold text-[#7db0ff]">
                    Traffic {item.traffic}
                  </span>
                ) : null}
                {typeof item.difficulty === "number" ? (
                  <span className="rounded-full bg-[#152340] px-2.5 py-1 text-[11px] font-semibold text-[#7db0ff]">
                    KD {item.difficulty}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#7db0ff]">{item.source}</p>
                {item.rankingUrl ? (
                  <p className="truncate text-[11px] text-[#7f8ea8]">{item.rankingUrl}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onUseKeyword(item.keyword)}
                className="rounded-lg border border-[#315aa4] bg-[#13213c] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9ec1ff] transition hover:border-[#4b78ca]"
              >
                Use keyword
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function createWorkspaceKey(profile: Partial<WorkspaceProfile>) {
  const fromUrl = profile.websiteUrl?.trim();

  if (fromUrl) {
    try {
      const normalized = /^https?:\/\//i.test(fromUrl) ? fromUrl : `https://${fromUrl}`;
      const host = new URL(normalized).hostname.replace(/^www\./, "");
      return host.replace(/[^\w.-]/g, "-");
    } catch {
      // fall through to project name
    }
  }

  return (profile.projectName || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}
