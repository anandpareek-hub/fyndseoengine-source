"use client";

import { startTransition, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { marked } from "marked";
import {
  ArrowRight,
  BookText,
  Copy,
  Download,
  Globe2,
  History,
  NotebookPen,
  RefreshCcw,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DraftKind } from "@/lib/openai";

type WorkspaceProfile = {
  projectName: string;
  websiteUrl: string;
  audience: string;
  offer: string;
  differentiators: string;
  goals: string;
  voice: string;
  notes: string;
};

type DraftHistoryItem = {
  id: string;
  title: string;
  kind: DraftKind;
  createdAt: string;
  focusKeyword: string;
  content: string;
};

const PROFILE_STORAGE_KEY = "fynd-personal-seo-profile";
const HISTORY_STORAGE_KEY = "fynd-personal-seo-history";

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
  offer: "A personal brand that publishes training plans, email courses, and lightweight coaching offers",
  differentiators: "Clear explanations, strong lived experience, generous free value, and a warm editorial tone",
  goals: "Grow organic traffic, build an email list, and identify 2-3 content-led offers that can convert",
  voice: "Thoughtful, practical, encouraging, and lightly opinionated",
  notes: "Prioritize topics a solo creator can ship quickly. Keep recommendations realistic for one person.",
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
    description: "A fast operator memo with positioning, keyword themes, and a 30-day SEO plan.",
  },
  {
    id: "content-calendar",
    label: "Content Calendar",
    eyebrow: "Publishing plan",
    description: "A list of article opportunities sequenced into a sensible publishing rhythm.",
  },
  {
    id: "article-brief",
    label: "Article Brief",
    eyebrow: "Execution",
    description: "A single article brief with angle, outline, search intent, proof points, and CTA.",
  },
  {
    id: "homepage-refresh",
    label: "Homepage Refresh",
    eyebrow: "Messaging",
    description: "A homepage critique plus rewritten copy and SEO improvements for your core page.",
  },
  {
    id: "content-audit",
    label: "Content Audit",
    eyebrow: "Diagnosis",
    description: "A quick audit with strengths, gaps, refresh ideas, and fast wins.",
  },
];

type PersonalSeoWorkspaceProps = {
  legacyPath: string | null;
};

export default function PersonalSeoWorkspace({
  legacyPath,
}: PersonalSeoWorkspaceProps) {
  const [profile, setProfile] = useState<WorkspaceProfile>(emptyProfile);
  const [kind, setKind] = useState<DraftKind>("strategy-snapshot");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [constraints, setConstraints] = useState("");
  const [activeDraft, setActiveDraft] = useState<DraftHistoryItem | null>(null);
  const [history, setHistory] = useState<DraftHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    marked.setOptions({ breaks: true, gfm: true });

    try {
      const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      const savedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);

      if (savedProfile) {
        setProfile(JSON.parse(savedProfile) as WorkspaceProfile);
      }

      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as DraftHistoryItem[];
        setHistory(parsedHistory);
        setActiveDraft(parsedHistory[0] ?? null);
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

  const html = activeDraft ? marked.parse(activeDraft.content) : "";

  async function handleGenerate() {
    setLoading(true);

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
        setHistory((current) => [item, ...current].slice(0, 10));
      });

      toast.success("Draft generated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The draft could not be generated.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function copyDraft() {
    if (!activeDraft) return;

    try {
      await navigator.clipboard.writeText(activeDraft.content);
      toast.success("Copied markdown to clipboard");
    } catch {
      toast.error("Clipboard access failed");
    }
  }

  function downloadDraft() {
    if (!activeDraft) return;

    const blob = new Blob([activeDraft.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = activeDraft.createdAt.slice(0, 10);

    anchor.href = url;
    anchor.download = `${activeDraft.kind}-${stamp}.md`;
    anchor.click();
    URL.revokeObjectURL(url);

    toast.success("Markdown exported");
  }

  function resetWorkspace() {
    setProfile(emptyProfile);
    setFocusKeyword("");
    setConstraints("");
    setActiveDraft(null);
    setHistory([]);
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    toast.success("Local workspace cleared");
  }

  function loadSample() {
    setProfile(sampleProfile);
    toast.success("Sample project loaded");
  }

  const completedDrafts = history.length;

  return (
    <main className="relative overflow-hidden pb-16">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(245,176,138,0.55),transparent_40%),linear-gradient(180deg,rgba(255,250,242,0.9),rgba(245,239,230,0))]" />

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
                  Personal SEO workspace
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#f5b08a]/25 bg-[#f5b08a]/10 px-3 py-1 text-xs font-medium text-[#ffd6c0]">
                  Runtime env: OPENAI_API_KEY only
                </span>
              </div>

              <h1 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-[4.25rem]">
                Your old SaaS shell is now a focused studio for strategy, briefs, and SEO writing.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                No sign-in. No database. No team layer. Drop in your site context, pick a deliverable,
                and generate drafts that stay saved in this browser for personal use.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Saved drafts" value={String(completedDrafts).padStart(2, "0")} />
              <StatCard label="Deliverables" value={String(deliverables.length)} />
              <StatCard label="Storage" value="Local" />
            </div>
          </div>

          {legacyPath ? (
            <div className="mt-6 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white/72">
              You arrived via <span className="font-semibold text-white">{legacyPath}</span>. This personal
              version routes legacy paths into one workspace so old bookmarks do not strand you.
            </div>
          ) : null}
        </motion.section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
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
                <h2 className="font-display mt-2 text-3xl text-[#231815]">Context in, better drafts out</h2>
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
                placeholder="Fynd notes, side project, personal brand..."
              />
              <Field
                label="Website URL"
                icon={<Globe2 className="size-4" />}
                value={profile.websiteUrl}
                onChange={(value) => setProfile((current) => ({ ...current, websiteUrl: value }))}
                placeholder="https://example.com"
              />
              <LongField
                label="Audience"
                value={profile.audience}
                onChange={(value) => setProfile((current) => ({ ...current, audience: value }))}
                placeholder="Who this is for, what they already know, and what they struggle with."
              />
              <LongField
                label="Offer"
                value={profile.offer}
                onChange={(value) => setProfile((current) => ({ ...current, offer: value }))}
                placeholder="What the site actually helps with or sells."
              />
              <LongField
                label="Differentiators"
                value={profile.differentiators}
                onChange={(value) => setProfile((current) => ({ ...current, differentiators: value }))}
                placeholder="Why someone should trust this project over alternatives."
              />
              <LongField
                label="Goals"
                value={profile.goals}
                onChange={(value) => setProfile((current) => ({ ...current, goals: value }))}
                placeholder="Traffic, email signups, product discovery, authority, conversions..."
              />
              <LongField
                label="Voice"
                value={profile.voice}
                onChange={(value) => setProfile((current) => ({ ...current, voice: value }))}
                placeholder="Warm, analytical, direct, premium, playful..."
              />
              <LongField
                label="Notes"
                value={profile.notes}
                onChange={(value) => setProfile((current) => ({ ...current, notes: value }))}
                placeholder="Any guardrails, business context, or things the assistant should know."
              />
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="rounded-[2rem] border border-[#3f2114]/10 bg-[#fff7ef]/80 p-5 shadow-[0_22px_60px_rgba(63,33,20,0.08)] backdrop-blur sm:p-6"
          >
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f3412]">
                Deliverable
              </p>
              <h2 className="font-display mt-2 text-3xl text-[#231815]">Pick what you need right now</h2>
            </div>

            <div className="grid gap-3">
              {deliverables.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setKind(item.id)}
                  className={cn(
                    "rounded-[1.5rem] border p-4 text-left transition-all",
                    kind === item.id
                      ? "border-[#d1582a]/45 bg-[#2a1d18] text-white shadow-[0_12px_28px_rgba(42,29,24,0.18)]"
                      : "border-[#3f2114]/10 bg-white/85 text-[#2a1d18] hover:border-[#d1582a]/25 hover:bg-white"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-[0.24em]",
                          kind === item.id ? "text-white/58" : "text-[#8f3412]"
                        )}
                      >
                        {item.eyebrow}
                      </p>
                      <p className="mt-2 text-lg font-semibold">{item.label}</p>
                      <p
                        className={cn(
                          "mt-2 text-sm leading-6",
                          kind === item.id ? "text-white/72" : "text-[#6f5a4d]"
                        )}
                      >
                        {item.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        kind === item.id ? "bg-white/10 text-white" : "bg-[#f5efe6] text-[#5f4336]"
                      )}
                    >
                      {kind === item.id ? "Selected" : "Ready"}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field
                label="Focus keyword"
                icon={<Target className="size-4" />}
                value={focusKeyword}
                onChange={setFocusKeyword}
                placeholder="Optional keyword or topic"
              />
              <LongField
                label="Constraints"
                value={constraints}
                onChange={setConstraints}
                placeholder="Any must-include angles, exclusions, format asks, or business constraints."
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-[#d1582a] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(209,88,42,0.26)] transition hover:bg-[#b7491f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <WandSparkles className="size-4 animate-pulse" /> : <Sparkles className="size-4" />}
                {loading ? "Generating draft..." : "Generate draft"}
                <ArrowRight className="size-4" />
              </button>

              <button
                type="button"
                onClick={resetWorkspace}
                className="inline-flex items-center gap-2 rounded-full border border-[#3f2114]/12 px-5 py-3 text-sm font-medium text-[#5f4336] transition hover:border-[#8f3412]/35 hover:text-[#8f3412]"
              >
                <RefreshCcw className="size-4" />
                Clear local data
              </button>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[#3f2114]/10 bg-white/70 p-4 text-sm text-[#6f5a4d]">
              This version is intentionally local-first. Your project profile and recent drafts are saved in
              this browser, while generation requests only hit your own OpenAI account.
            </div>
          </motion.section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="rounded-[2rem] border border-[#3f2114]/10 bg-[#fffaf4]/85 p-5 shadow-[0_18px_50px_rgba(63,33,20,0.08)] backdrop-blur sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f3412]">
                  Draft history
                </p>
                <h2 className="font-display mt-2 text-2xl text-[#231815]">What you generated</h2>
              </div>
              <History className="size-5 text-[#8f3412]" />
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {history.length ? (
                  history.map((item) => (
                    <motion.button
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      key={item.id}
                      type="button"
                      onClick={() => setActiveDraft(item)}
                      className={cn(
                        "w-full rounded-[1.35rem] border px-4 py-3 text-left transition-all",
                        activeDraft?.id === item.id
                          ? "border-[#d1582a]/35 bg-[#2a1d18] text-white"
                          : "border-[#3f2114]/10 bg-white/90 text-[#231815] hover:border-[#d1582a]/20"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-[0.2em]",
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
                      {item.focusKeyword ? (
                        <p
                          className={cn(
                            "mt-2 text-xs",
                            activeDraft?.id === item.id ? "text-[#ffd6c0]" : "text-[#8f3412]"
                          )}
                        >
                          Focus: {item.focusKeyword}
                        </p>
                      ) : null}
                    </motion.button>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[1.5rem] border border-dashed border-[#3f2114]/18 bg-white/70 px-4 py-5 text-sm leading-6 text-[#6f5a4d]"
                  >
                    Your first draft will show up here. Try starting with a strategy snapshot if you want a fast
                    sense of direction.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="rounded-[2rem] border border-[#3f2114]/10 bg-[#fffdf8]/88 p-5 shadow-[0_18px_50px_rgba(63,33,20,0.08)] backdrop-blur sm:p-6"
          >
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f3412]">
                  Draft canvas
                </p>
                <h2 className="font-display mt-2 text-3xl text-[#231815]">
                  {activeDraft ? activeDraft.title : "Generate a draft to begin"}
                </h2>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copyDraft}
                  disabled={!activeDraft}
                  className="inline-flex items-center gap-2 rounded-full border border-[#3f2114]/12 px-4 py-2.5 text-sm font-medium text-[#5f4336] transition hover:border-[#d1582a]/30 hover:text-[#d1582a] disabled:opacity-45"
                >
                  <Copy className="size-4" />
                  Copy markdown
                </button>
                <button
                  type="button"
                  onClick={downloadDraft}
                  disabled={!activeDraft}
                  className="inline-flex items-center gap-2 rounded-full border border-[#3f2114]/12 px-4 py-2.5 text-sm font-medium text-[#5f4336] transition hover:border-[#d1582a]/30 hover:text-[#d1582a] disabled:opacity-45"
                >
                  <Download className="size-4" />
                  Download .md
                </button>
              </div>
            </div>

            {activeDraft ? (
              <div className="rounded-[1.6rem] border border-[#3f2114]/10 bg-white/90 p-5 sm:p-6">
                <div
                  className="article-content font-sans"
                  dangerouslySetInnerHTML={{ __html: typeof html === "string" ? html : "" }}
                />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <HintCard
                  icon={<BookText className="size-5" />}
                  title="Start with the landscape"
                  description="A strategy snapshot is the fastest way to turn fuzzy goals into a concrete SEO plan."
                />
                <HintCard
                  icon={<Target className="size-5" />}
                  title="Add a focus keyword"
                  description="Optional keywords help the assistant sharpen the brief without forcing the entire strategy around one phrase."
                />
                <HintCard
                  icon={<NotebookPen className="size-5" />}
                  title="Keep notes personal"
                  description="Write the real constraints here: time, skills, business model, and what you actually want this site to do."
                />
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
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
  icon: React.ReactNode;
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

function HintCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-[#3f2114]/10 bg-white/85 p-5">
      <div className="inline-flex rounded-full bg-[#f5efe6] p-3 text-[#8f3412]">{icon}</div>
      <h3 className="font-display mt-4 text-2xl text-[#231815]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#6f5a4d]">{description}</p>
    </div>
  );
}
