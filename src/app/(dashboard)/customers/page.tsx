"use client";

import { useEffect, useState } from "react";
import { useSite } from "@/lib/site-context";
import { toast } from "sonner";
import {
  Users,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  TrendingUp,
  BarChart3,
  Target,
} from "lucide-react";

export default function CustomersPage() {
  const { currentSite } = useSite();
  const [customerIntel, setCustomerIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const domain = currentSite?.domain?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";

  useEffect(() => {
    if (!currentSite) return;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/sites/${currentSite!.id}/customer-intelligence`);
        if (res.ok) {
          const data = await res.json();
          if (data.data) setCustomerIntel(data);
        }
      } catch (e) {
        console.error("Failed to fetch customer intel:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentSite]);

  async function analyzeCustomers() {
    if (!currentSite) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/sites/${currentSite.id}/customer-intelligence`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        setCustomerIntel({ data: result.data, analyzedAt: result.analyzedAt, hasRealKeywordData: result.hasRealKeywordData });
        toast.success("Customer intelligence analysis complete");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to analyze customers");
      }
    } catch (e) {
      console.error("Failed to analyze customers:", e);
      toast.error("Failed to analyze customers");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const data = customerIntel?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Customer Intelligence</h1>
          <p className="mt-1 text-sm text-gray-500">
            Understand who searches for {domain} and what they want
          </p>
        </div>
        <div className="flex items-center gap-3">
          {customerIntel?.hasRealKeywordData && (
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-200">DataForSEO enriched</span>
          )}
          {data && !customerIntel?.hasRealKeywordData && (
            <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full border border-blue-200">AI-powered</span>
          )}
          <button
            onClick={analyzeCustomers}
            disabled={analyzing}
            className="flex items-center gap-2 rounded-lg bg-[#FF5722] px-4 py-2 text-sm font-semibold text-white hover:bg-[#E64A19] transition-colors disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {analyzing ? "Analyzing..." : data ? "Re-analyze" : "Analyze Customers"}
          </button>
        </div>
      </div>

      {/* Analyzing state */}
      {analyzing && !data && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <Loader2 className="size-10 text-[#FF5722] animate-spin mb-4" />
            <p className="text-base font-medium text-[#1a1a2e]">Analyzing customer search behavior...</p>
            <p className="text-sm text-gray-400 mt-1">AI is identifying who searches for {domain} and what they want</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !analyzing && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF5722]/10 to-[#FF5722]/5 mb-4">
              <Users className="size-10 text-[#FF5722]" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">Discover Your Customers</h2>
            <p className="text-sm text-gray-500 mt-2 text-center max-w-md">
              AI will analyze who visits {domain}, what they search for on Google, their buying stage, and what content they need.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Users className="size-3" /> Customer Segments</span>
              <span>-</span>
              <span className="flex items-center gap-1"><Search className="size-3" /> Search Patterns</span>
              <span>-</span>
              <span className="flex items-center gap-1"><BarChart3 className="size-3" /> Intent Analysis</span>
              <span>-</span>
              <span className="flex items-center gap-1"><Calendar className="size-3" /> Seasonal Trends</span>
            </div>
            <button
              onClick={analyzeCustomers}
              className="mt-8 flex items-center gap-2 rounded-lg bg-[#FF5722] px-6 py-3 text-sm font-semibold text-white hover:bg-[#E64A19] transition-colors"
            >
              <Users className="size-4" />
              Analyze Customer Search Behavior
            </button>
            <p className="mt-3 text-xs text-gray-400">Takes 15-30 seconds</p>
          </div>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-6">
          {/* Summary */}
          {data.summary && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3 flex items-center gap-2">
                <TrendingUp className="size-4 text-[#FF5722]" />
                Overview
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{data.summary}</p>
            </div>
          )}

          {/* Intent Breakdown */}
          {data.intentBreakdown && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4 flex items-center gap-2">
                <BarChart3 className="size-4 text-[#FF5722]" />
                Search Intent Distribution
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(["informational", "commercial", "transactional", "navigational"] as const).map((intent) => {
                  const d = data.intentBreakdown[intent];
                  if (!d) return null;
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
                        <span className={`text-lg font-bold ${c.text}`}>{d.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/60 rounded-full mb-2">
                        <div className={`h-2 ${c.bar} rounded-full`} style={{ width: `${d.percentage}%` }} />
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{d.description}</p>
                      {d.totalVolume && (
                        <p className="text-[10px] text-gray-400 mb-1.5">{d.totalVolume.toLocaleString()} monthly searches</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {(d.exampleKeywords || []).slice(0, 3).map((kw: string, i: number) => (
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
          {data.customerSegments?.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4 flex items-center gap-2">
                <Users className="size-4 text-[#FF5722]" />
                Customer Segments — {data.customerSegments.length} identified
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {data.customerSegments.map((seg: any, i: number) => {
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
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ml-2 ${sizeColors[seg.size] || sizeColors.medium}`}>
                          {seg.size}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{seg.description}</p>
                      {seg.demographics && (
                        <p className="text-[10px] text-gray-400 mb-2 italic">{seg.demographics}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap mb-3 text-[10px]">
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{seg.buyingStage}</span>
                        <span className={`font-medium ${convColors[seg.conversionPotential] || convColors.medium}`}>
                          {seg.conversionPotential} conversion
                        </span>
                      </div>
                      {seg.motivations?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {seg.motivations.map((m: string, j: number) => (
                            <span key={j} className="text-[10px] bg-purple-50 text-purple-600 rounded px-2 py-0.5">{m}</span>
                          ))}
                        </div>
                      )}
                      {seg.topSearchTerms?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">What They Search</p>
                          <div className="space-y-1">
                            {seg.topSearchTerms.slice(0, 5).map((term: any, j: number) => (
                              <div key={j} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2.5 py-1.5">
                                <span className="text-[#1a1a2e] font-medium font-mono text-[11px]">{term.keyword}</span>
                                <div className="flex items-center gap-2">
                                  {term.volume && <span className="text-gray-400">{term.volume.toLocaleString()} vol</span>}
                                  <span className="text-[10px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500">{term.intent}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {seg.contentNeeds && (
                        <div className="bg-[#FFF3E0]/50 rounded-lg px-3 py-2 mb-2">
                          <p className="text-[10px] text-[#FF5722] font-medium mb-0.5">Content Opportunity</p>
                          <p className="text-xs text-gray-600">{seg.contentNeeds}</p>
                        </div>
                      )}
                      {seg.recommendedContentTypes?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {seg.recommendedContentTypes.map((ct: string, j: number) => (
                            <span key={j} className="text-[10px] bg-gray-100 text-gray-500 rounded px-2 py-0.5">{ct}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search Patterns */}
          {data.searchPatterns?.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4 flex items-center gap-2">
                <Search className="size-4 text-[#FF5722]" />
                Search Patterns
              </h3>
              <div className="space-y-2">
                {data.searchPatterns.map((pat: any, i: number) => (
                  <div key={i} className="flex items-start gap-4 bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[#1a1a2e]">{pat.pattern}</span>
                        {pat.totalVolume && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{pat.totalVolume.toLocaleString()} vol</span>
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
          {data.seasonalTrends?.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4 flex items-center gap-2">
                <Calendar className="size-4 text-[#FF5722]" />
                Seasonal Trends
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.seasonalTrends.map((trend: any, i: number) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-[#FF5722]" />
                      <span className="text-sm font-medium text-[#1a1a2e]">{trend.period}</span>
                      {trend.peakMonth && <span className="text-[10px] text-gray-400">peaks {trend.peakMonth}</span>}
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
          {data.contentGapsBySegment?.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4 flex items-center gap-2">
                <Target className="size-4 text-[#FF5722]" />
                Content Gaps by Customer Segment
              </h3>
              <div className="space-y-2.5">
                {data.contentGapsBySegment.map((gap: any, i: number) => (
                  <div key={i} className="border border-[#FF5722]/15 bg-[#FFF3E0]/20 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#1a1a2e]">{gap.segment}</span>
                        {gap.priority && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            gap.priority === "high" ? "bg-red-50 text-red-600" : gap.priority === "medium" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"
                          }`}>{gap.priority}</span>
                        )}
                      </div>
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

          {/* Competitor Insights */}
          {data.competitorInsights?.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4 flex items-center gap-2">
                <Target className="size-4 text-[#FF5722]" />
                Competitor Targeting
              </h3>
              <div className="space-y-2">
                {data.competitorInsights.map((comp: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${comp.competitor}&sz=16`}
                        alt=""
                        className="size-4 rounded-sm"
                        onError={(e: any) => { e.target.style.display = "none"; }}
                      />
                      <span className="text-sm font-medium text-[#1a1a2e]">{comp.competitor}</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 text-xs mt-2">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">They Target</p>
                        <p className="text-gray-600">{comp.theyTargetSegment}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Their Advantage</p>
                        <p className="text-gray-600">{comp.theirAdvantage}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-500 uppercase tracking-wide mb-0.5">Our Opportunity</p>
                        <p className="text-gray-600 font-medium">{comp.ourOpportunity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Takeaways */}
          {data.keyTakeaways?.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#FF5722]/5 to-[#FF5722]/10 p-6">
                <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">Key Takeaways</h3>
                <ul className="space-y-2">
                  {data.keyTakeaways.map((t: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="size-4 text-[#FF5722] mt-0.5 shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Last analyzed */}
          {customerIntel.analyzedAt && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Clock className="size-3" />
              Last analyzed: {new Date(customerIntel.analyzedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
