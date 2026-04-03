"use client";

import { useState, useEffect, useCallback } from "react";
import { useSite } from "@/lib/site-context";
import {
  Search, AlertTriangle, CheckCircle2, XCircle, Info,
  ArrowUpDown, Download, RefreshCw, ChevronDown, ChevronRight,
  ExternalLink, FileText, ShoppingBag, FolderOpen, Globe, Gauge,
  Lightbulb, Tag, Clock,
} from "lucide-react";

interface PageIssue {
  type: "critical" | "warning" | "info";
  category: string;
  message: string;
  fix?: string;
}

interface PageResult {
  url: string;
  path: string;
  pageType: string;
  title: string;
  metaDescription: string;
  h1: string;
  wordCount: number;
  score: number;
  issues: PageIssue[];
  suggestions: {
    suggestedTitle?: string;
    suggestedMetaDescription?: string;
    suggestedH1?: string;
    topicsToAdd?: string[];
    contentSuggestions?: string[];
    targetKeyword?: string;
  };
  h2s: string[];
  schemaTypes: string[];
  imagesWithoutAlt: number;
  totalImages: number;
  internalLinks: number;
  externalLinks: number;
  loadTime: number;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
}

interface AuditSummary {
  criticalIssues: number;
  warnings: number;
  passed: number;
  totalPages: number;
  avgScore: number;
  topIssues: { issue: string; count: number }[];
  pageTypeBreakdown: Record<string, number>;
}

interface AuditData {
  id: string;
  status: string;
  totalPages: number;
  scannedPages: number;
  score: number | null;
  summary: AuditSummary | null;
  pages: PageResult[] | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

const pageTypeIcons: Record<string, any> = {
  product: ShoppingBag,
  category: FolderOpen,
  blog: FileText,
  content: FileText,
  utility: Globe,
  homepage: Globe,
  other: Globe,
};

const pageTypeColors: Record<string, string> = {
  product: "bg-blue-500/10 text-blue-400",
  category: "bg-purple-500/10 text-purple-400",
  blog: "bg-green-500/10 text-green-400",
  content: "bg-teal-500/10 text-teal-400",
  utility: "bg-gray-500/10 text-gray-400",
  homepage: "bg-orange-500/10 text-orange-400",
  other: "bg-gray-500/10 text-gray-400",
};

function ScoreCircle({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const color = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : score >= 40 ? "text-orange-400" : "text-red-400";
  const bgColor = score >= 80 ? "bg-emerald-500/10" : score >= 60 ? "bg-yellow-500/10" : score >= 40 ? "bg-orange-500/10" : "bg-red-500/10";
  const sz = size === "lg" ? "w-20 h-20 text-2xl" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} ${bgColor} rounded-full flex items-center justify-center font-bold ${color}`}>
      {score}
    </div>
  );
}

export default function PageAuditPage() {
  const { currentSite } = useSite();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [issueFilter, setIssueFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "issues" | "wordCount" | "path">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    if (!currentSite) return;
    try {
      const res = await fetch(`/api/sites/${currentSite.id}/page-audit`);
      const data = await res.json();
      setAudit(data.audit);
    } catch (err) {
      console.error("Failed to fetch audit:", err);
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
  }, [audit, fetchAudit]);

  const startAudit = async () => {
    if (!currentSite) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/sites/${currentSite.id}/page-audit`, { method: "POST" });
      const data = await res.json();
      setAudit({ id: data.auditId, status: "running", totalPages: 0, scannedPages: 0, score: null, summary: null, pages: null, errorMessage: null, createdAt: new Date().toISOString(), completedAt: null });
    } catch (err) {
      console.error("Failed to start audit:", err);
    } finally {
      setStarting(false);
    }
  };

  const downloadCSV = () => {
    if (!audit?.pages) return;
    const headers = ["URL", "Path", "Page Type", "Score", "Title", "Meta Description", "H1", "Word Count", "Critical Issues", "Warnings", "Suggested Title", "Suggested Meta Description", "Suggested H1", "Target Keyword", "Topics to Add", "Content Suggestions", "Schema Types", "Images Without Alt", "Internal Links", "External Links", "Load Time (ms)"];
    const rows = filteredPages.map(p => [
      p.url, p.path, p.pageType, p.score, `"${(p.title || "").replace(/"/g, '""')}"`,
      `"${(p.metaDescription || "").replace(/"/g, '""')}"`, `"${(p.h1 || "").replace(/"/g, '""')}"`,
      p.wordCount, p.issues.filter(i => i.type === "critical").length,
      p.issues.filter(i => i.type === "warning").length,
      `"${(p.suggestions?.suggestedTitle || "").replace(/"/g, '""')}"`,
      `"${(p.suggestions?.suggestedMetaDescription || "").replace(/"/g, '""')}"`,
      `"${(p.suggestions?.suggestedH1 || "").replace(/"/g, '""')}"`,
      `"${(p.suggestions?.targetKeyword || "").replace(/"/g, '""')}"`,
      `"${(p.suggestions?.topicsToAdd || []).join("; ").replace(/"/g, '""')}"`,
      `"${(p.suggestions?.contentSuggestions || []).join("; ").replace(/"/g, '""')}"`,
      `"${(p.schemaTypes || []).join(", ")}"`,
      p.imagesWithoutAlt, p.internalLinks, p.externalLinks, p.loadTime,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `page-audit-${currentSite?.domain || "site"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter and sort pages
  const pages = audit?.pages || [];
  const filteredPages = pages
    .filter(p => {
      if (typeFilter !== "all" && p.pageType !== typeFilter) return false;
      if (issueFilter === "critical" && !p.issues.some(i => i.type === "critical")) return false;
      if (issueFilter === "warning" && !p.issues.some(i => i.type === "warning")) return false;
      if (issueFilter === "passed" && p.issues.length > 0) return false;
      if (issueFilter === "has-suggestions" && (!p.suggestions?.contentSuggestions?.length && !p.suggestions?.topicsToAdd?.length)) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.path.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.h1.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "score") cmp = a.score - b.score;
      else if (sortBy === "issues") cmp = b.issues.length - a.issues.length;
      else if (sortBy === "wordCount") cmp = a.wordCount - b.wordCount;
      else cmp = a.path.localeCompare(b.path);
      return sortDir === "asc" ? cmp : -cmp;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Running state
  if (audit?.status === "running") {
    const progress = audit.totalPages > 0 ? Math.round((audit.scannedPages / audit.totalPages) * 100) : 0;
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Page Audit</h1>
        <div className="bg-dark-card border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto" />
          <h2 className="text-xl font-semibold text-white">Auditing Pages...</h2>
          <p className="text-white/50">
            Scanning {audit.scannedPages} / {audit.totalPages || "?"} pages from sitemap
          </p>
          {audit.totalPages > 0 && (
            <div className="max-w-md mx-auto">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-white/30 mt-1">{progress}% complete</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No audit yet or failed
  if (!audit || audit.status === "failed") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Page Audit</h1>
        <div className="bg-dark-card border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <Gauge className="w-16 h-16 text-white/20 mx-auto" />
          <h2 className="text-xl font-semibold text-white">
            {audit?.status === "failed" ? "Audit Failed" : "No Page Audit Yet"}
          </h2>
          {audit?.errorMessage && (
            <p className="text-red-400 text-sm">{audit.errorMessage}</p>
          )}
          <p className="text-white/50 max-w-md mx-auto">
            Audit every page on your site from the sitemap. Check H1 tags, meta descriptions, content quality, and get AI-powered improvement suggestions.
          </p>
          <button
            onClick={startAudit}
            disabled={starting}
            className="px-6 py-3 bg-primary hover:bg-primary/80 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {starting ? "Starting..." : "Run Page Audit"}
          </button>
        </div>
      </div>
    );
  }

  // Completed — show results
  const summary = audit.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Page Audit</h1>
          <p className="text-sm text-white/40 mt-1">
            {summary?.totalPages || 0} pages audited {audit.completedAt ? `on ${new Date(audit.completedAt).toLocaleDateString()}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={downloadCSV} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl text-sm transition-colors">
            <Download className="w-4 h-4" /> Download CSV
          </button>
          <button onClick={startAudit} disabled={starting} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white rounded-xl text-sm transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${starting ? "animate-spin" : ""}`} /> Re-audit
          </button>
        </div>
      </div>

      {/* Score & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Overall Score */}
        <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center">
          <ScoreCircle score={summary?.avgScore || 0} size="lg" />
          <p className="text-sm text-white/50 mt-2">Overall Score</p>
        </div>

        {/* Issue counts */}
        <div className="bg-dark-card border border-white/10 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-red-400">{summary?.criticalIssues || 0}</p>
              <p className="text-xs text-white/40">Critical Issues</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-yellow-400">{summary?.warnings || 0}</p>
              <p className="text-xs text-white/40">Warnings</p>
            </div>
          </div>
        </div>

        {/* Passed */}
        <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-emerald-400">{summary?.passed || 0}</p>
          <p className="text-xs text-white/40">Pages Passed</p>
        </div>

        {/* Page Types */}
        <div className="bg-dark-card border border-white/10 rounded-2xl p-5 md:col-span-2">
          <p className="text-xs text-white/40 mb-2 font-medium">Page Types</p>
          <div className="flex flex-wrap gap-2">
            {summary?.pageTypeBreakdown && Object.entries(summary.pageTypeBreakdown)
              .filter(([, count]) => count > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <span key={type} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${pageTypeColors[type] || "bg-gray-500/10 text-gray-400"}`}>
                  {type} ({count})
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Top Issues */}
      {summary?.topIssues && summary.topIssues.length > 0 && (
        <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Most Common Issues</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {summary.topIssues.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-white/30 text-xs w-8 text-right">{item.count}x</span>
                <span className="text-white/70">{item.issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages..."
            className="w-full pl-10 pr-4 py-2.5 bg-dark-card border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 bg-dark-card border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="product">Product</option>
          <option value="category">Category</option>
          <option value="blog">Blog</option>
          <option value="content">Content</option>
          <option value="utility">Utility</option>
          <option value="homepage">Homepage</option>
          <option value="other">Other</option>
        </select>

        {/* Issue filter */}
        <select
          value={issueFilter}
          onChange={(e) => setIssueFilter(e.target.value)}
          className="px-3 py-2.5 bg-dark-card border border-white/10 rounded-xl text-sm text-white/70 focus:outline-none"
        >
          <option value="all">All Pages</option>
          <option value="critical">Critical Issues</option>
          <option value="warning">Warnings</option>
          <option value="passed">Passed</option>
          <option value="has-suggestions">Has AI Suggestions</option>
        </select>

        {/* Sort */}
        <button
          onClick={() => {
            if (sortBy === "score") {
              setSortDir(d => d === "asc" ? "desc" : "asc");
            } else {
              setSortBy("score");
              setSortDir("asc");
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-dark-card border border-white/10 rounded-xl text-sm text-white/70 hover:text-white transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          Score {sortBy === "score" ? (sortDir === "asc" ? "↑" : "↓") : ""}
        </button>

        <span className="text-xs text-white/30">{filteredPages.length} pages</span>
      </div>

      {/* Page List */}
      <div className="space-y-2">
        {filteredPages.map((page) => {
          const isExpanded = expandedPage === page.path;
          const TypeIcon = pageTypeIcons[page.pageType] || Globe;
          const criticals = page.issues.filter(i => i.type === "critical").length;
          const warnings = page.issues.filter(i => i.type === "warning").length;
          const hasSuggestions = (page.suggestions?.contentSuggestions?.length || 0) > 0 || (page.suggestions?.topicsToAdd?.length || 0) > 0;

          return (
            <div key={page.path} className="bg-dark-card border border-white/10 rounded-xl overflow-hidden">
              {/* Row */}
              <button
                onClick={() => setExpandedPage(isExpanded ? null : page.path)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-white/30 shrink-0" /> : <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />}
                <ScoreCircle score={page.score} size="sm" />
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${pageTypeColors[page.pageType] || "bg-gray-500/10 text-gray-400"}`}>
                  {page.pageType}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 truncate">{page.path}</p>
                  <p className="text-xs text-white/40 truncate">{page.title || "No title"}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {criticals > 0 && (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <XCircle className="w-3.5 h-3.5" /> {criticals}
                    </span>
                  )}
                  {warnings > 0 && (
                    <span className="flex items-center gap-1 text-xs text-yellow-400">
                      <AlertTriangle className="w-3.5 h-3.5" /> {warnings}
                    </span>
                  )}
                  {hasSuggestions && (
                    <Lightbulb className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  <span className="text-xs text-white/30">{page.wordCount}w</span>
                </div>
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/5 space-y-4">
                  {/* Current state */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Current State</h4>
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <span className="text-xs text-white/40 w-24 shrink-0">Title:</span>
                          <span className="text-xs text-white/70">{page.title || <span className="text-red-400">Missing</span>}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs text-white/40 w-24 shrink-0">Meta Desc:</span>
                          <span className="text-xs text-white/70">{page.metaDescription || <span className="text-red-400">Missing</span>}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs text-white/40 w-24 shrink-0">H1:</span>
                          <span className="text-xs text-white/70">{page.h1 || <span className="text-red-400">Missing</span>}</span>
                        </div>
                        {page.h2s.length > 0 && (
                          <div className="flex gap-2">
                            <span className="text-xs text-white/40 w-24 shrink-0">H2s:</span>
                            <span className="text-xs text-white/50">{page.h2s.join(", ")}</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <span className="text-xs text-white/40 w-24 shrink-0">Word Count:</span>
                          <span className="text-xs text-white/70">{page.wordCount}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs text-white/40 w-24 shrink-0">Schema:</span>
                          <span className="text-xs text-white/70">{page.schemaTypes.length > 0 ? page.schemaTypes.join(", ") : <span className="text-yellow-400">None</span>}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs text-white/40 w-24 shrink-0">Links:</span>
                          <span className="text-xs text-white/70">{page.internalLinks} internal, {page.externalLinks} external</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs text-white/40 w-24 shrink-0">Images:</span>
                          <span className="text-xs text-white/70">{page.totalImages} total{page.imagesWithoutAlt > 0 ? <span className="text-yellow-400"> ({page.imagesWithoutAlt} missing alt)</span> : ""}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs text-white/40 w-24 shrink-0">Load Time:</span>
                          <span className={`text-xs ${page.loadTime > 3000 ? "text-yellow-400" : "text-white/70"}`}>{(page.loadTime / 1000).toFixed(1)}s</span>
                        </div>
                      </div>
                      <a href={page.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                        <ExternalLink className="w-3 h-3" /> View page
                      </a>
                    </div>

                    {/* Issues */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Issues ({page.issues.length})</h4>
                      {page.issues.length === 0 ? (
                        <div className="flex items-center gap-2 text-emerald-400 text-xs">
                          <CheckCircle2 className="w-4 h-4" /> No issues found
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {page.issues.map((issue, i) => (
                            <div key={i} className="flex gap-2 items-start">
                              {issue.type === "critical" ? <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" /> :
                               issue.type === "warning" ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" /> :
                               <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />}
                              <div>
                                <p className="text-xs text-white/70">{issue.message}</p>
                                {issue.fix && <p className="text-[10px] text-white/40 mt-0.5">{issue.fix}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Suggestions */}
                  {(page.suggestions?.suggestedTitle || page.suggestions?.suggestedMetaDescription || page.suggestions?.suggestedH1 || page.suggestions?.topicsToAdd?.length || page.suggestions?.contentSuggestions?.length) && (
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" /> AI Suggestions
                      </h4>

                      {page.suggestions.targetKeyword && (
                        <div className="flex gap-2 items-center">
                          <Tag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-xs text-white/40">Target Keyword:</span>
                          <span className="text-xs text-blue-300 font-medium">{page.suggestions.targetKeyword}</span>
                        </div>
                      )}

                      {page.suggestions.suggestedTitle && (
                        <div>
                          <p className="text-[10px] text-white/40 mb-0.5">Suggested Title:</p>
                          <p className="text-xs text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">{page.suggestions.suggestedTitle}</p>
                        </div>
                      )}

                      {page.suggestions.suggestedMetaDescription && (
                        <div>
                          <p className="text-[10px] text-white/40 mb-0.5">Suggested Meta Description:</p>
                          <p className="text-xs text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">{page.suggestions.suggestedMetaDescription}</p>
                        </div>
                      )}

                      {page.suggestions.suggestedH1 && (
                        <div>
                          <p className="text-[10px] text-white/40 mb-0.5">Suggested H1:</p>
                          <p className="text-xs text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">{page.suggestions.suggestedH1}</p>
                        </div>
                      )}

                      {page.suggestions.topicsToAdd && page.suggestions.topicsToAdd.length > 0 && (
                        <div>
                          <p className="text-[10px] text-white/40 mb-1">Topics to Add:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {page.suggestions.topicsToAdd.map((topic, i) => (
                              <span key={i} className="px-2 py-0.5 bg-purple-500/10 text-purple-300 rounded text-xs">{topic}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {page.suggestions.contentSuggestions && page.suggestions.contentSuggestions.length > 0 && (
                        <div>
                          <p className="text-[10px] text-white/40 mb-1">Content Improvements:</p>
                          <ul className="space-y-1">
                            {page.suggestions.contentSuggestions.map((s, i) => (
                              <li key={i} className="text-xs text-white/60 flex gap-1.5">
                                <span className="text-blue-400 shrink-0">•</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredPages.length === 0 && (
          <div className="text-center py-12 text-white/40">
            <p>No pages match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
