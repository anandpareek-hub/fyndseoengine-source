"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/lib/site-context";
import { toast } from "sonner";
import {
  BookOpen,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  TrendingUp,
  BarChart3,
  Target,
  FileText,
  Globe,
  Zap,
  AlertTriangle,
  Layout,
  Sparkles,
  Database,
  ChevronDown,
  ChevronRight,
  PenTool,
  ArrowRight,
  Shield,
  Eye,
  Layers,
  Gift,
  HelpCircle,
  Image,
  Wrench,
  MapPin,
  Lightbulb,
  Snowflake,
  BookMarked,
  Link2,
  Code2,
  LayoutTemplate,
  Gauge,
  Network,
  Rocket,
} from "lucide-react";

// Safe render: converts any value to a displayable string (prevents React error #31)
function safeStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    // If it's an object with string values, join them
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length > 0) return entries.map(([k, val]) => `${k.replace(/([A-Z])/g, " $1").trim()}: ${typeof val === "string" ? val : JSON.stringify(val)}`).join("\n");
    return JSON.stringify(v);
  }
  return String(v);
}

// ============================================================
// Shared Components
// ============================================================

function SectionCard({ icon: Icon, title, children, badge, defaultOpen = true }: {
  icon: any; title: string; children: React.ReactNode; badge?: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border-b border-gray-100 px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-[#FF5722]" />
          <h3 className="text-sm font-semibold text-[#1a1a2e]">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <ChevronDown className={`size-4 text-gray-400 transition-transform ${open ? "" : "-rotate-90"}`} />
        </div>
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

const priorityColors: Record<string, string> = {
  high: "bg-red-50 text-red-600 border-red-200",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  low: "bg-gray-100 text-gray-500 border-gray-200",
  "must-write": "bg-red-50 text-red-600 border-red-200",
  "should-write": "bg-amber-50 text-amber-600 border-amber-200",
  "nice-to-have": "bg-gray-100 text-gray-500 border-gray-200",
};

const contentTypeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  blogPosts: { label: "Blog Posts", icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  guides: { label: "Guides", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50" },
  comparisonPages: { label: "Comparisons", icon: BarChart3, color: "text-amber-600", bg: "bg-amber-50" },
  landingPages: { label: "Landing Pages", icon: Layout, color: "text-purple-600", bg: "bg-purple-50" },
  lookbooks: { label: "Lookbooks", icon: Image, color: "text-pink-600", bg: "bg-pink-50" },
  faqPages: { label: "FAQ Pages", icon: HelpCircle, color: "text-teal-600", bg: "bg-teal-50" },
  giftGuides: { label: "Gift Guides", icon: Gift, color: "text-rose-600", bg: "bg-rose-50" },
  careGuides: { label: "Care Guides", icon: Wrench, color: "text-indigo-600", bg: "bg-indigo-50" },
  toolPages: { label: "Tool Pages", icon: Lightbulb, color: "text-orange-600", bg: "bg-orange-50" },
  localPages: { label: "Local Pages", icon: MapPin, color: "text-cyan-600", bg: "bg-cyan-50" },
  seasonalPages: { label: "Seasonal", icon: Snowflake, color: "text-sky-600", bg: "bg-sky-50" },
  glossaryPages: { label: "Glossary", icon: BookMarked, color: "text-gray-600", bg: "bg-gray-100" },
};

// ============================================================
// Content Card (used for each content recommendation)
// ============================================================

function ContentCard({ item, onWrite }: { item: any; onWrite: () => void }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h5 className="text-sm font-semibold text-[#1a1a2e] leading-snug">{item.title}</h5>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{item.slug}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${priorityColors[item.priority] || priorityColors.medium}`}>
            {item.priority}
          </span>
          <button
            onClick={onWrite}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] font-semibold bg-[#FF5722] text-white px-2.5 py-1 rounded-lg hover:bg-[#E64A19] transition-all"
          >
            <PenTool className="size-3" /> Write
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{item.brief}</p>
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400">
        <span className="font-mono bg-gray-50 px-2 py-0.5 rounded text-[#1a1a2e] font-medium">{item.targetKeyword}</span>
        {item.searchVolume > 0 && <span>{item.searchVolume.toLocaleString()} vol</span>}
        {item.keywordDifficulty > 0 && <span>KD {item.keywordDifficulty}</span>}
        {item.estimatedTraffic > 0 && <span className="text-emerald-600">~{item.estimatedTraffic.toLocaleString()} traffic</span>}
        {item.wordCount > 0 && <span>{item.wordCount.toLocaleString()} words</span>}
      </div>
      {item.secondaryKeywords?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.secondaryKeywords.slice(0, 4).map((kw: string, j: number) => (
            <span key={j} className="text-[10px] bg-gray-50 text-gray-400 rounded px-1.5 py-0.5">{kw}</span>
          ))}
        </div>
      )}
      {/* Competitor coverage + reasoning */}
      {(item.competitorsCovering?.length > 0 || item.rationale) && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          {item.competitorsCovering?.length > 0 && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] text-gray-400">Competitors with similar content:</span>
              {item.competitorsCovering.map((comp: string, j: number) => (
                <span key={j} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">{comp}</span>
              ))}
            </div>
          )}
          {item.rationale && (
            <p className="text-[10px] text-gray-500 leading-relaxed">
              <span className="font-medium text-[#1a1a2e]">Why write this:</span> {safeStr(item.rationale)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Error Boundary
// ============================================================

import React from "react";
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8 bg-red-50 rounded-xl border border-red-200 m-6">
          <h2 className="text-lg font-bold text-red-700 mb-2">Page Error</h2>
          <p className="text-sm text-red-600 font-mono whitespace-pre-wrap">{this.state.error.message}</p>
          <p className="text-xs text-red-400 font-mono mt-2 whitespace-pre-wrap">{this.state.error.stack?.slice(0, 500)}</p>
          <button onClick={() => this.setState({ error: null })} className="mt-4 bg-red-600 text-white px-4 py-2 rounded text-sm">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// Main Page
// ============================================================

export default function ContentStrategyPage() {
  const { currentSite } = useSite();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [activeContentTab, setActiveContentTab] = useState<string>("all");
  const [progress, setProgress] = useState<any>(null);

  const domain = currentSite?.domain?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";

  useEffect(() => {
    if (!currentSite) return;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/sites/${currentSite!.id}/content-strategy`);
        if (res.ok) {
          const result = await res.json();
          if (result.data) {
            setData(result.data);
            setAnalyzedAt(result.analyzedAt);
          }
          if (result.progress?.status === "running") {
            setProgress(result.progress);
            setGenerating(true);
          }
        }
      } catch (e) {
        console.error("Failed to fetch content strategy:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentSite]);

  // Poll for progress while generating
  useEffect(() => {
    if (!generating || !currentSite) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sites/${currentSite.id}/content-strategy`);
        if (res.ok) {
          const result = await res.json();
          if (result.progress) setProgress(result.progress);
          if (result.progress?.status === "completed" && result.data) {
            setData(result.data);
            setAnalyzedAt(result.analyzedAt);
            setGenerating(false);
            setProgress(null);
            toast.success("Content strategy generated!");
          } else if (result.progress?.status === "failed") {
            setGenerating(false);
            setProgress(null);
            toast.error(result.progress.message || "Content strategy generation failed");
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [generating, currentSite]);

  async function generateStrategy() {
    if (!currentSite) return;
    setGenerating(true);
    setProgress({ status: "running", phase: "Starting...", phaseNumber: 0, totalPhases: 16, message: "Initializing content strategy generation...", startedAt: new Date().toISOString(), details: [] });
    try {
      const res = await fetch(`/api/sites/${currentSite.id}/content-strategy`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to start content strategy generation");
        setGenerating(false);
        setProgress(null);
      }
      // POST returns immediately — polling useEffect handles the rest
    } catch (e) {
      console.error(e);
      toast.error("Failed to start content strategy generation");
      setGenerating(false);
      setProgress(null);
    }
  }

  async function writeArticle(item: any) {
    if (!currentSite) return;
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: currentSite.id,
          title: item.title,
          slug: item.slug,
          targetKeyword: item.targetKeyword,
          secondaryKeywords: item.secondaryKeywords,
          brief: item.brief,
          contentType: item.contentType,
        }),
      });
      if (res.ok) {
        const article = await res.json();
        toast.success("Article draft created!");
        router.push(`/articles/${article.id}`);
      } else {
        toast.error("Failed to create article");
      }
    } catch {
      toast.error("Failed to create article");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Compute content type counts from data.newContent
  const contentTypeCounts: Record<string, number> = {};
  let totalNewContent = 0;
  if (data?.newContent) {
    for (const [type, items] of Object.entries(data.newContent)) {
      const count = Array.isArray(items) ? items.length : 0;
      if (count > 0) {
        contentTypeCounts[type] = count;
        totalNewContent += count;
      }
    }
  }

  // Get all content items for "all" tab
  const allContentItems: { type: string; item: any }[] = [];
  if (data?.newContent) {
    for (const [type, items] of Object.entries(data.newContent)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          allContentItems.push({ type, item });
        }
      }
    }
  }
  // Sort by priority (high first) then by search volume
  allContentItems.sort((a, b) => {
    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const pa = priorityOrder[a.item.priority] ?? 1;
    const pb = priorityOrder[b.item.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return (b.item.searchVolume || 0) - (a.item.searchVolume || 0);
  });

  const dq = data?._dataQuality;

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Content Strategy</h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete content roadmap for {domain}
          </p>
          {analyzedAt && (
            <p className="mt-1 text-xs text-gray-400">
              Last generated: {new Date(analyzedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </div>
        <button
          onClick={generateStrategy}
          disabled={generating}
          className="flex items-center gap-2 rounded-lg bg-[#FF5722] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64A19] transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {generating ? "Generating..." : data ? "Regenerate" : "Generate Content Strategy"}
        </button>
      </div>

      {/* Generating state — detailed progress */}
      {generating && progress && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Loader2 className="size-5 text-[#FF5722] animate-spin shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#1a1a2e]">{progress.phase || "Generating..."}</p>
                <p className="text-xs text-gray-500 mt-0.5">{progress.message}</p>
              </div>
              <span className="text-xs font-medium text-gray-400">
                Step {progress.phaseNumber || 0}/{progress.totalPhases || 16}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF5722] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.max(2, ((progress.phaseNumber || 0) / (progress.totalPhases || 16)) * 100)}%` }}
              />
            </div>
          </div>
          {/* Step list */}
          {progress.details?.length > 0 && (
            <div className="px-6 py-4 max-h-[400px] overflow-y-auto">
              <div className="space-y-1">
                {progress.details.map((step: any, i: number) => (
                  <div key={i} className="flex items-center gap-2.5 py-1">
                    {step.status === "done" ? (
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    ) : step.status === "running" ? (
                      <Loader2 className="size-4 text-[#FF5722] animate-spin shrink-0" />
                    ) : (
                      <div className="size-4 rounded-full border border-gray-200 shrink-0" />
                    )}
                    <span className={`text-xs ${step.status === "done" ? "text-gray-500" : step.status === "running" ? "text-[#1a1a2e] font-medium" : "text-gray-300"}`}>
                      {step.phase}
                    </span>
                    {step.detail && (
                      <span className="text-[10px] text-gray-400 ml-auto">{step.detail}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {progress.startedAt && (
            <div className="px-6 py-2 border-t border-gray-50 text-[10px] text-gray-300">
              Started {new Date(progress.startedAt).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!data && !generating && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF5722] to-[#E64A19]">
              <BookOpen className="size-10 text-white" />
            </div>
            <h2 className="mt-6 text-xl font-bold text-[#1a1a2e]">Generate Your Content Strategy</h2>
            <p className="text-sm text-gray-500 mt-2 text-center max-w-lg">
              AI will analyze your website, find real content gaps vs competitors, research keywords, and create a complete content roadmap with actionable recommendations.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Database className="size-3" /> Real Keyword Data</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Target className="size-3" /> Content Gaps</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Globe className="size-3" /> Competitor Analysis</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Calendar className="size-3" /> Content Calendar</span>
            </div>
            <button
              onClick={generateStrategy}
              className="mt-8 flex items-center gap-2 rounded-lg bg-[#FF5722] px-6 py-3 text-sm font-semibold text-white hover:bg-[#E64A19] transition-colors"
            >
              <Sparkles className="size-4" />
              Generate Content Strategy
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* RESULTS */}
      {/* ============================================================ */}
      {data && (
        <div className="space-y-6">

          {/* Data Quality Badge */}
          {dq && (
            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              {dq.hasDataForSEO ? (
                <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                  <Database className="size-3" /> Real keyword data ({dq.totalKeywordsResearched || dq.realKeywordsCount} keywords researched)
                </span>
              ) : (
                <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                  <AlertTriangle className="size-3" /> AI-estimated data (no DataForSEO)
                </span>
              )}
              {(dq.pageLevelGapsFound > 0 || dq.keywordGapsFound > 0) && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                  <Target className="size-3" /> {dq.pageLevelGapsFound || 0} page gaps + {dq.keywordGapsFound || 0} keyword gaps
                </span>
              )}
              {dq.competitorsAnalyzed > 0 && (
                <span className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                  <Globe className="size-3" /> {dq.competitorsAnalyzed} competitors analyzed
                </span>
              )}
              {dq.totalRecommendations > 0 && (
                <span className="flex items-center gap-1 bg-[#FFF3E0] text-[#FF5722] px-2.5 py-1 rounded-full font-medium">
                  <FileText className="size-3" /> {dq.totalRecommendations} content recommendations
                </span>
              )}
              {dq.sitemapPages > 0 && (
                <span className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                  <Layers className="size-3" /> {dq.sitemapPages} sitemap pages
                </span>
              )}
              {dq.paaQuestionsCount > 0 && (
                <span className="flex items-center gap-1 bg-teal-50 text-teal-600 px-2.5 py-1 rounded-full font-medium">
                  <Search className="size-3" /> {dq.paaQuestionsCount} PAA + {dq.validatedAutocompleteCount || 0} autocomplete
                </span>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* EXECUTIVE SUMMARY */}
          {/* ============================================================ */}
          {data.executiveSummary && (
            <SectionCard icon={BookOpen} title="Executive Summary">
              {typeof data.executiveSummary === "string" ? (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{data.executiveSummary}</p>
              ) : (
                <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                  {Object.entries(data.executiveSummary).map(([key, value]: [string, any]) => (
                    <div key={key}>
                      <h5 className="text-xs font-semibold text-[#1a1a2e] uppercase tracking-wide mb-1">{key.replace(/([A-Z])/g, " $1").trim()}</h5>
                      <p className="whitespace-pre-line">{typeof value === "string" ? value : JSON.stringify(value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* CONTENT INVENTORY */}
          {/* ============================================================ */}
          {data.contentInventory && (
            <SectionCard icon={Layers} title="Content Inventory" badge={
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {data.contentInventory.totalPages || 0} pages
              </span>
            }>
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                {/* Breakdown bars */}
                <div className="space-y-2">
                  {[
                    { label: "Product Pages", count: data.contentInventory.productPages, color: "bg-blue-500" },
                    { label: "Category Pages", count: data.contentInventory.categoryPages, color: "bg-purple-500" },
                    { label: "Blog Posts", count: data.contentInventory.blogPosts, color: "bg-emerald-500" },
                    { label: "Guides", count: data.contentInventory.guides, color: "bg-amber-500" },
                    { label: "Other", count: data.contentInventory.otherPages, color: "bg-gray-400" },
                  ].map((row) => {
                    const total = data.contentInventory.totalPages || 1;
                    const pct = Math.round(((row.count || 0) / total) * 100);
                    return (
                      <div key={row.label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-28 shrink-0">{row.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className={`${row.color} rounded-full h-2`} style={{ width: `${Math.max(pct, 1)}%` }} />
                        </div>
                        <span className="text-xs font-medium text-[#1a1a2e] w-10 text-right">{row.count || 0}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Score + assessment */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`text-2xl font-bold ${
                      (data.contentInventory.contentScore || 0) >= 70 ? "text-emerald-600" :
                      (data.contentInventory.contentScore || 0) >= 40 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {data.contentInventory.contentScore || 0}/100
                    </div>
                    <span className="text-xs text-gray-400">Content Score</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{safeStr(data.contentInventory.assessment)}</p>
                </div>
              </div>
              {/* Product Types & Audience */}
              {(data.contentInventory.productTypes?.length > 0 || data.contentInventory.audienceSegments?.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2 mb-4">
                  {data.contentInventory.productTypes?.length > 0 && (
                    <div className="bg-blue-50/50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-2">Product Types Detected</p>
                      <div className="flex flex-wrap gap-1">
                        {data.contentInventory.productTypes.map((pt: string, i: number) => (
                          <span key={i} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">{pt}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.contentInventory.audienceSegments?.length > 0 && (
                    <div className="bg-purple-50/50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-purple-700 uppercase tracking-wide mb-2">Audience Segments</p>
                      <div className="flex flex-wrap gap-1">
                        {data.contentInventory.audienceSegments.map((seg: string, i: number) => (
                          <span key={i} className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">{seg}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid gap-3 sm:grid-cols-2">
                {data.contentInventory.strengths?.length > 0 && (
                  <div className="bg-emerald-50/50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Strengths</p>
                    {data.contentInventory.strengths.map((s: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-emerald-700 mb-1">
                        <CheckCircle2 className="size-3 mt-0.5 shrink-0" /> {s}
                      </div>
                    ))}
                  </div>
                )}
                {data.contentInventory.weaknesses?.length > 0 && (
                  <div className="bg-red-50/50 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-2">Weaknesses</p>
                    {data.contentInventory.weaknesses.map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-red-600 mb-1">
                        <AlertTriangle className="size-3 mt-0.5 shrink-0" /> {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* COMPETITOR SITEMAP COMPARISON */}
          {/* ============================================================ */}
          {data.competitorComparison?.length > 0 && (
            <SectionCard icon={Globe} title={`Competitor Content Comparison — ${data.competitorComparison.length} competitors`} badge={
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Sitemaps + keyword overlap</span>
            }>
              <div className="mb-4 bg-amber-50/50 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">Our content: {dq?.ourBlogCount || 0} blog posts + {dq?.ourContentCount || 0} content pages</span>
                  {" "}— Compare this against what competitors have below.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.competitorComparison.map((comp: any, i: number) => {
                  const hasData = comp.totalPages > 0;
                  const hasInsights = comp.strength || comp.keyInsight || comp.topicsTheyHaveWeDoNot?.length > 0;
                  return (
                    <div key={i} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <img src={`https://www.google.com/s2/favicons?domain=${comp.competitor}&sz=16`} alt="" className="size-4 rounded-sm" onError={(e: any) => { e.target.style.display = "none"; }} />
                        <span className="text-sm font-semibold text-[#1a1a2e]">{comp.competitor}</span>
                      </div>
                      {hasData ? (
                        <div className="flex items-center gap-3 mb-3 text-xs">
                          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{comp.totalPages} pages</span>
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">{comp.blogPosts || 0} blogs</span>
                          <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded">{comp.contentPages || 0} content</span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 mb-3">Sitemap not accessible — insights from keyword overlap data</p>
                      )}
                      {comp.strength && <p className="text-xs text-gray-500 mb-2">{safeStr(comp.strength)}</p>}
                      {comp.topicsTheyHaveWeDoNot?.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[10px] font-semibold text-[#FF5722] uppercase tracking-wide mb-1">Topics They Have, We Don&apos;t</p>
                          <div className="flex flex-wrap gap-1">
                            {comp.topicsTheyHaveWeDoNot.slice(0, 8).map((t: string, j: number) => (
                              <span key={j} className="text-[10px] bg-[#FFF3E0] text-[#E64A19] rounded px-1.5 py-0.5">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {comp.keyInsight && (
                        <p className="text-[10px] bg-blue-50 text-blue-700 rounded px-2 py-1 font-medium">{safeStr(comp.keyInsight)}</p>
                      )}
                      {!hasData && !hasInsights && (
                        <p className="text-[10px] text-gray-300 italic">No data available for this competitor</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* COMPETITOR CONTENT GAP */}
          {/* ============================================================ */}
          {data.competitorContentGap?.gaps?.length > 0 && (
            <SectionCard icon={Target} title={`Competitor Content Gap — ${data.competitorContentGap.gaps.length} keywords`} badge={
              dq?.contentGapsFound > 0 ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Real data</span>
              ) : (
                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">AI estimated</span>
              )
            }>
              {data.competitorContentGap.summary && (
                <p className="text-xs text-gray-600 mb-4 whitespace-pre-line">{safeStr(data.competitorContentGap.summary)}</p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="pb-2 text-gray-500 font-medium">Keyword</th>
                      <th className="pb-2 text-gray-500 font-medium text-right">Volume</th>
                      <th className="pb-2 text-gray-500 font-medium text-right">KD</th>
                      <th className="pb-2 text-gray-500 font-medium">Intent</th>
                      <th className="pb-2 text-gray-500 font-medium">Competitors</th>
                      <th className="pb-2 text-gray-500 font-medium">Recommended</th>
                      <th className="pb-2 text-gray-500 font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.competitorContentGap.gaps.map((gap: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-2 pr-3 font-mono font-medium text-[#1a1a2e]">{gap.keyword}</td>
                        <td className="py-2 text-right text-gray-600">{(gap.searchVolume || 0).toLocaleString()}</td>
                        <td className="py-2 text-right">
                          <span className={`${(gap.keywordDifficulty || 0) <= 30 ? "text-emerald-600" : (gap.keywordDifficulty || 0) <= 60 ? "text-amber-600" : "text-red-600"}`}>
                            {gap.keywordDifficulty || "—"}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            gap.searchIntent === "commercial" ? "bg-amber-50 text-amber-600" :
                            gap.searchIntent === "transactional" ? "bg-emerald-50 text-emerald-600" :
                            gap.searchIntent === "informational" ? "bg-blue-50 text-blue-600" :
                            "bg-gray-50 text-gray-500"
                          }`}>{gap.searchIntent}</span>
                        </td>
                        <td className="py-2 text-gray-500 max-w-[150px] truncate">
                          {(gap.competitorsCovering || []).join(", ")}
                        </td>
                        <td className="py-2">
                          <span className="text-[10px] bg-[#FFF3E0] text-[#FF5722] px-2 py-0.5 rounded font-medium">
                            {gap.recommendedPageType}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${priorityColors[gap.priority] || ""}`}>
                            {gap.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* NEW CONTENT RECOMMENDATIONS (by type) */}
          {/* ============================================================ */}
          {totalNewContent > 0 && (
            <SectionCard icon={FileText} title={`New Content to Create — ${totalNewContent} pages`} badge={
              <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">
                +{allContentItems.reduce((sum, { item }) => sum + (item.estimatedTraffic || 0), 0).toLocaleString()} est. traffic
              </span>
            }>
              {/* Content type tabs */}
              <div className="flex flex-wrap gap-1.5 mb-4 pb-3 border-b border-gray-100">
                <button
                  onClick={() => setActiveContentTab("all")}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    activeContentTab === "all" ? "bg-[#FF5722] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  All ({totalNewContent})
                </button>
                {Object.entries(contentTypeCounts).map(([type, count]) => {
                  const config = contentTypeConfig[type];
                  if (!config) return null;
                  return (
                    <button
                      key={type}
                      onClick={() => setActiveContentTab(type)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        activeContentTab === type ? "bg-[#FF5722] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {config.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Content cards */}
              <div className="space-y-3">
                {(activeContentTab === "all"
                  ? allContentItems
                  : allContentItems.filter(({ type }) => type === activeContentTab)
                ).map(({ type, item }, i) => (
                  <div key={i}>
                    {activeContentTab === "all" && i === 0 || (activeContentTab === "all" && allContentItems[i - 1]?.type !== type) ? (
                      <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
                        {contentTypeConfig[type] && (
                          <>
                            <div className={`flex size-5 items-center justify-center rounded ${contentTypeConfig[type].bg}`}>
                              {(() => { const I = contentTypeConfig[type].icon; return <I className={`size-3 ${contentTypeConfig[type].color}`} />; })()}
                            </div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              {contentTypeConfig[type].label} ({contentTypeCounts[type]})
                            </span>
                          </>
                        )}
                      </div>
                    ) : null}
                    <ContentCard item={item} onWrite={() => writeArticle(item)} />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* EXISTING PAGE OPTIMIZATIONS */}
          {/* ============================================================ */}
          {data.existingPageOptimizations?.length > 0 && (
            <SectionCard icon={Wrench} title={`Page Optimizations — ${data.existingPageOptimizations.length} pages`}>
              <div className="space-y-3">
                {data.existingPageOptimizations.map((opt: any, i: number) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-medium text-[#1a1a2e] bg-gray-50 px-2 py-0.5 rounded">{opt.url}</span>
                      <div className="flex items-center gap-2">
                        {opt.searchVolume > 0 && <span className="text-[10px] text-gray-400">{opt.searchVolume.toLocaleString()} vol</span>}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          opt.impact === "high" ? "bg-red-50 text-red-600" : opt.impact === "medium" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"
                        }`}>{opt.impact} impact</span>
                      </div>
                    </div>
                    {opt.currentPosition && (
                      <p className="text-[10px] text-gray-400 mb-2">
                        Currently ranking #{opt.currentPosition} · Target keyword: <span className="font-mono text-[#1a1a2e]">{opt.targetKeyword}</span>
                        {opt.estimatedTrafficGain > 0 && <span className="text-emerald-600 ml-2">+{opt.estimatedTrafficGain.toLocaleString()} potential traffic</span>}
                      </p>
                    )}
                    {opt.issues?.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wide mb-1">Issues</p>
                        <div className="flex flex-wrap gap-1.5">
                          {opt.issues.map((issue: string, j: number) => (
                            <span key={j} className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded">{issue}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {opt.recommendations?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">Recommendations</p>
                        <div className="space-y-1">
                          {opt.recommendations.map((rec: string, j: number) => (
                            <div key={j} className="flex items-start gap-2 text-xs text-gray-600">
                              <ArrowRight className="size-3 text-emerald-500 mt-0.5 shrink-0" /> {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* TOPICAL CLUSTERS */}
          {/* ============================================================ */}
          {data.topicalClusters?.length > 0 && (
            <SectionCard icon={Layout} title={`Topical Authority Map — ${data.topicalClusters.length} clusters`}>
              <div className="space-y-6">
                {data.topicalClusters.map((cluster: any, i: number) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-[#FF5722]/5 to-[#FF5722]/10 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-semibold text-[#1a1a2e]">{cluster.pillarTopic}</h5>
                          {cluster.pillarPage && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Pillar: {cluster.pillarPage.title} — <span className="font-mono text-[#FF5722]">{cluster.pillarPage.targetKeyword}</span>
                              {cluster.pillarPage.searchVolume > 0 && <span className="text-gray-400"> ({cluster.pillarPage.searchVolume.toLocaleString()} vol)</span>}
                            </p>
                          )}
                        </div>
                        {cluster.estimatedClusterTraffic > 0 && (
                          <span className="text-xs bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full font-medium">
                            {cluster.estimatedClusterTraffic.toLocaleString()} traffic
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      {cluster.supportingContent?.map((article: any, j: number) => (
                        <div key={j} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 group">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[#1a1a2e] truncate">{article.title}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{article.slug}</p>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-gray-400 shrink-0 ml-3">
                            <span className="font-mono text-[#1a1a2e]">{article.targetKeyword}</span>
                            {article.searchVolume > 0 && <span>{article.searchVolume.toLocaleString()}</span>}
                            {article.keywordDifficulty > 0 && <span>KD {article.keywordDifficulty}</span>}
                            {article.contentType && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{article.contentType}</span>}
                            <button
                              onClick={() => writeArticle(article)}
                              className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold bg-[#FF5722] text-white px-2 py-0.5 rounded hover:bg-[#E64A19] transition-all"
                            >
                              Write
                            </button>
                          </div>
                        </div>
                      ))}
                      {cluster.internalLinkingStrategy && (
                        <p className="text-[10px] text-gray-400 italic mt-2 px-1">{cluster.internalLinkingStrategy}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* CONTENT CALENDAR */}
          {/* ============================================================ */}
          {data.contentCalendar?.length > 0 && (
            <SectionCard icon={Calendar} title={`90-Day Publishing Calendar — ${data.contentCalendar.length} weeks`} defaultOpen={false}>
              <div className="space-y-4">
                {data.contentCalendar.map((week: any, i: number) => {
                  // Support both old format (month.articles) and new format (week.items)
                  const items = week.items || week.articles || [];
                  const weekLabel = week.week ? `Week ${week.week}` : week.month || `Week ${i + 1}`;
                  return (
                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                        <Calendar className="size-3 text-[#FF5722]" />
                        <h5 className="text-xs font-semibold text-[#1a1a2e]">{weekLabel}</h5>
                        <span className="text-[10px] text-gray-400">{items.length} items</span>
                        {week.theme && <span className="text-[10px] bg-[#FFF3E0] text-[#FF5722] px-2 py-0.5 rounded-full ml-auto">{week.theme}</span>}
                      </div>
                      <div className="divide-y divide-gray-50">
                        {items.map((article: any, j: number) => (
                          <div key={j} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-gray-50/50">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[#1a1a2e] truncate">{article.title}</p>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 shrink-0">
                              <span className="font-mono">{article.targetKeyword}</span>
                              {article.searchVolume > 0 && <span>{article.searchVolume.toLocaleString()}</span>}
                              {article.contentType && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{article.contentType}</span>}
                              {article.funnelStage && <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                article.funnelStage === "TOFU" ? "bg-blue-50 text-blue-600" :
                                article.funnelStage === "MOFU" ? "bg-amber-50 text-amber-600" :
                                "bg-emerald-50 text-emerald-600"
                              }`}>{article.funnelStage}</span>}
                              {article.priority && <span className={`px-1.5 py-0.5 rounded-full border text-[10px] ${priorityColors[article.priority] || ""}`}>{article.priority}</span>}
                              <button
                                onClick={() => writeArticle(article)}
                                className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold bg-[#FF5722] text-white px-2 py-0.5 rounded hover:bg-[#E64A19] transition-all"
                              >
                                Write
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* QUICK WINS */}
          {/* ============================================================ */}
          {data.quickWins?.length > 0 && (
            <SectionCard icon={Zap} title={`Quick Wins — ${data.quickWins.length} actions`}>
              <div className="space-y-2.5">
                {data.quickWins.map((win: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 bg-emerald-50/30 border border-emerald-200/30 rounded-xl px-4 py-3">
                    <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-medium text-[#1a1a2e]">{win.action}</p>
                        {win.page && <span className="text-[10px] font-mono text-gray-400">{win.page}</span>}
                      </div>
                      <p className="text-xs text-gray-500">{win.details}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                        <span className={win.impact === "high" ? "text-red-500 font-medium" : "text-amber-500"}>{win.impact} impact</span>
                        <span>{win.effort} effort</span>
                        {win.expectedTraffic > 0 && <span className="text-emerald-600">+{win.expectedTraffic.toLocaleString()} traffic</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* FUNNEL MAP (TOFU/MOFU/BOFU) */}
          {/* ============================================================ */}
          {data.funnelMap && (
            <SectionCard icon={Network} title="SEO Funnel Map — TOFU / MOFU / BOFU" defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: "tofu", label: "TOFU — Awareness", color: "blue", icon: Eye },
                  { key: "mofu", label: "MOFU — Consideration", color: "amber", icon: Search },
                  { key: "bofu", label: "BOFU — Decision", color: "emerald", icon: Target },
                ].map(({ key, label, color, icon: FIcon }) => {
                  const stage = data.funnelMap[key];
                  if (!stage) return null;
                  return (
                    <div key={key} className={`border rounded-xl p-4 bg-${color}-50/30 border-${color}-200/50`}>
                      <div className="flex items-center gap-2 mb-2">
                        <FIcon className={`size-4 text-${color}-600`} />
                        <h5 className="text-xs font-semibold text-[#1a1a2e]">{label}</h5>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{stage.description}</p>
                      {stage.estimatedTraffic > 0 && (
                        <p className={`text-[10px] text-${color}-600 font-medium mb-2`}>~{stage.estimatedTraffic.toLocaleString()} est. traffic</p>
                      )}
                      {stage.contentTypes?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {stage.contentTypes.map((ct: string, i: number) => (
                            <span key={i} className={`text-[10px] bg-${color}-100 text-${color}-700 px-1.5 py-0.5 rounded`}>{ct}</span>
                          ))}
                        </div>
                      )}
                      {stage.topics?.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {stage.topics.slice(0, 6).map((t: string, i: number) => (
                            <p key={i} className="text-[10px] text-gray-600">• {t}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* CONTENT ARCHITECTURE */}
          {/* ============================================================ */}
          {data.contentArchitecture?.hubs?.length > 0 && (
            <SectionCard icon={Layers} title={`Content Architecture — ${data.contentArchitecture.hubs.length} hubs`} defaultOpen={false}>
              <div className="space-y-4">
                {data.contentArchitecture.hubs.map((hub: any, i: number) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-[#FF5722]/5 to-[#FF5722]/10 px-4 py-3">
                      <h5 className="text-sm font-semibold text-[#1a1a2e]">{hub.name}</h5>
                      <p className="text-xs text-gray-500 mt-0.5">{hub.description}</p>
                      {hub.pillarPage && <p className="text-[10px] text-[#FF5722] font-medium mt-1">Pillar: {hub.pillarPage}</p>}
                    </div>
                    <div className="p-4 space-y-3">
                      {hub.clusters?.map((cluster: any, j: number) => (
                        <div key={j} className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-xs font-medium text-[#1a1a2e] mb-1">{cluster.name}</p>
                          <div className="flex flex-wrap gap-1">
                            {cluster.pages?.map((page: string, k: number) => (
                              <span key={k} className="text-[10px] bg-white text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">{page}</span>
                            ))}
                          </div>
                          {cluster.keywords?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {cluster.keywords.slice(0, 5).map((kw: string, k: number) => (
                                <span key={k} className="text-[10px] font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{kw}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* PROGRAMMATIC SEO */}
          {/* ============================================================ */}
          {data.programmaticSEO?.templates?.length > 0 && (
            <SectionCard icon={Code2} title={`Programmatic SEO — ${data.programmaticSEO.templates.length} templates`} defaultOpen={false}>
              <div className="space-y-4">
                {data.programmaticSEO.templates.map((tmpl: any, i: number) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Code2 className="size-4 text-[#FF5722]" />
                      <h5 className="text-sm font-semibold text-[#1a1a2e]">{tmpl.name}</h5>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{tmpl.description}</p>
                    <div className="space-y-1 mb-3">
                      <p className="text-[10px] text-gray-400">URL Pattern: <span className="font-mono text-[#1a1a2e]">{tmpl.urlPattern}</span></p>
                      <p className="text-[10px] text-gray-400">Title Pattern: <span className="font-mono text-[#1a1a2e]">{tmpl.titlePattern}</span></p>
                      <p className="text-[10px] text-gray-400">Keyword Pattern: <span className="font-mono text-[#1a1a2e]">{tmpl.targetKeywordPattern}</span></p>
                    </div>
                    {tmpl.examplePages?.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Example Pages</p>
                        {tmpl.examplePages.slice(0, 6).map((ex: any, j: number) => (
                          <div key={j} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[#1a1a2e] truncate">{ex.title}</p>
                              <p className="text-[10px] font-mono text-gray-400 truncate">{ex.url}</p>
                            </div>
                            {ex.estimatedVolume > 0 && (
                              <span className="text-[10px] text-gray-400 ml-3 shrink-0">{ex.estimatedVolume.toLocaleString()} vol</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* INTERNAL LINKING SYSTEM */}
          {/* ============================================================ */}
          {data.internalLinking && (
            <SectionCard icon={Link2} title="Internal Linking System" defaultOpen={false}>
              <div className="space-y-4">
                {data.internalLinking.hubSpokeModel && (
                  <div className="bg-blue-50/50 rounded-xl p-4">
                    <h5 className="text-xs font-semibold text-[#1a1a2e] mb-1">Hub & Spoke Model</h5>
                    <p className="text-xs text-gray-600">{data.internalLinking.hubSpokeModel}</p>
                  </div>
                )}
                {data.internalLinking.breadcrumbStrategy && (
                  <div className="bg-purple-50/50 rounded-xl p-4">
                    <h5 className="text-xs font-semibold text-[#1a1a2e] mb-1">Breadcrumb Strategy</h5>
                    <p className="text-xs text-gray-600">{data.internalLinking.breadcrumbStrategy}</p>
                  </div>
                )}
                {data.internalLinking.rules?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Linking Rules</h5>
                    <div className="space-y-2">
                      {data.internalLinking.rules.map((r: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-lg px-4 py-2.5">
                          <Link2 className="size-3.5 text-[#FF5722] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-[#1a1a2e]">{r.rule}</p>
                            {r.example && <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{r.example}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.internalLinking.contextualLinkingRules?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Contextual Linking</h5>
                    <div className="space-y-1">
                      {data.internalLinking.contextualLinkingRules.map((rule: string, i: number) => (
                        <p key={i} className="text-xs text-gray-600 flex items-start gap-2">
                          <ArrowRight className="size-3 text-emerald-500 mt-0.5 shrink-0" /> {rule}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* ON-PAGE CONTENT TEMPLATES */}
          {/* ============================================================ */}
          {data.onPageTemplates && (
            <SectionCard icon={LayoutTemplate} title="On-Page Content Templates" defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: "categoryPage", label: "Category Page", color: "purple" },
                  { key: "blogPost", label: "Blog Post", color: "blue" },
                  { key: "toolPage", label: "Tool Page", color: "orange" },
                ].map(({ key, label, color }) => {
                  const tmpl = data.onPageTemplates[key];
                  if (!tmpl) return null;
                  return (
                    <div key={key} className={`border rounded-xl p-4 bg-${color}-50/20 border-${color}-200/30`}>
                      <h5 className={`text-xs font-semibold text-${color}-700 mb-2`}>{label}</h5>
                      {tmpl.h1Pattern && (
                        <p className="text-[10px] text-gray-400 mb-2">H1: <span className="font-mono text-[#1a1a2e]">{tmpl.h1Pattern}</span></p>
                      )}
                      {tmpl.wordCountRange && (
                        <p className="text-[10px] text-gray-400 mb-2">Word Count: {tmpl.wordCountRange}</p>
                      )}
                      {tmpl.sections?.length > 0 && (
                        <div className="space-y-1 mb-2">
                          <p className="text-[10px] font-semibold text-gray-500">Sections:</p>
                          {tmpl.sections.map((s: string, i: number) => (
                            <p key={i} className="text-[10px] text-gray-600 pl-2">• {s}</p>
                          ))}
                        </div>
                      )}
                      {tmpl.schemaTypes?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tmpl.schemaTypes.map((s: string, i: number) => (
                            <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                      )}
                      {tmpl.faqBlock !== undefined && (
                        <p className="text-[10px] text-gray-400 mt-2">FAQ Block: {tmpl.faqBlock ? "Yes" : "No"}</p>
                      )}
                      {tmpl.conversionElements?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] font-semibold text-gray-500">Conversion Elements:</p>
                          {tmpl.conversionElements.map((el: string, i: number) => (
                            <p key={i} className="text-[10px] text-emerald-600 pl-2">✓ {el}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* KPI TARGETS */}
          {/* ============================================================ */}
          {data.kpiTargets && (
            <SectionCard icon={Gauge} title="KPI Targets & Measurement" defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: "thirtyDay", label: "30-Day Targets", color: "blue" },
                  { key: "sixtyDay", label: "60-Day Targets", color: "amber" },
                  { key: "ninetyDay", label: "90-Day Targets", color: "emerald" },
                ].map(({ key, label, color }) => {
                  const targets = data.kpiTargets[key];
                  if (!targets?.length) return null;
                  return (
                    <div key={key} className={`border rounded-xl p-4 bg-${color}-50/20 border-${color}-200/30`}>
                      <h5 className={`text-xs font-semibold text-${color}-700 mb-3`}>{label}</h5>
                      <div className="space-y-2">
                        {targets.map((kpi: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                            <span className="text-xs text-gray-600">{kpi.metric}</span>
                            <div className="flex items-center gap-2">
                              {kpi.current && <span className="text-[10px] text-gray-400">{kpi.current}</span>}
                              <span className={`text-xs font-semibold text-${color}-600`}>{kpi.target}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}

          {/* Footer timestamp */}
          {analyzedAt && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="size-3" />
              Last generated: {new Date(analyzedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
