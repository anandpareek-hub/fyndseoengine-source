"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/lib/site-context";
import { toast } from "sonner";
import { Target, Plus, Loader2, Sparkles, ArrowRight, Check } from "lucide-react";

type Goal = {
  id: string;
  title: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  status: string;
  plan?: {
    tasks?: { status: string }[];
  };
  createdAt: string;
};

type Suggestion = {
  title: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  priority: string;
  estimatedArticles: number;
};

const metricLabels: Record<string, string> = {
  organic_traffic: "Organic Traffic",
  rankings: "Rankings",
  conversions: "Conversions",
};

const statusStyles: Record<string, string> = {
  active: "bg-[#FFF3E0] text-[#FF5722] border-[#FF5722]/20",
  planning: "bg-[#fff7ed] text-[#FF5722] border-[#FF5722]/20",
  completed: "bg-[#f0fdf4] text-[#16a34a] border-[#16a34a]/20",
  paused: "bg-gray-100 text-gray-500 border-gray-200",
};

const priorityStyles: Record<string, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-[#fff7ed] text-[#FF5722]",
  low: "bg-gray-100 text-gray-500",
};

export default function GoalsPage() {
  const { currentSite } = useSite();
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Custom form state
  const [showCustom, setShowCustom] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    targetMetric: "organic_traffic",
    targetValue: "",
  });

  useEffect(() => {
    if (!currentSite) return;
    async function fetchGoals() {
      try {
        const res = await fetch(`/api/goals?siteId=${currentSite!.id}`);
        if (res.ok) {
          setGoals(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch goals:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchGoals();
  }, [currentSite]);

  async function loadSuggestions() {
    if (!currentSite) return;
    setShowCreate(true);
    setLoadingSuggestions(true);
    setSuggestions([]);
    setSelectedSuggestion(null);
    try {
      const res = await fetch("/api/goals/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: currentSite.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load suggestions:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function createGoal(suggestion?: Suggestion) {
    if (!currentSite) return;
    setSubmitting(true);
    const payload = suggestion
      ? {
          siteId: currentSite.id,
          title: suggestion.title,
          description: suggestion.description,
          targetMetric: suggestion.targetMetric,
          targetValue: suggestion.targetValue,
        }
      : {
          siteId: currentSite.id,
          title: form.title,
          description: form.description,
          targetMetric: form.targetMetric,
          targetValue: Number(form.targetValue),
        };

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const newGoal = await res.json();
        setGoals((prev) => [newGoal, ...prev]);
        setShowCreate(false);
        setShowCustom(false);
        setForm({ title: "", description: "", targetMetric: "organic_traffic", targetValue: "" });
        toast.success("Campaign created successfully");
        // Navigate to the new goal to generate plan
        router.push(`/goals/${newGoal.id}`);
      } else {
        toast.error("Failed to create campaign");
      }
    } catch (err) {
      console.error("Failed to create goal:", err);
      toast.error("Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  }

  function getProgress(goal: Goal) {
    const tasks = goal.plan?.tasks || [];
    if (tasks.length === 0) return { completed: 0, total: 0, pct: 0 };
    const completed = tasks.filter(
      (t) => t.status === "completed" || t.status === "ready" || t.status === "published"
    ).length;
    return { completed, total: tasks.length, pct: Math.round((completed / tasks.length) * 100) };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">
            Launch SEO campaigns with AI-generated content plans
          </p>
        </div>
        <button
          onClick={loadSuggestions}
          className="flex items-center gap-2 rounded-lg bg-[#FF5722] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64A19] transition-colors"
        >
          <Plus className="size-4" />
          New Campaign
        </button>
      </div>

      {/* Create Goal Panel */}
      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-[#f9fafb] px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-[#FF5722]" />
                <h2 className="text-base font-semibold text-[#1a1a2e]">
                  AI-Suggested Campaigns for {currentSite?.name || currentSite?.domain}
                </h2>
              </div>
              <button
                onClick={() => { setShowCreate(false); setShowCustom(false); }}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Based on your website data, audit insights, and SEO strategy
            </p>
          </div>

          <div className="p-6">
            {loadingSuggestions ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="size-8 text-[#FF5722] animate-spin" />
                <p className="mt-3 text-sm text-gray-500">
                  Analyzing your site and generating goal suggestions...
                </p>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedSuggestion(i)}
                      className={`relative rounded-lg border-2 p-4 text-left transition-all ${
                        selectedSuggestion === i
                          ? "border-[#FF5722] bg-[#FFF3E0]/50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {selectedSuggestion === i && (
                        <div className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-[#FF5722]">
                          <Check className="size-3 text-white" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${priorityStyles[s.priority] || priorityStyles.medium}`}>
                          {s.priority}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ~{s.estimatedArticles} articles
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-[#1a1a2e] pr-6">
                        {s.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {s.description}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                        <span>{metricLabels[s.targetMetric] || s.targetMetric}</span>
                        <span>Target: {s.targetValue?.toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (selectedSuggestion !== null) {
                        createGoal(suggestions[selectedSuggestion]);
                      }
                    }}
                    disabled={selectedSuggestion === null || submitting}
                    className="flex items-center gap-2 rounded-lg bg-[#FF5722] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#E64A19] disabled:opacity-50 transition-colors"
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        Create & Generate Plan
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowCustom(!showCustom)}
                    className="text-sm text-[#FF5722] hover:underline"
                  >
                    Or create a custom campaign
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No suggestions available. Create a custom campaign below.</p>
              </div>
            )}

            {/* Custom Goal Form */}
            {(showCustom || (!loadingSuggestions && suggestions.length === 0)) && (
              <div className={`space-y-4 ${suggestions.length > 0 ? "mt-6 pt-6 border-t border-gray-200" : ""}`}>
                <h3 className="text-sm font-semibold text-[#1a1a2e]">Custom Campaign</h3>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Rank for luxury fashion keywords in UAE"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe what you want to achieve..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Target Metric</label>
                    <select
                      value={form.targetMetric}
                      onChange={(e) => setForm({ ...form, targetMetric: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20"
                    >
                      <option value="organic_traffic">Organic Traffic</option>
                      <option value="rankings">Rankings</option>
                      <option value="conversions">Conversions</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Target Value</label>
                    <input
                      type="number"
                      value={form.targetValue}
                      onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
                      placeholder="e.g. 10000"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#1a1a2e] focus:border-[#FF5722] focus:outline-none focus:ring-2 focus:ring-[#FF5722]/20"
                    />
                  </div>
                </div>
                <button
                  onClick={() => createGoal()}
                  disabled={!form.title || submitting}
                  className="flex items-center gap-2 rounded-lg bg-[#1a1a2e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#16213e] disabled:opacity-50 transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Create Campaign
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Goals List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </div>
      ) : goals.length === 0 && !showCreate ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-[#f8f9fa]">
              <Target className="size-8 text-gray-300" />
            </div>
            <p className="mt-4 text-base font-medium text-[#1a1a2e]">No campaigns yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Launch your first SEO campaign to start generating AI content plans
            </p>
            <button
              onClick={loadSuggestions}
              className="mt-6 flex items-center gap-2 rounded-lg bg-[#FF5722] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#E64A19] transition-colors"
            >
              <Sparkles className="size-4" />
              Get AI-Suggested Campaigns
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const progress = getProgress(goal);
            return (
              <div
                key={goal.id}
                onClick={() => router.push(`/goals/${goal.id}`)}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#1a1a2e] pr-2">{goal.title}</h3>
                  <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyles[goal.status] || statusStyles.active}`}>
                    {goal.status}
                  </span>
                </div>
                {goal.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4">{goal.description}</p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Progress</span>
                    <span>
                      {progress.completed}/{progress.total} tasks
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full bg-[#FF5722] transition-all"
                      style={{ width: `${progress.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
