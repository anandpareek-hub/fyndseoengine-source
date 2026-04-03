"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/lib/site-context";
import { toast } from "sonner";
import {
  List,
  Loader2,
  Search,
  FileText,
  BookOpen,
  BarChart3,
  Layout,
  Image,
  HelpCircle,
  Gift,
  Wrench,
  Lightbulb,
  MapPin,
  Snowflake,
  BookMarked,
  PenTool,
  ArrowRight,
  AlertTriangle,
  Filter,
  SortAsc,
  TrendingUp,
  Download,
} from "lucide-react";

// Content type config (mirrors content-strategy page)
const contentTypeConfig: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  blogPosts: { label: "Blog Posts", icon: FileText, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  guides: { label: "Guides", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
  comparisonPages: { label: "Comparisons", icon: BarChart3, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  landingPages: { label: "Landing Pages", icon: Layout, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
  lookbooks: { label: "Lookbooks", icon: Image, color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-200" },
  faqPages: { label: "FAQ Pages", icon: HelpCircle, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200" },
  giftGuides: { label: "Gift Guides", icon: Gift, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  careGuides: { label: "Care Guides", icon: Wrench, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
  toolPages: { label: "Tool Pages", icon: Lightbulb, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  localPages: { label: "Local Pages", icon: MapPin, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-200" },
  seasonalPages: { label: "Seasonal", icon: Snowflake, color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-200" },
  glossaryPages: { label: "Glossary", icon: BookMarked, color: "text-gray-600", bg: "bg-gray-100", border: "border-gray-200" },
};

const priorityColors: Record<string, string> = {
  high: "bg-red-50 text-red-600 border-red-200",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  low: "bg-gray-100 text-gray-500 border-gray-200",
  "must-write": "bg-red-50 text-red-600 border-red-200",
  "should-write": "bg-amber-50 text-amber-600 border-amber-200",
  "nice-to-have": "bg-gray-100 text-gray-500 border-gray-200",
};

const priorityOrder: Record<string, number> = {
  "must-write": 0,
  high: 1,
  "should-write": 2,
  medium: 3,
  "nice-to-have": 4,
  low: 5,
};

type TopicItem = {
  type: string;
  item: any;
};

export default function TopicsPage() {
  const { currentSite } = useSite();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"priority" | "volume" | "traffic">("priority");
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [writingTopics, setWritingTopics] = useState<Set<string>>(new Set()); // track by slug
  const [writtenTopics, setWrittenTopics] = useState<Set<string>>(new Set()); // completed

  // Manual topic state
  const [manualTopic, setManualTopic] = useState("");
  const [manualTopics, setManualTopics] = useState<Array<{id: string; title: string; keyword: string; status: string; articleId: string | null}>>([]);

  // Load manual topics from DB
  useEffect(() => {
    if (!currentSite?.id) return;
    fetch(`/api/topics?siteId=${currentSite.id}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setManualTopics(data); });
  }, [currentSite?.id]);

  async function addManualTopic() {
    if (!manualTopic.trim() || !currentSite?.id) return;
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: currentSite.id, title: manualTopic.trim() }),
      });
      const topic = await res.json();
      if (res.ok) {
        setManualTopics(prev => [topic, ...prev]);
        setManualTopic("");
      }
    } catch { toast.error("Failed to add topic"); }
  }

  async function generateFromTopic(topicId: string) {
    if (!currentSite?.id) return;
    const topic = manualTopics.find(t => t.id === topicId);
    if (!topic) return;

    setManualTopics(prev => prev.map(t => t.id === topicId ? { ...t, status: "generating" } : t));

    // Update status in DB
    await fetch(`/api/topics/${topicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "generating" }),
    });

    try {
      // Generate article directly with exact keyword - no planner rewriting
      const genRes = await fetch("/api/articles/generate-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: currentSite.id,
          title: topic.title,
          keyword: topic.keyword,
        }),
      });

      if (genRes.ok) {
          const article = await genRes.json();
          setManualTopics(prev => prev.map(t => t.id === topicId ? { ...t, status: "done", articleId: article.id } : t));
          await fetch(`/api/topics/${topicId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "done", articleId: article.id }),
          });
          toast.success(`Article generated: ${topic.title}`);
        } else {
          throw new Error("Generation failed");
        }
    } catch (err) {
      setManualTopics(prev => prev.map(t => t.id === topicId ? { ...t, status: "failed" } : t));
      await fetch(`/api/topics/${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "failed" }),
      });
      toast.error("Failed to generate article");
    }
  }

  async function deleteManualTopic(topicId: string) {
    try {
      await fetch(`/api/topics/${topicId}`, { method: "DELETE" });
      setManualTopics(prev => prev.filter(t => t.id !== topicId));
    } catch { toast.error("Failed to delete"); }
  }

  async function handleWrite(item: any, type: string) {
    if (!currentSite) return;
    const topicKey = item.slug || item.title;
    if (writingTopics.has(topicKey) || writtenTopics.has(topicKey)) return;

    setWritingTopics(prev => new Set(prev).add(topicKey));
    try {
      const res = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: currentSite.id,
          title: item.title,
          slug: item.slug,
          targetKeyword: item.targetKeyword,
          secondaryKeywords: item.secondaryKeywords || [],
          brief: item.brief || "",
          wordCount: item.wordCount || 1500,
          contentType: type,
          cluster: item.cluster || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWrittenTopics(prev => new Set(prev).add(topicKey));
        toast.success(`"${item.title}" is being written! Check Articles page.`, {
          action: { label: "View Articles", onClick: () => router.push("/articles") },
        });
      } else {
        const err = await res.json();
        if (res.status === 409) {
          setWrittenTopics(prev => new Set(prev).add(topicKey));
          toast.info(err.error || "Article already exists for this keyword", {
            action: { label: "View Article", onClick: () => router.push(`/articles/${err.articleId}`) },
          });
        } else {
          toast.error(err.error || "Failed to generate article");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to start article generation");
    } finally {
      setWritingTopics(prev => { const next = new Set(prev); next.delete(topicKey); return next; });
    }
  }

  useEffect(() => {
    if (!currentSite?.id) return;
    setLoading(true);
    fetch(`/api/sites/${currentSite.id}/content-strategy`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.newContent) {
          const all: TopicItem[] = [];
          const counts: Record<string, number> = {};
          for (const [type, items] of Object.entries(res.data.newContent)) {
            if (Array.isArray(items) && items.length > 0) {
              counts[type] = items.length;
              for (const item of items) {
                all.push({ type, item });
              }
            }
          }
          setTopics(all);
          setTypeCounts(counts);
          setAnalyzedAt(res.analyzedAt);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSite?.id]);

  // Filter by tab and search
  const filtered = topics
    .filter((t) => activeTab === "all" || t.type === activeTab)
    .filter((t) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.item.title?.toLowerCase().includes(q) ||
        t.item.targetKeyword?.toLowerCase().includes(q) ||
        t.item.brief?.toLowerCase().includes(q) ||
        t.item.slug?.toLowerCase().includes(q)
      );
    });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "priority") {
      return (priorityOrder[a.item.priority] ?? 3) - (priorityOrder[b.item.priority] ?? 3);
    }
    if (sortBy === "volume") {
      return (b.item.searchVolume || 0) - (a.item.searchVolume || 0);
    }
    return (b.item.estimatedTraffic || 0) - (a.item.estimatedTraffic || 0);
  });

  const totalTopics = topics.length;

  function downloadCSV() {
    const headers = ["Type", "Title", "Slug", "Target Keyword", "Secondary Keywords", "Search Volume", "KD", "Estimated Traffic", "Priority", "Funnel Stage", "Cluster Role", "Search Intent", "Word Count", "Brief", "Competitors", "Internal Links To", "Rationale"];
    const rows = sorted.map(({ type, item }) => [
      contentTypeConfig[type]?.label || type,
      item.title || "",
      item.slug || "",
      item.targetKeyword || "",
      (item.secondaryKeywords || []).join("; "),
      item.searchVolume || 0,
      item.keywordDifficulty || 0,
      item.estimatedTraffic || 0,
      item.priority || "",
      item.funnelStage || "",
      item.clusterRole || "",
      item.searchIntent || "",
      item.wordCount || 0,
      item.brief || "",
      (item.competitorsCovering || []).join("; "),
      (item.internalLinksTo || []).map((l: any) => l.title).join("; "),
      item.rationale || "",
    ]);
    const escape = (v: any) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topics-${activeTab === "all" ? "all" : activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Shared manual topic input component
  const ManualTopicInput = () => (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">Add a Topic</h3>
      <div className="flex gap-2">
        <input
          value={manualTopic}
          onChange={(e) => setManualTopic(e.target.value)}
          placeholder="e.g. Best AR try-on solutions for fashion brands"
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20"
          onKeyDown={(e) => e.key === "Enter" && addManualTopic()}
        />
        <button
          onClick={addManualTopic}
          disabled={!manualTopic.trim()}
          className="rounded-lg bg-[#FF5722] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#E64A19] disabled:opacity-50"
        >
          Add Topic
        </button>
      </div>
    </div>
  );

  // Shared manual topics list component
  const ManualTopicsList = () => {
    if (manualTopics.length === 0) return null;
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-[#1a1a2e]">{manualTopics.length} Manual Topics</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {manualTopics.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1a1a2e] truncate">{t.title}</p>
                <p className="text-xs text-gray-400">{t.keyword}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {t.status === "generating" ? (
                  <span className="flex items-center gap-1.5 text-xs text-[#FF5722]">
                    <Loader2 className="size-3.5 animate-spin" /> Generating...
                  </span>
                ) : t.status === "done" ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <FileText className="size-3.5" /> Created
                  </span>
                ) : (
                  <button
                    onClick={() => generateFromTopic(t.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#FF5722] px-3 py-1.5 text-xs font-medium text-[#FF5722] hover:bg-[#FFF3E0]"
                  >
                    <PenTool className="size-3.5" /> Generate Article
                  </button>
                )}
                <button
                  onClick={() => deleteManualTopic(t.id)}
                  className="text-gray-300 hover:text-red-400 text-xs"
                >
                  &#x2715;
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-6 text-[#FF5722] animate-spin" />
        <span className="ml-3 text-sm text-gray-500">Loading topics...</span>
      </div>
    );
  }

  if (totalTopics === 0 && manualTopics.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <List className="size-8 text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-[#1a1a2e] mb-2">Add Your Topics</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter topics you want to write about, then generate articles with one click.
          </p>
        </div>

        {/* Manual Topic Input */}
        <ManualTopicInput />

        {/* Manual Topics List */}
        <ManualTopicsList />

        <div className="text-center">
          <p className="text-xs text-gray-400 mb-2">Or let AI find topics for you</p>
          <button
            onClick={() => router.push("/content-strategy")}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Run Content Strategy <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  // When manualTopics exist but no strategy topics, show expanded manual view
  if (totalTopics === 0 && manualTopics.length > 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-8">
        <div className="text-center">
          <h2 className="text-lg font-bold text-[#1a1a2e] mb-2">Your Topics</h2>
          <p className="text-sm text-gray-500 mb-6">
            Add topics and generate articles with one click.
          </p>
        </div>

        <ManualTopicInput />
        <ManualTopicsList />

        <div className="text-center">
          <p className="text-xs text-gray-400 mb-2">Or let AI find topics for you</p>
          <button
            onClick={() => router.push("/content-strategy")}
            className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Run Content Strategy <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <List className="size-6 text-[#FF5722]" />
            Topics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalTopics} topics from Content Strategy
            {analyzedAt && (
              <span className="text-gray-400">
                {" "}
                &middot; Generated {new Date(analyzedAt).toLocaleDateString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadCSV}
            className="flex items-center gap-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="size-3" /> Download CSV
          </button>
          <button
            onClick={() => router.push("/content-strategy")}
            className="text-xs text-[#FF5722] hover:text-[#E64A19] font-medium flex items-center gap-1"
          >
            View Strategy <ArrowRight className="size-3" />
          </button>
        </div>
      </div>

      {/* Manual Topic Input - always visible at top */}
      <ManualTopicInput />
      <ManualTopicsList />

      {/* Search + Sort Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search topics, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20 focus:border-[#FF5722] transition-colors"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          <button
            onClick={() => setSortBy("priority")}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
              sortBy === "priority" ? "bg-[#FF5722] text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Filter className="size-3" /> Priority
          </button>
          <button
            onClick={() => setSortBy("volume")}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
              sortBy === "volume" ? "bg-[#FF5722] text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <SortAsc className="size-3" /> Volume
          </button>
          <button
            onClick={() => setSortBy("traffic")}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
              sortBy === "traffic" ? "bg-[#FF5722] text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <TrendingUp className="size-3" /> Traffic
          </button>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveTab("all")}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            activeTab === "all"
              ? "bg-[#1a1a2e] text-white border-[#1a1a2e]"
              : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
          }`}
        >
          All ({totalTopics})
        </button>
        {Object.entries(typeCounts).map(([type, count]) => {
          const config = contentTypeConfig[type];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                activeTab === type
                  ? `${config.bg} ${config.color} ${config.border}`
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="size-3" />
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Topics List */}
      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="size-5 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No topics match your search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(({ type, item }, i) => {
            const config = contentTypeConfig[type] || {
              label: type,
              icon: FileText,
              color: "text-gray-600",
              bg: "bg-gray-50",
              border: "border-gray-200",
            };
            const Icon = config.icon;
            return (
              <div
                key={`${type}-${i}`}
                className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                        <Icon className="size-2.5" />
                        {config.label}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${priorityColors[item.priority] || priorityColors.medium}`}>
                        {item.priority}
                      </span>
                      {item.funnelStage && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          item.funnelStage === "BOFU" ? "bg-emerald-50 text-emerald-600" :
                          item.funnelStage === "MOFU" ? "bg-amber-50 text-amber-600" :
                          "bg-blue-50 text-blue-600"
                        }`}>
                          {item.funnelStage}
                        </span>
                      )}
                      {item.clusterRole === "pillar" && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                          Pillar
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-[#1a1a2e] leading-snug">{item.title}</h3>
                    {item.slug && (
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{item.slug}</p>
                    )}
                  </div>
                  {(() => {
                    const topicKey = item.slug || item.title;
                    const isWriting = writingTopics.has(topicKey);
                    const isWritten = writtenTopics.has(topicKey);
                    if (isWritten) {
                      return (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 px-3 py-1.5 shrink-0">
                          <FileText className="size-3" /> Written
                        </span>
                      );
                    }
                    if (isWriting) {
                      return (
                        <span className="flex items-center gap-1 text-xs font-semibold text-[#FF5722] px-3 py-1.5 shrink-0 animate-pulse">
                          <Loader2 className="size-3 animate-spin" /> Writing...
                        </span>
                      );
                    }
                    return (
                      <button
                        onClick={() => handleWrite(item, type)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-semibold bg-[#FF5722] text-white px-3 py-1.5 rounded-lg hover:bg-[#E64A19] transition-all shrink-0"
                      >
                        <PenTool className="size-3" /> Write
                      </button>
                    );
                  })()}
                </div>

                {item.brief && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{item.brief}</p>
                )}

                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400">
                  {item.targetKeyword && (
                    <span className="font-mono bg-gray-50 px-2 py-0.5 rounded text-[#1a1a2e] font-medium">
                      {item.targetKeyword}
                    </span>
                  )}
                  {item.searchVolume > 0 && (
                    <span>{item.searchVolume.toLocaleString()} vol</span>
                  )}
                  {item.keywordDifficulty > 0 && (
                    <span>KD {item.keywordDifficulty}</span>
                  )}
                  {item.estimatedTraffic > 0 && (
                    <span className="text-emerald-600">
                      ~{item.estimatedTraffic.toLocaleString()} traffic
                    </span>
                  )}
                  {item.wordCount > 0 && (
                    <span>{item.wordCount.toLocaleString()} words</span>
                  )}
                </div>

                {item.secondaryKeywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.secondaryKeywords.slice(0, 5).map((kw: string, j: number) => (
                      <span key={j} className="text-[10px] bg-gray-50 text-gray-400 rounded px-1.5 py-0.5">
                        {kw}
                      </span>
                    ))}
                    {item.secondaryKeywords.length > 5 && (
                      <span className="text-[10px] text-gray-300">
                        +{item.secondaryKeywords.length - 5} more
                      </span>
                    )}
                  </div>
                )}

                {(item.competitorsCovering?.length > 0 || item.internalLinksTo?.length > 0) && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                    {item.competitorsCovering?.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">Competitors:</span>
                        {item.competitorsCovering.map((comp: string, j: number) => (
                          <span key={j} className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">
                            {comp}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.internalLinksTo?.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-gray-400">Link to:</span>
                        {item.internalLinksTo.map((link: any, j: number) => (
                          <span key={j} className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded" title={`/${link.slug} (${link.relationship})`}>
                            {link.title?.length > 40 ? link.title.slice(0, 40) + "..." : link.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
