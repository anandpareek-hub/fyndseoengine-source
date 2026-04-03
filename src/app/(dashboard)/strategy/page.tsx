"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/lib/site-context";
import { toast } from "sonner";
import {
  Zap,
  Loader2,
  TrendingUp,
  TrendingDown,
  Globe,
  Search,
  Shield,
  Link2,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  Users,
  FileText,
  ChevronRight,
  RefreshCw,
  Clock,
  Minus,
  Calendar,
  Map,
  BookOpen,
  Sword,
  Wrench,
  ExternalLink,
  Layout,
} from "lucide-react";

type Audit = {
  id: string;
  status: string;
  phase: string;
  healthScore: number | null;
  executiveSummary: string | null;
  domainOverview: any;
  rankedKeywords: any[];
  quickWins: any[];
  topPages: any[];
  competitors: any[];
  contentGaps: any[];
  competitorTraffic: any[];
  keywordSuggestions: any[];
  peopleAlsoAsk: string[];
  autocompleteSuggestions: string[];
  relatedSearches: string[];
  serpAnalysis: any[];
  technicalAudit: any;
  lighthouseScores: any;
  backlinkSummary: any;
  anchorDistribution: any[];
  topBacklinks: any[];
  quickWinActions: any[];
  contentStrategy: any;
  customerSearchBehavior: any;
  siteArchitecture: any;
  topicalMap: any;
  blogCalendar: any;
  competitivePlaybook: any;
  technicalRoadmap: any;
  linkBuildingPlan: any;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

const phaseLabels: Record<string, string> = {
  starting: "Initializing audit...",
  domain_intel: "Analyzing domain authority & rankings...",
  competitors: "Researching competitors...",
  keywords: "Discovering keyword opportunities...",
  serp: "Analyzing search results...",
  technical: "Running technical audit...",
  backlinks: "Auditing backlink profile...",
  synthesizing: "AI generating strategy...",
  completed: "Audit complete",
};

const phaseOrder = ["domain_intel", "competitors", "keywords", "serp", "technical", "backlinks", "synthesizing"];

function ScoreRing({ score, size = 120, label }: { score: number; size?: number; label?: string }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#FF5722" : score >= 40 ? "#f59e0b" : "#dc2626";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-3xl font-bold text-[#1a1a2e]">{score}</span>
        <span className="text-xs text-gray-400">/100</span>
      </div>
      {label && <span className="text-xs font-medium text-gray-500">{label}</span>}
    </div>
  );
}

function LighthouseGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 90 ? "#16a34a" : score >= 50 ? "#FF5722" : "#dc2626";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex size-14 items-center justify-center rounded-full border-4"
        style={{ borderColor: color }}
      >
        <span className="text-sm font-bold" style={{ color }}>{score}</span>
      </div>
      <span className="text-[11px] text-gray-500 text-center">{label}</span>
    </div>
  );
}

function SectionCard({ icon: Icon, title, children, className = "" }: {
  icon: any;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3.5">
        <Icon className="size-4 text-[#FF5722]" />
        <h3 className="text-sm font-semibold text-[#1a1a2e]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function KeywordRow({ kw, domain }: { kw: any; domain?: string }) {
  const intentColors: Record<string, string> = {
    informational: "bg-blue-50 text-blue-700",
    commercial: "bg-amber-50 text-amber-700",
    transactional: "bg-emerald-50 text-emerald-700",
    navigational: "bg-purple-50 text-purple-700",
  };

  return (
    <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
      <td className="py-2.5 pr-4 text-sm font-medium text-[#1a1a2e]">{kw.keyword}</td>
      <td className="py-2.5 px-3 text-sm text-gray-600 text-right">{kw.position || "—"}</td>
      <td className="py-2.5 px-3 text-sm text-gray-600 text-right">{(kw.searchVolume || 0).toLocaleString()}</td>
      <td className="py-2.5 px-3 text-sm text-right">
        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${intentColors[kw.searchIntent] || "bg-gray-100 text-gray-600"}`}>
          {kw.searchIntent || "—"}
        </span>
      </td>
      <td className="py-2.5 pl-3 text-sm text-right">
        {kw.keywordDifficulty != null && (
          <span className={`font-medium ${kw.keywordDifficulty > 70 ? "text-red-600" : kw.keywordDifficulty > 40 ? "text-amber-600" : "text-emerald-600"}`}>
            {kw.keywordDifficulty}
          </span>
        )}
      </td>
    </tr>
  );
}

export default function StrategyPage() {
  const { currentSite } = useSite();
  const router = useRouter();
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const fetchAudit = useCallback(async () => {
    if (!currentSite) return;
    try {
      const res = await fetch(`/api/sites/${currentSite.id}/audit`);
      if (res.ok) {
        const data = await res.json();
        setAudit(data.audit);
      }
    } catch (e) {
      console.error("Failed to fetch audit:", e);
    } finally {
      setLoading(false);
    }
  }, [currentSite]);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  // Poll while running
  useEffect(() => {
    if (!audit || audit.status !== "running") return;
    const interval = setInterval(fetchAudit, 3000);
    return () => clearInterval(interval);
  }, [audit?.status, fetchAudit]);

  async function startAudit() {
    if (!currentSite) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/sites/${currentSite.id}/audit`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success("SEO audit started");
        // Start polling
        setAudit({ status: "running", phase: "starting" } as any);
        setTimeout(fetchAudit, 2000);
      } else {
        toast.error("Failed to start audit");
      }
    } catch (e) {
      console.error("Failed to start audit:", e);
      toast.error("Failed to start audit");
    } finally {
      setStarting(false);
    }
  }

  async function createCampaignFromAudit(type: "quick_wins" | "content_gaps" | "full") {
    if (!currentSite || !audit) return;
    setCreatingCampaign(true);

    const titles: Record<string, string> = {
      quick_wins: `Quick Win Campaign — Push ${audit.quickWins?.length || 0} keywords to page 1`,
      content_gaps: `Content Gap Campaign — ${audit.contentGaps?.length || 0} competitor keywords to target`,
      full: `Full SEO Campaign for ${currentSite.domain}`,
    };

    const descriptions: Record<string, string> = {
      quick_wins: `Focus on keywords at positions 4-20 that can be pushed to page 1 with targeted content. Based on SEO audit from ${new Date(audit.createdAt).toLocaleDateString()}.`,
      content_gaps: `Create content for keywords competitors rank for but you don't. Targets ${audit.contentGaps?.length || 0} keyword opportunities identified in the audit.`,
      full: `Comprehensive SEO content campaign based on audit insights: ${audit.quickWins?.length || 0} quick wins, ${audit.contentGaps?.length || 0} content gaps, ${audit.keywordSuggestions?.length || 0} keyword opportunities.`,
    };

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: currentSite.id,
          title: titles[type],
          description: descriptions[type],
          targetMetric: "organic_traffic",
          targetValue: String(audit.domainOverview?.organicTraffic ? Math.round(audit.domainOverview.organicTraffic * 1.5) : "10000"),
        }),
      });
      if (res.ok) {
        const goal = await res.json();
        toast.success("Campaign created — generating plan...");
        router.push(`/goals/${goal.id}`);
      } else {
        toast.error("Failed to create campaign");
      }
    } catch (err) {
      console.error("Failed to create campaign:", err);
      toast.error("Failed to create campaign");
    } finally {
      setCreatingCampaign(false);
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // No audit yet — show CTA
  if (!audit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">SEO Strategy</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive SEO audit & strategy powered by real data
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF5722] to-[#0d5fc4]">
              <Zap className="size-10 text-white" />
            </div>
            <h2 className="mt-6 text-xl font-bold text-[#1a1a2e]">Run Your First SEO Audit</h2>
            <p className="mt-2 text-sm text-gray-500 text-center max-w-md">
              We&apos;ll analyze your domain authority, rankings, competitors, keywords, technical health, and backlinks to create a data-driven SEO strategy.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Globe className="size-3" /> Domain Intel</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Users className="size-3" /> Competitors</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Search className="size-3" /> Keywords</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Shield className="size-3" /> Technical</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Link2 className="size-3" /> Backlinks</span>
            </div>
            <button
              onClick={startAudit}
              disabled={starting}
              className="mt-8 flex items-center gap-2 rounded-lg bg-[#FF5722] px-6 py-3 text-sm font-semibold text-white hover:bg-[#E64A19] transition-colors disabled:opacity-50"
            >
              {starting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              Run SEO Audit
            </button>
            <p className="mt-3 text-xs text-gray-400">Takes 30-60 seconds • Costs ~$3-5 in API calls</p>
          </div>
        </div>
      </div>
    );
  }

  // Audit is running — show progress
  if (audit.status === "running") {
    const currentPhaseIdx = phaseOrder.indexOf(audit.phase);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">SEO Strategy</h1>
          <p className="mt-1 text-sm text-gray-500">Audit in progress for {currentSite?.domain}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8">
          <div className="flex items-center gap-3 mb-8">
            <Loader2 className="size-6 text-[#FF5722] animate-spin" />
            <div>
              <p className="text-base font-semibold text-[#1a1a2e]">{phaseLabels[audit.phase] || "Processing..."}</p>
              <p className="text-xs text-gray-400 mt-0.5">This usually takes 30-60 seconds</p>
            </div>
          </div>

          <div className="space-y-3">
            {phaseOrder.map((phase, idx) => {
              const isActive = phase === audit.phase;
              const isDone = currentPhaseIdx > idx;
              const isPending = currentPhaseIdx < idx;

              return (
                <div
                  key={phase}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
                    isActive ? "bg-[#FFF3E0] border border-[#FF5722]/20" : isDone ? "bg-emerald-50/50" : "bg-gray-50"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="size-5 text-[#FF5722] animate-spin shrink-0" />
                  ) : (
                    <div className="size-5 rounded-full border-2 border-gray-200 shrink-0" />
                  )}
                  <span className={`text-sm ${isActive ? "font-medium text-[#FF5722]" : isDone ? "text-emerald-700" : "text-gray-400"}`}>
                    {phaseLabels[phase]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Audit failed
  if (audit.status === "failed") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">SEO Strategy</h1>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertTriangle className="size-10 text-red-500 mx-auto" />
          <p className="mt-3 text-sm font-medium text-red-700">Audit failed</p>
          <p className="mt-1 text-xs text-red-500">{audit.errorMessage || "Unknown error"}</p>
          <button
            onClick={startAudit}
            className="mt-4 rounded-lg bg-[#FF5722] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64A19]"
          >
            Retry Audit
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // COMPLETED AUDIT — Full Report
  // ═══════════════════════════════════════════
  const domain = currentSite?.domain?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";
  const overview = audit.domainOverview;
  const lighthouse = audit.lighthouseScores;
  const backlinks = audit.backlinkSummary;
  const technical = audit.technicalAudit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">SEO Strategy</h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive audit for {domain}
            {audit.completedAt && (
              <span className="ml-2 inline-flex items-center gap-1 text-gray-400">
                <Clock className="size-3" />
                {new Date(audit.completedAt).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={startAudit}
          disabled={starting}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#1a1a2e] hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${starting ? "animate-spin" : ""}`} />
          Re-run Audit
        </button>
      </div>

      {/* Health Score + Executive Summary */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 flex flex-col items-center justify-center">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">SEO Health Score</p>
          <div className="relative">
            <ScoreRing score={audit.healthScore || 0} size={140} />
          </div>
          <p className="mt-4 text-xs text-gray-500 text-center">
            {(audit.healthScore || 0) >= 80 ? "Excellent — your site is well optimized" :
             (audit.healthScore || 0) >= 60 ? "Good — some opportunities to improve" :
             (audit.healthScore || 0) >= 40 ? "Needs work — several issues found" :
             "Critical — significant SEO issues detected"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">Executive Summary</h3>
          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
            {(audit.executiveSummary || "No summary available.").split("\n").map((p, i) => (
              <p key={i} className="mb-2 last:mb-0">{p}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      {(() => {
        const stats = [
          overview?.organicTraffic ? { label: "Organic Traffic", value: overview.organicTraffic.toLocaleString(), icon: TrendingUp, color: "text-[#FF5722]", bg: "bg-[#FFF3E0]" } : null,
          audit.rankedKeywords?.length > 0 ? { label: "Ranked Keywords", value: audit.rankedKeywords.length.toString(), icon: Search, color: "text-[#FF5722]", bg: "bg-[#fff7ed]" } : null,
          backlinks?.referringDomains ? { label: "Referring Domains", value: backlinks.referringDomains.toLocaleString(), icon: Link2, color: "text-purple-600", bg: "bg-purple-50" } : null,
          audit.quickWins?.length > 0 ? { label: "Quick Wins", value: audit.quickWins.length.toString(), icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" } : null,
          technical?.totalIssues ? { label: "Technical Issues", value: technical.totalIssues.toString(), icon: AlertTriangle, color: technical?.criticalCount > 0 ? "text-red-600" : "text-amber-600", bg: technical?.criticalCount > 0 ? "bg-red-50" : "bg-amber-50" } : null,
        ].filter((s): s is { label: string; value: string; icon: any; color: string; bg: string } => s !== null);
        return stats.length > 0 ? (
          <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-${Math.min(stats.length, 5)}`}>
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`flex size-7 items-center justify-center rounded-lg ${stat.bg}`}>
                    <stat.icon className={`size-3.5 ${stat.color}`} />
                  </div>
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </div>
                <p className="text-xl font-bold text-[#1a1a2e]">{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null;
      })()}

      {/* Customer Search Behavior */}
      {audit.customerSearchBehavior && (
        <SectionCard icon={Users} title="Customer Search Behavior — Who's Searching & What They Want">
          <div className="space-y-6">
            {/* Summary */}
            {audit.customerSearchBehavior.summary && (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{audit.customerSearchBehavior.summary}</p>
            )}

            {/* Intent Breakdown */}
            {audit.customerSearchBehavior.intentBreakdown && (
              <div>
                <h4 className="text-sm font-semibold text-[#1a1a2e] mb-3">Search Intent Distribution</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(["informational", "commercial", "transactional", "navigational"] as const).map((intent) => {
                    const data = audit.customerSearchBehavior.intentBreakdown[intent];
                    if (!data) return null;
                    const colors: Record<string, { bg: string; bar: string; text: string }> = {
                      informational: { bg: "bg-blue-50", bar: "bg-blue-500", text: "text-blue-700" },
                      commercial: { bg: "bg-amber-50", bar: "bg-amber-500", text: "text-amber-700" },
                      transactional: { bg: "bg-emerald-50", bar: "bg-emerald-500", text: "text-emerald-700" },
                      navigational: { bg: "bg-purple-50", bar: "bg-purple-500", text: "text-purple-700" },
                    };
                    const c = colors[intent];
                    return (
                      <div key={intent} className={`${c.bg} rounded-xl p-4`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${c.text}`}>{intent}</span>
                          <span className={`text-lg font-bold ${c.text}`}>{data.percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/60 rounded-full mb-2">
                          <div className={`h-2 ${c.bar} rounded-full`} style={{ width: `${data.percentage}%` }} />
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{data.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {(data.exampleKeywords || []).slice(0, 3).map((kw: string, i: number) => (
                            <span key={i} className="text-[10px] bg-white/80 rounded px-1.5 py-0.5 text-gray-500">{kw}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customer Segments */}
            {audit.customerSearchBehavior.customerSegments?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[#1a1a2e] mb-3">Customer Segments</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  {audit.customerSearchBehavior.customerSegments.map((seg: any, i: number) => {
                    const sizeColors: Record<string, string> = {
                      large: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      medium: "bg-amber-50 text-amber-700 border-amber-200",
                      small: "bg-gray-100 text-gray-600 border-gray-200",
                    };
                    const convColors: Record<string, string> = {
                      high: "text-emerald-600",
                      medium: "text-amber-600",
                      low: "text-gray-500",
                    };
                    return (
                      <div key={i} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="text-sm font-semibold text-[#1a1a2e] flex-1">{seg.name}</h5>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${sizeColors[seg.size] || sizeColors.medium}`}>
                            {seg.size}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{seg.description}</p>
                        <div className="flex items-center gap-3 mb-3 text-[10px]">
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{seg.buyingStage}</span>
                          <span className={`font-medium ${convColors[seg.conversionPotential] || convColors.medium}`}>
                            {seg.conversionPotential} conversion
                          </span>
                        </div>
                        {seg.topSearchTerms?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Top Searches</p>
                            <div className="space-y-1">
                              {seg.topSearchTerms.slice(0, 4).map((term: any, j: number) => (
                                <div key={j} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
                                  <span className="text-[#1a1a2e] font-medium">{term.keyword}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400">{term.volume?.toLocaleString()} vol</span>
                                    <span className="text-[10px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500">{term.intent}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {seg.contentNeeds && (
                          <div className="bg-[#FFF3E0]/50 rounded-lg px-3 py-2">
                            <p className="text-[10px] text-[#FF5722] font-medium mb-0.5">Content Opportunity</p>
                            <p className="text-xs text-gray-600">{seg.contentNeeds}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search Patterns */}
            {audit.customerSearchBehavior.searchPatterns?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[#1a1a2e] mb-3">Search Patterns</h4>
                <div className="space-y-2">
                  {audit.customerSearchBehavior.searchPatterns.map((pat: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-[#1a1a2e]">{pat.pattern}</span>
                          {pat.volume && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{pat.volume.toLocaleString()} vol</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1.5">{pat.insight}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(pat.examples || []).map((ex: string, j: number) => (
                            <span key={j} className="text-[10px] bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600 font-mono">{ex}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seasonal Trends */}
            {audit.customerSearchBehavior.seasonalTrends?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[#1a1a2e] mb-3">Seasonal Trends</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {audit.customerSearchBehavior.seasonalTrends.map((trend: any, i: number) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-[#FF5722]" />
                        <span className="text-sm font-medium text-[#1a1a2e]">{trend.period}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{trend.insight}</p>
                      <div className="flex flex-wrap gap-1">
                        {(trend.trendingSearches || []).map((s: string, j: number) => (
                          <span key={j} className="text-[10px] bg-[#FFF3E0] text-[#FF5722] rounded px-2 py-0.5">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content Gaps by Segment */}
            {audit.customerSearchBehavior.contentGapsBySegment?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-[#1a1a2e] mb-3">Content Gaps by Customer Segment</h4>
                <div className="space-y-2.5">
                  {audit.customerSearchBehavior.contentGapsBySegment.map((gap: any, i: number) => (
                    <div key={i} className="border border-[#FF5722]/15 bg-[#FFF3E0]/20 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-[#1a1a2e]">{gap.segment}</span>
                        {gap.estimatedTraffic && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">~{gap.estimatedTraffic.toLocaleString()} potential visits</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{gap.missingContent}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(gap.suggestedTopics || []).map((t: string, j: number) => (
                          <span key={j} className="text-[10px] bg-white border border-[#FF5722]/20 text-[#FF5722] rounded px-2 py-0.5 font-medium">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Quick Win Actions */}
      {audit.quickWinActions && audit.quickWinActions.length > 0 && (
        <SectionCard icon={Zap} title="Quick Win Actions — Do These First">
          <div className="space-y-2.5">
            {audit.quickWinActions.map((action: any, i: number) => {
              const impactColors: Record<string, string> = {
                high: "bg-red-50 text-red-700 border-red-200",
                medium: "bg-amber-50 text-amber-700 border-amber-200",
                low: "bg-gray-100 text-gray-600 border-gray-200",
              };
              const effortColors: Record<string, string> = {
                low: "text-emerald-600",
                medium: "text-amber-600",
                high: "text-red-600",
              };
              const catIcons: Record<string, any> = {
                content: FileText,
                technical: Shield,
                backlinks: Link2,
                keywords: Search,
              };
              const CatIcon = catIcons[action.category] || Target;

              return (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF3E0] mt-0.5">
                    <CatIcon className="size-4 text-[#FF5722]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a2e]">{action.action}</p>
                    {action.details && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{action.details}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase ${impactColors[action.impact] || impactColors.medium}`}>
                      {action.impact} impact
                    </span>
                    <span className={`text-[10px] font-medium ${effortColors[action.effort] || ""}`}>
                      {action.effort} effort
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Two-column layout for detailed sections */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Quick Win Keywords */}
        {audit.quickWins && audit.quickWins.length > 0 && (
          <SectionCard icon={Target} title={`Quick Wins — ${audit.quickWins.length} Keywords at Positions 4-20`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-xs font-medium text-gray-400 pr-4">Keyword</th>
                    <th className="pb-2 text-xs font-medium text-gray-400 px-3 text-right">Pos</th>
                    <th className="pb-2 text-xs font-medium text-gray-400 px-3 text-right">Volume</th>
                    <th className="pb-2 text-xs font-medium text-gray-400 px-3 text-right">Intent</th>
                    <th className="pb-2 text-xs font-medium text-gray-400 pl-3 text-right">KD</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.quickWins.slice(0, 10).map((kw: any, i: number) => (
                    <KeywordRow key={i} kw={kw} />
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* Content Gaps */}
        {audit.contentGaps && audit.contentGaps.length > 0 && (
          <SectionCard icon={FileText} title={`Content Gaps — ${audit.contentGaps.length} Competitor Keywords You're Missing`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-xs font-medium text-gray-400 pr-4">Keyword</th>
                    <th className="pb-2 text-xs font-medium text-gray-400 px-3 text-right">Comp Pos</th>
                    <th className="pb-2 text-xs font-medium text-gray-400 px-3 text-right">Volume</th>
                    <th className="pb-2 text-xs font-medium text-gray-400 px-3 text-right">Intent</th>
                    <th className="pb-2 text-xs font-medium text-gray-400 pl-3 text-right">KD</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.contentGaps.slice(0, 10).map((gap: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-2.5 pr-4 text-sm font-medium text-[#1a1a2e]">{gap.keyword}</td>
                      <td className="py-2.5 px-3 text-sm text-gray-600 text-right">{gap.competitorPosition}</td>
                      <td className="py-2.5 px-3 text-sm text-gray-600 text-right">{(gap.searchVolume || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-sm text-right">
                        <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600">
                          {gap.searchIntent || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-sm text-right">
                        <span className={`font-medium ${gap.keywordDifficulty > 70 ? "text-red-600" : gap.keywordDifficulty > 40 ? "text-amber-600" : "text-emerald-600"}`}>
                          {gap.keywordDifficulty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Competitor Analysis */}
      {audit.competitors && audit.competitors.filter((c: any) => c.intersections > 0 || c.avgPosition > 0).length > 0 && (
        <SectionCard icon={Users} title={`Competitor Landscape — ${audit.competitors.filter((c: any) => c.intersections > 0 || c.avgPosition > 0).length} Competitors Found`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {audit.competitors.filter((c: any) => c.intersections > 0 || c.avgPosition > 0).slice(0, 6).map((comp: any, i: number) => {
              const traffic = audit.competitorTraffic?.find((t: any) => t.domain === comp.domain);
              return (
                <div key={i} className="rounded-lg border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=32`}
                      alt=""
                      className="size-5 rounded-sm"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <span className="text-sm font-semibold text-[#1a1a2e] truncate">{comp.domain}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Avg Position</span>
                      <p className="font-medium text-[#1a1a2e]">{comp.avgPosition?.toFixed(1) || "—"}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Overlap</span>
                      <p className="font-medium text-[#1a1a2e]">{comp.intersections?.toLocaleString() || "—"} kws</p>
                    </div>
                    {traffic && (traffic.organicTraffic > 0 || traffic.organicKeywords > 0) && (
                      <>
                        <div>
                          <span className="text-gray-400">Est. Traffic</span>
                          <p className="font-medium text-[#1a1a2e]">{traffic.organicTraffic?.toLocaleString() || "—"}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Keywords</span>
                          <p className="font-medium text-[#1a1a2e]">{traffic.organicKeywords?.toLocaleString() || "—"}</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Technical Audit + Lighthouse */}
      <div className="grid gap-4 lg:grid-cols-2">
        {lighthouse && (
          <SectionCard icon={Shield} title="Core Web Vitals & Performance">
            {lighthouse.hasCruxData && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Real-user data from Google CrUX
                {lighthouse.cruxOrigin && <span className="ml-auto font-medium">{lighthouse.cruxOrigin}</span>}
              </div>
            )}
            {!lighthouse.hasCruxData && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                Lab data from Google Lighthouse (no CrUX field data available for this origin)
              </div>
            )}
            <div className="flex items-center justify-around mb-6">
              <LighthouseGauge score={lighthouse.performance} label="Performance" />
              <LighthouseGauge score={lighthouse.seo} label="SEO" />
              <LighthouseGauge score={lighthouse.accessibility} label="Accessibility" />
              <LighthouseGauge score={lighthouse.bestPractices} label="Best Practices" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "LCP", value: `${(lighthouse.lcpMs / 1000).toFixed(1)}s`, good: lighthouse.lcpMs <= 2500 },
                { label: "CLS", value: lighthouse.clsScore?.toFixed(3), good: lighthouse.clsScore <= 0.1 },
                { label: "INP", value: lighthouse.inpMs != null ? `${Math.round(lighthouse.inpMs)}ms` : "N/A", good: lighthouse.inpMs != null ? lighthouse.inpMs <= 200 : true },
                { label: "TBT", value: `${Math.round(lighthouse.tbtMs)}ms`, good: lighthouse.tbtMs <= 300 },
                { label: "TTFB", value: `${Math.round(lighthouse.ttfbMs)}ms`, good: lighthouse.ttfbMs <= 800 },
                { label: "FCP", value: `${(lighthouse.fcpMs / 1000).toFixed(1)}s`, good: lighthouse.fcpMs <= 1800 },
                { label: "Speed Index", value: `${(lighthouse.speedIndex / 1000).toFixed(1)}s`, good: lighthouse.speedIndex <= 3400 },
              ].map((metric) => (
                <div key={metric.label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-xs text-gray-500">{metric.label}</span>
                  <span className={`text-xs font-semibold ${metric.good ? "text-emerald-600" : "text-red-600"}`}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {technical && technical.issues && technical.issues.length > 0 && (
          <SectionCard icon={AlertTriangle} title={`Technical Issues — ${technical.criticalCount} Critical, ${technical.warningCount} Warnings`}>
            <div className="space-y-2">
              {technical.issues.map((issue: any, i: number) => (
                <div
                  key={i}
                  className={`rounded-lg px-4 py-3 ${
                    issue.severity === "critical" ? "bg-red-50 border border-red-100" : "bg-amber-50 border border-amber-100"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {issue.severity === "critical" ? (
                      <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                    ) : (
                      <Minus className="size-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${issue.severity === "critical" ? "text-red-700" : "text-amber-700"}`}>
                        {issue.issue}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{issue.recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Backlink Profile */}
      {backlinks && (backlinks.totalBacklinks > 0 || backlinks.referringDomains > 0) && (
        <SectionCard icon={Link2} title="Backlink Profile">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {[
              { label: "Total Backlinks", value: backlinks.totalBacklinks?.toLocaleString() || "0" },
              { label: "Referring Domains", value: backlinks.referringDomains?.toLocaleString() || "0" },
              { label: "Domain Rank", value: backlinks.rank?.toString() || "0" },
              { label: "Spam Score", value: `${backlinks.spamScore || 0}%`, warn: backlinks.spamScore > 30 },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-gray-50 px-4 py-3 text-center">
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className={`text-lg font-bold mt-1 ${(stat as any).warn ? "text-red-600" : "text-[#1a1a2e]"}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Top Backlinks */}
          {audit.topBacklinks && audit.topBacklinks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Strongest Backlinks</h4>
              <div className="space-y-2">
                {audit.topBacklinks.slice(0, 8).map((bl: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 text-xs">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${bl.sourceDomain}&sz=16`}
                      alt=""
                      className="size-4 rounded-sm shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <span className="text-[#1a1a2e] font-medium truncate flex-1">{bl.sourceDomain}</span>
                    <span className="text-gray-400 truncate max-w-[200px]" title={bl.anchor}>{bl.anchor || "(no anchor)"}</span>
                    <span className={`shrink-0 ${bl.isDofollow ? "text-emerald-600" : "text-gray-400"}`}>
                      {bl.isDofollow ? "dofollow" : "nofollow"}
                    </span>
                    <span className="shrink-0 font-medium text-[#1a1a2e]">Rank {bl.rank}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      )}

      {/* Keyword Research */}
      <div className="grid gap-4 lg:grid-cols-2">
        {audit.keywordSuggestions && audit.keywordSuggestions.filter((k: any) => k.keyword && k.searchVolume > 0).length > 0 && (
          <SectionCard icon={Search} title={`Keyword Opportunities — ${audit.keywordSuggestions.filter((k: any) => k.keyword && k.searchVolume > 0).length} Suggestions`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-2 text-xs font-medium text-gray-400 pr-4">Keyword</th>
                    <th className="pb-2 text-xs font-medium text-gray-400 px-3 text-right">Volume</th>
                    <th className="pb-2 text-xs font-medium text-gray-400 px-3 text-right">Intent</th>
                    <th className="pb-2 text-xs font-medium text-gray-400 pl-3 text-right">KD</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.keywordSuggestions.filter((k: any) => k.keyword && k.searchVolume > 0).slice(0, 12).map((kw: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="py-2 pr-4 text-sm font-medium text-[#1a1a2e]">{kw.keyword}</td>
                      <td className="py-2 px-3 text-sm text-gray-600 text-right">{(kw.searchVolume || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-sm text-right">
                        <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600">
                          {kw.searchIntent || "—"}
                        </span>
                      </td>
                      <td className="py-2 pl-3 text-sm text-right">
                        <span className={`font-medium ${kw.keywordDifficulty > 70 ? "text-red-600" : kw.keywordDifficulty > 40 ? "text-amber-600" : "text-emerald-600"}`}>
                          {kw.keywordDifficulty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* People Also Ask + Related */}
        <div className="space-y-4">
          {audit.peopleAlsoAsk && audit.peopleAlsoAsk.length > 0 && (
            <SectionCard icon={Search} title={`People Also Ask — ${audit.peopleAlsoAsk.length} Questions`}>
              <div className="space-y-1.5">
                {audit.peopleAlsoAsk.slice(0, 8).map((q: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2">
                    <ChevronRight className="size-3.5 text-[#FF5722] shrink-0 mt-0.5" />
                    <span className="text-sm text-[#1a1a2e]">{q}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {audit.autocompleteSuggestions && audit.autocompleteSuggestions.length > 0 && (
            <SectionCard icon={Search} title="Autocomplete Suggestions">
              <div className="flex flex-wrap gap-1.5">
                {audit.autocompleteSuggestions.slice(0, 20).map((s: string, i: number) => (
                  <span key={i} className="rounded-md bg-gray-100 px-2.5 py-1 text-xs text-[#1a1a2e]">{s}</span>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Content Strategy */}
      {audit.contentStrategy && (
        <SectionCard icon={FileText} title="AI Content Strategy">
          <div className="space-y-6">
            {audit.contentStrategy.pillarTopics && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Content Pillars</h4>
                <div className="flex flex-wrap gap-2">
                  {audit.contentStrategy.pillarTopics.map((t: string, i: number) => (
                    <span key={i} className="rounded-lg bg-[#FFF3E0] px-3 py-1.5 text-sm font-medium text-[#FF5722]">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {audit.contentStrategy.quickWinContent && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Win Articles</h4>
                <div className="space-y-2">
                  {audit.contentStrategy.quickWinContent.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <ArrowUpRight className="size-3.5 text-emerald-600 shrink-0" />
                        <span className="text-sm font-medium text-[#1a1a2e]">{typeof t === "string" ? t : t.title}</span>
                      </div>
                      {typeof t === "object" && t.targetKeyword && (
                        <div className="flex items-center gap-2 shrink-0 text-xs">
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700">{t.targetKeyword}</span>
                          {t.volume && <span className="text-gray-500">{t.volume.toLocaleString()} vol</span>}
                          {t.difficulty != null && <span className={`font-medium ${t.difficulty > 40 ? "text-amber-600" : "text-emerald-600"}`}>KD {t.difficulty}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {audit.contentStrategy.gapContent && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Gap Content — Beat Competitors</h4>
                <div className="space-y-2">
                  {audit.contentStrategy.gapContent.map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-[#fff7ed] px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <ArrowUpRight className="size-3.5 text-[#FF5722] shrink-0" />
                        <span className="text-sm font-medium text-[#1a1a2e]">{typeof t === "string" ? t : t.title}</span>
                      </div>
                      {typeof t === "object" && t.targetKeyword && (
                        <div className="flex items-center gap-2 shrink-0 text-xs">
                          <span className="rounded bg-orange-100 px-1.5 py-0.5 font-medium text-orange-700">{t.targetKeyword}</span>
                          {t.volume && <span className="text-gray-500">{t.volume.toLocaleString()} vol</span>}
                          {t.difficulty != null && <span className={`font-medium ${t.difficulty > 40 ? "text-amber-600" : "text-emerald-600"}`}>KD {t.difficulty}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {audit.contentStrategy.monthlyPlan && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recommended Monthly Plan</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{audit.contentStrategy.monthlyPlan}</p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Topical Authority Map */}
      {audit.topicalMap?.clusters && audit.topicalMap.clusters.length > 0 && (
        <SectionCard icon={Map} title={`Topical Authority Map — ${audit.topicalMap.clusters.length} Clusters`}>
          <div className="space-y-6">
            {audit.topicalMap.totalEstimatedTraffic && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5">
                <TrendingUp className="size-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Estimated total traffic potential: {Number(audit.topicalMap.totalEstimatedTraffic).toLocaleString()} visits/month</span>
              </div>
            )}
            {audit.topicalMap.clusters.map((cluster: any, ci: number) => (
              <div key={ci} className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#1a1a2e]">{cluster.pillarTopic}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Pillar: {cluster.pillarPageTitle} — <span className="font-medium text-[#FF5722]">{cluster.pillarKeyword}</span> ({(cluster.searchVolume || 0).toLocaleString()} vol)</p>
                  </div>
                  {cluster.estimatedClusterTraffic && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{Number(cluster.estimatedClusterTraffic).toLocaleString()} traffic</span>
                  )}
                </div>
                <div className="divide-y divide-gray-50">
                  {(cluster.supportingArticles || []).map((article: any, ai: number) => (
                    <div key={ai} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/50">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1a1a2e] truncate">{article.title}</p>
                        {article.angle && <p className="text-xs text-gray-400 mt-0.5 truncate">{article.angle}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3 text-xs">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">{article.targetKeyword}</span>
                        <span className="text-gray-500">{(article.searchVolume || 0).toLocaleString()}</span>
                        <span className={`font-medium ${(article.difficulty || 0) > 40 ? "text-amber-600" : "text-emerald-600"}`}>KD {article.difficulty || 0}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${article.intent === "informational" ? "bg-blue-50 text-blue-700" : article.intent === "commercial" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{article.intent || "—"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* 90-Day Blog Calendar */}
      {audit.blogCalendar?.weeks && audit.blogCalendar.weeks.length > 0 && (
        <SectionCard icon={Calendar} title="90-Day Blog Calendar">
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-4 rounded-lg bg-[#FFF3E0] px-4 py-3 text-sm">
              <span className="font-medium text-[#FF5722]">{audit.blogCalendar.totalArticles || audit.blogCalendar.weeks.reduce((s: number, w: any) => s + (w.articles?.length || 0), 0)} articles</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">{audit.blogCalendar.publishingCadence}</span>
              {audit.blogCalendar.estimatedTrafficGain && (
                <>
                  <span className="text-gray-400">|</span>
                  <span className="text-emerald-600 font-medium">{audit.blogCalendar.estimatedTrafficGain}</span>
                </>
              )}
            </div>

            {audit.blogCalendar.weeks.map((week: any, wi: number) => (
              <div key={wi} className="rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5">
                  <span className="text-xs font-bold text-[#FF5722] bg-[#FFF3E0] px-2 py-0.5 rounded">W{week.weekNumber}</span>
                  <span className="text-sm font-medium text-[#1a1a2e]">{week.theme}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {(week.articles || []).map((article: any, ai: number) => (
                    <div key={ai} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${article.priority === "must-write" ? "bg-red-50 text-red-700" : article.priority === "should-write" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                              {article.priority || "write"}
                            </span>
                            <p className="text-sm font-medium text-[#1a1a2e] truncate">{article.title}</p>
                          </div>
                          {article.brief && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{article.brief}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-xs">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-700">{article.targetKeyword}</span>
                          <span className="text-gray-500">{(article.searchVolume || 0).toLocaleString()}</span>
                          <span className={`font-medium ${(article.difficulty || 0) > 40 ? "text-amber-600" : "text-emerald-600"}`}>KD {article.difficulty || 0}</span>
                          {article.contentType && (
                            <span className="rounded bg-purple-50 px-1.5 py-0.5 font-medium text-purple-700">{article.contentType}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Site Architecture Recommendations */}
      {audit.siteArchitecture?.recommendedPages && audit.siteArchitecture.recommendedPages.length > 0 && (
        <SectionCard icon={Layout} title="New Pages & Sections to Build">
          <div className="space-y-4">
            {audit.siteArchitecture.currentGaps && audit.siteArchitecture.currentGaps.length > 0 && (
              <div className="rounded-lg bg-amber-50 px-4 py-3">
                <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Current Gaps</h4>
                <ul className="space-y-1">
                  {audit.siteArchitecture.currentGaps.map((gap: string, i: number) => (
                    <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                      <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {audit.siteArchitecture.recommendedPages.map((page: any, i: number) => (
                <div key={i} className="rounded-lg border border-gray-100 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${page.priority === "high" ? "bg-red-50 text-red-700" : page.priority === "medium" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{page.priority}</span>
                    <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">{page.pageType}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#1a1a2e]">{page.title}</h4>
                  {page.slug && <p className="text-xs text-[#FF5722] font-mono mt-0.5">{page.slug}</p>}
                  <p className="text-xs text-gray-500 mt-1.5">{page.rationale}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    {page.targetKeywords && page.targetKeywords.map((kw: string, ki: number) => (
                      <span key={ki} className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{kw}</span>
                    ))}
                    {page.estimatedTraffic && <span className="text-emerald-600 font-medium ml-auto">{page.estimatedTraffic.toLocaleString()} est. traffic</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Competitive Playbook */}
      {audit.competitivePlaybook?.competitors && audit.competitivePlaybook.competitors.length > 0 && (
        <SectionCard icon={Sword} title="Competitive Playbook">
          <div className="space-y-4">
            {audit.competitivePlaybook.competitors.map((comp: any, ci: number) => (
              <div key={ci} className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <img src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=16`} alt="" className="size-4 rounded" />
                    <h4 className="text-sm font-semibold text-[#1a1a2e]">{comp.domain}</h4>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-emerald-50 px-3 py-2">
                      <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-0.5">Their Strength</p>
                      <p className="text-xs text-emerald-800">{comp.theirStrength}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 px-3 py-2">
                      <p className="text-[10px] font-semibold text-red-700 uppercase tracking-wider mb-0.5">Their Weakness</p>
                      <p className="text-xs text-red-800">{comp.theirWeakness}</p>
                    </div>
                  </div>
                  {comp.stealableKeywords && comp.stealableKeywords.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Stealable Keywords</p>
                      <div className="space-y-1">
                        {comp.stealableKeywords.slice(0, 5).map((kw: any, ki: number) => (
                          <div key={ki} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-xs">
                            <span className="font-medium text-[#1a1a2e]">{kw.keyword}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Their #{kw.theirPosition}</span>
                              <span className="text-gray-500">{(kw.volume || 0).toLocaleString()} vol</span>
                              <span className={`font-medium ${(kw.difficulty || 0) > 40 ? "text-amber-600" : "text-emerald-600"}`}>KD {kw.difficulty}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {comp.contentToOutperform && comp.contentToOutperform.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Content to Outperform</p>
                      <div className="space-y-1.5">
                        {comp.contentToOutperform.slice(0, 3).map((content: any, coi: number) => (
                          <div key={coi} className="rounded bg-[#fff7ed] px-3 py-2">
                            <p className="text-xs font-medium text-[#1a1a2e]">{content.theirTitle}</p>
                            <p className="text-xs text-[#FF5722] mt-0.5">{content.ourAngle}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Technical Roadmap */}
      {audit.technicalRoadmap && (audit.technicalRoadmap.immediate?.length > 0 || audit.technicalRoadmap.shortTerm?.length > 0 || audit.technicalRoadmap.longTerm?.length > 0) && (
        <SectionCard icon={Wrench} title="Technical Roadmap">
          <div className="space-y-4">
            {audit.technicalRoadmap.estimatedTrafficUnlock && (
              <div className="rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                {audit.technicalRoadmap.estimatedTrafficUnlock}
              </div>
            )}
            {[
              { key: "immediate", label: "Do Now", color: "border-red-200 bg-red-50", textColor: "text-red-700", items: audit.technicalRoadmap.immediate },
              { key: "shortTerm", label: "This Month", color: "border-amber-200 bg-amber-50", textColor: "text-amber-700", items: audit.technicalRoadmap.shortTerm },
              { key: "longTerm", label: "This Quarter", color: "border-blue-200 bg-blue-50", textColor: "text-blue-700", items: audit.technicalRoadmap.longTerm },
            ].filter(tier => tier.items && tier.items.length > 0).map((tier) => (
              <div key={tier.key}>
                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${tier.textColor}`}>{tier.label}</h4>
                <div className="space-y-2">
                  {tier.items.map((item: any, ii: number) => (
                    <div key={ii} className={`rounded-lg border px-4 py-3 ${tier.color}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-[#1a1a2e]">{item.issue}</p>
                        {item.timeEstimate && <span className="text-xs text-gray-500">{item.timeEstimate}</span>}
                      </div>
                      <p className="text-xs text-gray-600">{item.fix}</p>
                      {item.impact && <p className="text-xs text-emerald-600 mt-1 font-medium">{item.impact}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Link Building Plan */}
      {audit.linkBuildingPlan && (
        <SectionCard icon={Link2} title="Link Building Strategy">
          <div className="space-y-4">
            {audit.linkBuildingPlan.currentProfile && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2.5">{audit.linkBuildingPlan.currentProfile}</p>
            )}
            {audit.linkBuildingPlan.monthlyLinkTarget && (
              <div className="flex items-center gap-2 text-sm">
                <Target className="size-4 text-[#FF5722]" />
                <span className="text-[#1a1a2e] font-medium">Monthly target: {audit.linkBuildingPlan.monthlyLinkTarget} backlinks</span>
              </div>
            )}
            {audit.linkBuildingPlan.targetDomains && audit.linkBuildingPlan.targetDomains.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Target Domains</h4>
                <div className="space-y-1.5">
                  {audit.linkBuildingPlan.targetDomains.map((td: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ExternalLink className="size-3.5 text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-[#1a1a2e]">{td.domain}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs shrink-0">
                        <span className="rounded bg-purple-50 px-1.5 py-0.5 font-medium text-purple-700">{td.approach}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {audit.linkBuildingPlan.linkableAssets && audit.linkBuildingPlan.linkableAssets.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Linkable Content Ideas</h4>
                <div className="space-y-1.5">
                  {audit.linkBuildingPlan.linkableAssets.map((asset: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                      <BookOpen className="size-3.5 text-blue-600 shrink-0" />
                      <span className="text-sm text-[#1a1a2e]">{asset}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Launch Campaign CTA */}
      <div className="rounded-xl border-2 border-dashed border-[#FF5722]/40 bg-gradient-to-br from-[#fff7ed] to-white p-8">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-[#1a1a2e]">Ready to Act on These Insights?</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-lg mx-auto">
            Turn your audit data into an automated content campaign. Our AI will generate a content plan, write articles, and get them ready for review.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 max-w-3xl mx-auto">
          {audit.quickWins && audit.quickWins.length > 0 && (
            <button
              onClick={() => createCampaignFromAudit("quick_wins")}
              disabled={creatingCampaign}
              className="rounded-xl border border-emerald-200 bg-white p-5 text-left hover:border-emerald-300 hover:shadow-md transition-all disabled:opacity-50"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 mb-3">
                <Target className="size-5 text-emerald-600" />
              </div>
              <h4 className="text-sm font-semibold text-[#1a1a2e]">Quick Wins</h4>
              <p className="text-xs text-gray-500 mt-1">
                Push {audit.quickWins.length} keywords from positions 4-20 to page 1
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                Launch campaign <ArrowUpRight className="size-3" />
              </span>
            </button>
          )}
          {audit.contentGaps && audit.contentGaps.length > 0 && (
            <button
              onClick={() => createCampaignFromAudit("content_gaps")}
              disabled={creatingCampaign}
              className="rounded-xl border border-[#FF5722]/20 bg-white p-5 text-left hover:border-[#FF5722]/40 hover:shadow-md transition-all disabled:opacity-50"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#fff7ed] mb-3">
                <FileText className="size-5 text-[#FF5722]" />
              </div>
              <h4 className="text-sm font-semibold text-[#1a1a2e]">Content Gaps</h4>
              <p className="text-xs text-gray-500 mt-1">
                Target {audit.contentGaps.length} keywords your competitors rank for
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#FF5722]">
                Launch campaign <ArrowUpRight className="size-3" />
              </span>
            </button>
          )}
          <button
            onClick={() => createCampaignFromAudit("full")}
            disabled={creatingCampaign}
            className="rounded-xl border border-[#FF5722]/20 bg-white p-5 text-left hover:border-[#FF5722]/40 hover:shadow-md transition-all disabled:opacity-50"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#FFF3E0] mb-3">
              <Zap className="size-5 text-[#FF5722]" />
            </div>
            <h4 className="text-sm font-semibold text-[#1a1a2e]">Full Campaign</h4>
            <p className="text-xs text-gray-500 mt-1">
              Comprehensive plan covering all audit insights
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#FF5722]">
              Launch campaign <ArrowUpRight className="size-3" />
            </span>
          </button>
        </div>
        {creatingCampaign && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Loader2 className="size-4 text-[#FF5722] animate-spin" />
            <span className="text-sm text-gray-500">Creating campaign...</span>
          </div>
        )}
      </div>
    </div>
  );
}
