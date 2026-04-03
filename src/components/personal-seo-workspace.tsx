"use client";

import { startTransition, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { marked } from "marked";
import {
  ArrowRight,
  BookText,
  CheckCircle2,
  Copy,
  Download,
  FilePlus2,
  FileSearch,
  Globe2,
  Hammer,
  History,
  NotebookPen,
  RefreshCcw,
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
  Severity,
  TechnicalAuditResult,
  WorkspaceProfile,
} from "@/lib/studio-types";

type WorkflowTab = "strategy" | "audit" | "keywords" | "actions" | "pages";

type DraftHistoryItem = {
  id: string;
  title: string;
  kind: DraftKind;
  createdAt: string;
  focusKeyword: string;
  content: string;
};

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
    label: "Strategy Studio",
    eyebrow: "Plan",
    description: "Generate snapshots, briefs, and calendars for the next publishing cycle.",
    icon: <BookText className="size-4" />,
  },
  {
    id: "audit",
    label: "Technical Audit",
    eyebrow: "Inspect",
    description: "Run a page audit with HTML evidence, quick wins, and major fixes.",
    icon: <FileSearch className="size-4" />,
  },
  {
    id: "actions",
    label: "Fix Actions",
    eyebrow: "Prioritize",
    description: "Turn the latest audit into a concrete fix backlog and follow-up page ideas.",
    icon: <Hammer className="size-4" />,
  },
  {
    id: "keywords",
    label: "Keyword Map",
    eyebrow: "Expand",
    description: "Generate local keyword clusters and page angles without an external keyword API.",
    icon: <Target className="size-4" />,
  },
  {
    id: "pages",
    label: "New Page Drafts",
    eyebrow: "Create",
    description: "Draft fresh SEO pages with metadata, structure, CTA, and publishing copy.",
    icon: <FilePlus2 className="size-4" />,
  },
];

type PersonalSeoWorkspaceProps = {
  legacyPath: string | null;
};

export default function PersonalSeoWorkspace({
  legacyPath,
}: PersonalSeoWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkflowTab>("strategy");
  const [profile, setProfile] = useState<WorkspaceProfile>(emptyProfile);
  const [kind, setKind] = useState<DraftKind>("strategy-snapshot");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [constraints, setConstraints] = useState("");
  const [activeDraft, setActiveDraft] = useState<DraftHistoryItem | null>(null);
  const [history, setHistory] = useState<DraftHistoryItem[]>([]);
  const [auditUrl, setAuditUrl] = useState("");
  const [auditResult, setAuditResult] = useState<TechnicalAuditResult | null>(null);
  const [actionPlan, setActionPlan] = useState<AuditActionPlan | null>(null);
  const [keywordSeed, setKeywordSeed] = useState("");
  const [keywordReport, setKeywordReport] = useState<KeywordReport | null>(null);
  const [pageForm, setPageForm] = useState<NewPageForm>(emptyNewPageForm);
  const [pageDraft, setPageDraft] = useState<GeneratedPageDraft | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
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

      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile) as WorkspaceProfile;
        setProfile(parsedProfile);
        setAuditUrl(parsedProfile.websiteUrl || "");
      }

      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as DraftHistoryItem[];
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
    } catch (error) {
      console.error("Failed to load local workspace state", error);
    } finally {
      setHydrated(true);
    }
  }, []);

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

      const item: DraftHistoryItem = {
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
      toast.success("Keyword map generated");
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

    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    window.localStorage.removeItem(AUDIT_STORAGE_KEY);
    window.localStorage.removeItem(ACTIONS_STORAGE_KEY);
    window.localStorage.removeItem(KEYWORDS_STORAGE_KEY);
    window.localStorage.removeItem(PAGE_FORM_STORAGE_KEY);
    window.localStorage.removeItem(PAGE_DRAFT_STORAGE_KEY);

    toast.success("Local workspace cleared");
  }

  return (
    <main className="relative overflow-hidden pb-16">
      <div className="absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_top,rgba(245,176,138,0.58),transparent_38%),radial-gradient(circle_at_right,rgba(143,52,18,0.08),transparent_26%),linear-gradient(180deg,rgba(255,250,242,0.95),rgba(245,239,230,0))]" />

      <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-[2rem] border border-[#3f2114]/10 bg-[#2a1d18] px-6 py-6 text-[#fff8f0] shadow-[0_30px_90px_rgba(33,18,12,0.22)] sm:px-8 sm:py-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/72">
                  <Sparkles className="size-3.5" />
                  Personal SEO operating system
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#f5b08a]/25 bg-[#f5b08a]/10 px-3 py-1 text-xs font-medium text-[#ffd6c0]">
                  Runtime env: OPENAI_API_KEY only
                </span>
              </div>

              <h1 className="font-display text-[2.4rem] leading-[1.05] tracking-tight sm:text-[3rem] lg:text-[3.55rem]">
                Strategy drafts, technical audits, fix actions, and fresh page creation in one local-first studio.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                This keeps the personal setup lightweight while folding in the strongest workflow ideas from
                the report studio: inspect a page, prioritize the fixes, and turn the gap into new content
                you can actually ship.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Saved assets" value={String(totalAssets).padStart(2, "0")} />
              <StatCard label="Strategy drafts" value={String(history.length).padStart(2, "0")} />
              <StatCard label="Audit score" value={auditResult ? String(auditResult.score) : "--"} />
              <StatCard label="Page drafts" value={pageDraft ? "01" : "00"} />
            </div>
          </div>

          {legacyPath ? (
            <div className="mt-6 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white/72">
              You arrived via <span className="font-semibold text-white">{legacyPath}</span>. Legacy paths still
              route into this single personal workspace so old bookmarks keep working.
            </div>
          ) : null}
        </motion.section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="rounded-[2rem] border border-[#3f2114]/10 bg-[#fffaf3]/85 p-5 shadow-[0_22px_60px_rgba(63,33,20,0.08)] backdrop-blur sm:p-6"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f3412]">
                  Project profile
                </p>
                <h2 className="font-display mt-2 text-[1.9rem] text-[#231815]">Give the studio real context</h2>
              </div>
              <button
                type="button"
                onClick={loadSample}
                className="rounded-full border border-[#3f2114]/12 px-4 py-2 text-sm font-medium text-[#5f4336] transition hover:border-[#d1582a]/35 hover:text-[#d1582a]"
              >
                Load sample
              </button>
            </div>

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
                onChange={(value) =>
                  setProfile((current) => ({ ...current, differentiators: value }))
                }
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
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-[2rem] border border-[#3f2114]/10 bg-[#fff7ef]/80 p-5 shadow-[0_22px_60px_rgba(63,33,20,0.08)] backdrop-blur sm:p-6"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f3412]">
                  Workflow
                </p>
                <h2 className="font-display mt-2 text-[1.8rem] text-[#231815]">
                  Move from audit to output
                </h2>
              </div>
              <button
                type="button"
                onClick={resetWorkspace}
                className="inline-flex items-center gap-2 rounded-full border border-[#3f2114]/12 px-4 py-2 text-sm font-medium text-[#5f4336] transition hover:border-[#8f3412]/35 hover:text-[#8f3412]"
              >
                <RefreshCcw className="size-4" />
                Clear local data
              </button>
            </div>

            <div className="rounded-[1.5rem] border border-[#3f2114]/10 bg-white/90 p-3">
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
                {workflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    type="button"
                    onClick={() => setActiveTab(workflow.id)}
                    className={cn(
                      "rounded-[1rem] border px-3 py-3 text-left text-sm transition-all",
                      activeTab === workflow.id
                        ? "border-[#d1582a]/35 bg-[#2a1d18] text-white shadow-[0_10px_22px_rgba(42,29,24,0.14)]"
                        : "border-[#3f2114]/10 bg-[#fffaf4] text-[#2a1d18] hover:border-[#d1582a]/22 hover:bg-white"
                    )}
                  >
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
                      {workflow.icon}
                      {workflow.eyebrow}
                    </div>
                    <p className="mt-2 text-sm font-semibold">{workflow.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {workflows.map((workflow) =>
                workflow.id === activeTab ? (
                  <MiniInfoCard
                    key={workflow.id}
                    label="Current tab"
                    value={workflow.description}
                  />
                ) : null
              )}
              <MiniInfoCard
                label="Recommended flow"
                value="Audit the page, generate a keyword map, turn that into action items, then draft the next page."
              />
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[#3f2114]/10 bg-white/72 p-4 text-sm leading-6 text-[#6f5a4d]">
              Local storage keeps your profile, latest audit, fix plan, and drafts in this browser. Network
              calls only happen when you run an audit or use your own OpenAI key for generation. Keyword
              generation stays local and deterministic.
            </div>
          </motion.section>
        </div>

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
                eyebrow="Strategy Studio"
                title="Generate operator-ready drafts"
                description="Use the same lightweight drafting workflow for calendars, briefs, refreshes, and content direction."
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
                          : "border-[#3f2114]/10 bg-white/90 text-[#231815] hover:border-[#d1582a]/25"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-[0.22em]",
                          kind === item.id ? "text-white/56" : "text-[#8f3412]"
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

                <div className="mt-6 border-t border-[#3f2114]/10 pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f3412]">
                        Recent drafts
                      </p>
                      <p className="mt-1 text-sm text-[#6f5a4d]">Switch between the latest saved outputs.</p>
                    </div>
                    <History className="size-4 text-[#8f3412]" />
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
                              : "border-[#3f2114]/10 bg-white/88 text-[#231815] hover:border-[#d1582a]/22"
                          )}
                        >
                          <p
                            className={cn(
                              "text-[11px] font-semibold uppercase tracking-[0.22em]",
                              activeDraft?.id === item.id ? "text-white/56" : "text-[#8f3412]"
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
                  <div className="rounded-[1.6rem] border border-[#3f2114]/10 bg-white/90 p-5 sm:p-6">
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
                eyebrow="Technical Audit"
                title="Inspect one URL at a time"
                description="The audit checks core technical signals, content depth, link structure, and HTML evidence using an open-source parser."
              >
                <Field
                  label="Audit URL"
                  icon={<Globe2 className="size-4" />}
                  value={auditUrl}
                  onChange={setAuditUrl}
                  placeholder="https://example.com/page"
                />

                <div className="mt-6 flex flex-wrap gap-3">
                  <PrimaryButton onClick={handleRunAudit} disabled={auditLoading}>
                    {auditLoading ? <WandSparkles className="size-4 animate-pulse" /> : <FileSearch className="size-4" />}
                    {auditLoading ? "Running audit..." : "Run technical audit"}
                  </PrimaryButton>
                </div>

                <div className="mt-6 grid gap-3">
                  <MiniInfoCard
                    label="Checks"
                    value="Titles, canonicals, headings, robots, sitemap, schema, media, links"
                  />
                  <MiniInfoCard
                    label="Input"
                    value="Live page HTML fetched directly at request time"
                  />
                  <MiniInfoCard
                    label="Output"
                    value="Score, quick wins, major fixes, issue buckets, and HTML evidence"
                  />
                </div>
              </PanelCard>

              <PanelCard
                eyebrow="Audit Results"
                title={auditResult ? auditResult.title : "Run an audit to inspect a page"}
                description={
                  auditResult
                    ? `${auditResult.status} at ${auditResult.score}/100 for ${auditResult.finalUrl}`
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
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f3412]">
                            HTML evidence
                          </p>
                          <p className="mt-1 text-sm text-[#6f5a4d]">
                            Current markup snapshots with the direction of the recommended fix.
                          </p>
                        </div>
                      </div>

                      {auditResult.htmlEvidence.length ? (
                        <div className="grid gap-4 lg:grid-cols-2">
                          {auditResult.htmlEvidence.map((item) => (
                            <div
                              key={`${item.label}-${item.current}`}
                              className="rounded-[1.4rem] border border-[#3f2114]/10 bg-white/90 p-4"
                            >
                              <p className="text-sm font-semibold text-[#231815]">{item.label}</p>
                              <div className="mt-3 space-y-3 text-sm leading-6 text-[#5f4336]">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f3412]">
                                    Current
                                  </p>
                                  <code className="mt-2 block rounded-xl bg-[#f7efe4] px-3 py-3 text-xs text-[#5b4437]">
                                    {item.current}
                                  </code>
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f3412]">
                                    To-be
                                  </p>
                                  <code className="mt-2 block rounded-xl bg-[#f7efe4] px-3 py-3 text-xs text-[#5b4437]">
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
                eyebrow="Keyword Map"
                title="Generate keyword clusters locally"
                description="This map uses your project profile, audit snapshot, fix plan, and page context to create keyword ideas without a third-party keyword API."
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
                    value="Profile fields, latest audit snapshot, current action plan, and any generated page draft."
                  />
                  <MiniInfoCard
                    label="Intent buckets"
                    value="Money keywords, comparisons, supporting content, and FAQ-style questions."
                  />
                  <MiniInfoCard
                    label="Best next move"
                    value="Push the best keyword directly into the page generator when a cluster looks promising."
                  />
                </div>
              </PanelCard>

              <PanelCard
                eyebrow="Keyword Results"
                title={keywordReport ? "Local keyword opportunities" : "Generate the keyword map"}
                description={
                  keywordReport
                    ? keywordReport.headline
                    : "Use this after the audit if you want a sharper bridge from page diagnosis into content expansion."
                }
              >
                {keywordReport ? (
                  <div className="space-y-6">
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
                eyebrow="Fix Actions"
                title="Turn findings into a ship list"
                description="This workflow converts the most recent audit into quick wins, strategic fixes, and expansion ideas."
              >
                {auditResult ? (
                  <div className="rounded-[1.4rem] border border-[#3f2114]/10 bg-white/88 p-4">
                    <p className="text-sm font-semibold text-[#231815]">Using latest audit context</p>
                    <p className="mt-2 text-sm leading-6 text-[#6f5a4d]">
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
                eyebrow="Action Plan"
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
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f3412]">
                          New page opportunities
                        </p>
                        <p className="mt-1 text-sm text-[#6f5a4d]">
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
                eyebrow="New Page Generator"
                title="Draft the next page you should publish"
                description="Use the report-style page pattern to generate a page with metadata, structure, CTA, and publishable copy."
              >
                {keywordReport?.quickWins?.length ? (
                  <div className="mb-5 rounded-[1.4rem] border border-[#3f2114]/10 bg-white/88 p-4">
                    <p className="text-sm font-semibold text-[#231815]">Keyword quick wins</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {keywordReport.quickWins.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => applyKeyword(item)}
                          className="rounded-full border border-[#d1582a]/22 bg-[#fff4ea] px-3 py-1.5 text-xs font-medium text-[#8f3412] transition hover:border-[#d1582a]/45 hover:bg-[#fff0e3]"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {actionPlan?.newPages?.length ? (
                  <div className="mb-5 rounded-[1.4rem] border border-[#3f2114]/10 bg-white/88 p-4">
                    <p className="text-sm font-semibold text-[#231815]">Suggested from the latest action plan</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {actionPlan.newPages.map((item) => (
                        <button
                          key={item.slug}
                          type="button"
                          onClick={() => applyOpportunity(item)}
                          className="rounded-full border border-[#d1582a]/22 bg-[#fff4ea] px-3 py-1.5 text-xs font-medium text-[#8f3412] transition hover:border-[#d1582a]/45 hover:bg-[#fff0e3]"
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
                eyebrow="Page Draft"
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
                      <div className="rounded-[1.4rem] border border-[#3f2114]/10 bg-white/90 p-4">
                        <p className="text-sm font-semibold text-[#231815]">Metadata QA</p>
                        <div className="mt-3 space-y-3 text-sm leading-6 text-[#5f4336]">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f3412]">
                              Meta title
                            </p>
                            <p className="mt-1">{pageDraft.metaTitle}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f3412]">
                              Meta description
                            </p>
                            <p className="mt-1">{pageDraft.metaDescription}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f3412]">
                              QA summary
                            </p>
                            <p className="mt-1">{pageDraft.qaSummary}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] border border-[#3f2114]/10 bg-white/90 p-5 sm:p-6">
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
      return "border-[#d1582a]/28 bg-[#fff0e8] text-[#8f3412]";
    case "medium":
      return "border-[#c89b3c]/28 bg-[#fff7e7] text-[#875d07]";
    case "low":
      return "border-[#76945b]/28 bg-[#f2f7ed] text-[#406628]";
  }
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
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
    <section className="rounded-[2rem] border border-[#3f2114]/10 bg-[#fffdf8]/88 p-5 shadow-[0_18px_50px_rgba(63,33,20,0.08)] backdrop-blur sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f3412]">{eyebrow}</p>
          <h2 className="font-display mt-2 text-[1.9rem] text-[#231815]">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f5a4d]">{description}</p>
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
      <span className="inline-flex items-center gap-2 text-sm font-medium text-[#3f2114]">
        {icon}
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-[#3f2114]/12 bg-white px-4 text-sm text-[#231815] outline-none transition placeholder:text-[#8e7a6d] focus:border-[#d1582a]/35 focus:ring-4 focus:ring-[#d1582a]/10"
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
      <span className="text-sm font-medium text-[#3f2114]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-[1.4rem] border border-[#3f2114]/12 bg-white px-4 py-3 text-sm leading-6 text-[#231815] outline-none transition placeholder:text-[#8e7a6d] focus:border-[#d1582a]/35 focus:ring-4 focus:ring-[#d1582a]/10"
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
      className="inline-flex items-center gap-2 rounded-full bg-[#d1582a] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(209,88,42,0.26)] transition hover:bg-[#b7491f] disabled:cursor-not-allowed disabled:opacity-60"
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
      className="inline-flex items-center gap-2 rounded-full border border-[#3f2114]/12 px-4 py-2.5 text-sm font-medium text-[#5f4336] transition hover:border-[#d1582a]/30 hover:text-[#d1582a]"
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
    <div className="rounded-[1.6rem] border border-[#3f2114]/10 bg-white/85 p-5">
      <div className="inline-flex rounded-full bg-[#f5efe6] p-3 text-[#8f3412]">{icon}</div>
      <h3 className="font-display mt-4 text-[1.45rem] text-[#231815]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#6f5a4d]">{description}</p>
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
    <div className="rounded-[1.5rem] border border-dashed border-[#3f2114]/18 bg-white/70 px-4 py-5 text-sm leading-6 text-[#6f5a4d]">
      <p className="font-semibold text-[#231815]">{title}</p>
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
    <div className="rounded-[1.3rem] border border-[#3f2114]/10 bg-white/90 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f3412]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[#231815]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#6f5a4d]">{detail}</p>
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
    <div className="rounded-[1.2rem] border border-[#3f2114]/10 bg-white/88 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f3412]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[#5f4336]">{value}</p>
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
    <div className="rounded-[1.4rem] border border-[#3f2114]/10 bg-white/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#231815]">{title}</p>
        <span className="rounded-full bg-[#f7efe4] px-3 py-1 text-xs font-semibold text-[#8f3412]">
          {badge}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${title}-${item}`}
              className="rounded-[1.1rem] border border-[#3f2114]/10 bg-[#fffaf5] px-4 py-3 text-sm leading-6 text-[#5f4336]"
            >
              {item}
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-[#6f5a4d]">No items yet.</p>
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
    <div className="rounded-[1.4rem] border border-[#3f2114]/10 bg-white/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#231815]">{title}</p>
        <span className="rounded-full bg-[#f7efe4] px-3 py-1 text-xs font-semibold text-[#8f3412]">
          {issues.length}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {issues.length ? (
          issues.map((issue) => (
            <div
              key={`${title}-${issue.title}`}
              className="rounded-[1.2rem] border border-[#3f2114]/10 bg-[#fffaf5] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#231815]">{issue.title}</p>
                <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", toneClasses(issue.severity))}>
                  {issue.severity}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#5f4336]">{issue.evidence}</p>
              <div className="mt-3 rounded-xl bg-[#f7efe4] px-3 py-3 text-sm leading-6 text-[#5b4437]">
                <span className="font-semibold text-[#231815]">Next action:</span> {issue.action}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-[#6f5a4d]">{emptyMessage}</p>
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
    <div className="rounded-[1.4rem] border border-[#3f2114]/10 bg-white/90 p-4">
      <p className="text-sm font-semibold text-[#231815]">{title}</p>
      <div className="mt-4 space-y-4">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${title}-${item.title}`}
              className="rounded-[1.2rem] border border-[#3f2114]/10 bg-[#fffaf5] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#231815]">{item.title}</p>
                <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", toneClasses(item.impact))}>
                  {item.impact} impact
                </span>
                <span className="rounded-full border border-[#3f2114]/12 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6f5a4d]">
                  {item.effort}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#5f4336]">{item.why}</p>
              <div className="mt-3 space-y-2">
                {item.steps.map((step) => (
                  <div
                    key={`${item.title}-${step}`}
                    className="rounded-xl bg-[#f7efe4] px-3 py-3 text-sm leading-6 text-[#5b4437]"
                  >
                    {step}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-[#6f5a4d]">
                <span className="font-semibold text-[#231815]">Done when:</span> {item.doneWhen}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-[#6f5a4d]">No actions yet.</p>
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
    <div className="rounded-[1.4rem] border border-[#3f2114]/10 bg-white/90 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-[#231815]">{opportunity.title}</p>
        <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", toneClasses(opportunity.priority))}>
          {opportunity.priority}
        </span>
      </div>
      <p className="mt-2 text-sm text-[#8f3412]">{opportunity.targetKeyword}</p>
      <p className="mt-3 text-sm leading-6 text-[#5f4336]">{opportunity.reason}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.22em] text-[#6f5a4d]">{opportunity.pageType}</div>
        <button
          type="button"
          onClick={onUse}
          className="rounded-full border border-[#d1582a]/25 bg-[#fff4ea] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f3412] transition hover:border-[#d1582a]/45"
        >
          Use this idea
        </button>
      </div>
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
    <div className="rounded-[1.4rem] border border-[#3f2114]/10 bg-white/90 p-4">
      <p className="text-sm font-semibold text-[#231815]">{cluster.label}</p>
      <p className="mt-2 text-sm leading-6 text-[#6f5a4d]">{cluster.description}</p>

      <div className="mt-4 space-y-3">
        {cluster.suggestions.map((item) => (
          <div
            key={`${cluster.label}-${item.keyword}`}
            className="rounded-[1.15rem] border border-[#3f2114]/10 bg-[#fffaf5] p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[#231815]">{item.keyword}</p>
              <span className="rounded-full border border-[#3f2114]/12 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6f5a4d]">
                {item.intent}
              </span>
              <span className="rounded-full bg-[#f7efe4] px-2.5 py-1 text-[11px] font-semibold text-[#8f3412]">
                score {item.score}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#5f4336]">{item.why}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#8f3412]">{item.source}</p>
              <button
                type="button"
                onClick={() => onUseKeyword(item.keyword)}
                className="rounded-full border border-[#d1582a]/25 bg-[#fff4ea] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f3412] transition hover:border-[#d1582a]/45"
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
