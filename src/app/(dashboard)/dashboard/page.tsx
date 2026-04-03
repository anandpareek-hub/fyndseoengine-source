"use client";

import { useEffect, useState } from "react";
import {
  Target,
  FileText,
  ClipboardList,
  CheckCircle2,
  FlaskConical,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useSite } from "@/lib/site-context";

type Stats = {
  activeGoals: number;
  articlesInPipeline: number;
  inReview: number;
  published: number;
  runningABTests: number;
  pendingOptimizations: number;
};

type ActivityItem = {
  id: string;
  message: string;
  timestamp: string;
};

const statCards = [
  {
    key: "activeGoals" as const,
    label: "Active Campaigns",
    icon: Target,
    color: "text-orange-500",
    bg: "bg-orange-50",
    hoverBg: "group-hover:bg-orange-100",
  },
  {
    key: "articlesInPipeline" as const,
    label: "Articles in Pipeline",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-50",
    hoverBg: "group-hover:bg-blue-100",
  },
  {
    key: "inReview" as const,
    label: "In Review",
    icon: ClipboardList,
    color: "text-amber-500",
    bg: "bg-amber-50",
    hoverBg: "group-hover:bg-amber-100",
  },
  {
    key: "published" as const,
    label: "Published",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    hoverBg: "group-hover:bg-emerald-100",
  },
  {
    key: "runningABTests" as const,
    label: "Running A/B Tests",
    icon: FlaskConical,
    color: "text-purple-500",
    bg: "bg-purple-50",
    hoverBg: "group-hover:bg-purple-100",
  },
  {
    key: "pendingOptimizations" as const,
    label: "Pending Optimizations",
    icon: Sparkles,
    color: "text-pink-500",
    bg: "bg-pink-50",
    hoverBg: "group-hover:bg-pink-100",
  },
];

export default function DashboardPage() {
  const { currentSite } = useSite();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const params = currentSite?.id ? `?siteId=${currentSite.id}` : "";
        const res = await fetch(`/api/stats${params}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setActivity(data.recentActivity || []);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [currentSite?.id]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your SEO content pipeline
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = loading ? "--" : (stats?.[card.key] ?? 0);
          return (
            <div key={card.key} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-gray-100 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center ${card.hoverBg} transition-colors`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className="text-xs text-emerald-500 font-medium flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> Active
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <p className="text-sm text-gray-500">Latest updates from your pipeline</p>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
              <ClipboardList className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">
              No recent activity yet. Create your first campaign to get started.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {activity.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-3 text-sm px-3 py-2.5 rounded-xl hover:bg-gray-50/50 transition-colors"
              >
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-orange" />
                <div className="flex-1">
                  <p className="text-gray-900">{item.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
