"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Loader2,
  ArrowLeft,
  Check,
  SkipForward,
  Save,
} from "lucide-react";

type Performance = {
  id: string;
  week: string;
  keyword: string;
  position: number | null;
  serpFeatures: unknown;
  topCompetitors: unknown;
  createdAt: string;
};

type OptTask = {
  id: string;
  type: string;
  title: string;
  suggestion: string;
  currentValue: string | null;
  proposedValue: string | null;
  priority: number;
  status: string;
  appliedAt: string | null;
  createdAt: string;
};

type PageDetail = {
  id: string;
  url: string;
  pageType: string;
  title: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  targetKeywords: string[];
  currentPosition: number | null;
  lastCheckedAt: string | null;
  isActive: boolean;
  createdAt: string;
  performance: Performance[];
  optimizationTasks: OptTask[];
};

const PAGE_TYPES = [
  "home",
  "listing",
  "collection",
  "product",
  "category",
  "custom",
];

const typeColors: Record<string, string> = {
  improve_meta_title: "bg-purple-50 text-purple-700 border-purple-200",
  improve_meta_description: "bg-blue-50 text-blue-700 border-blue-200",
  add_schema: "bg-cyan-50 text-cyan-700 border-cyan-200",
  content_gap: "bg-orange-50 text-orange-700 border-orange-200",
  improve_headings: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 border-gray-200",
  applied: "bg-green-50 text-green-700 border-green-200",
  skipped: "bg-gray-100 text-gray-600 border-gray-200",
};

function positionColor(pos: number | null): string {
  if (pos === null) return "text-gray-500";
  if (pos < 10) return "text-green-600";
  if (pos <= 30) return "text-yellow-600";
  return "text-red-600";
}

export default function PageDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [page, setPage] = useState<PageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editUrl, setEditUrl] = useState("");
  const [editPageType, setEditPageType] = useState("custom");
  const [editTitle, setEditTitle] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [editActive, setEditActive] = useState(true);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pages/${id}`);
      if (res.ok) {
        const data: PageDetail = await res.json();
        setPage(data);
        setEditUrl(data.url);
        setEditPageType(data.pageType);
        setEditTitle(data.title || "");
        setEditKeywords(data.targetKeywords.join(", "));
        setEditActive(data.isActive);
      }
    } catch (err) {
      console.error("Failed to fetch page:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: editUrl.trim(),
          pageType: editPageType,
          title: editTitle.trim() || null,
          targetKeywords: editKeywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          isActive: editActive,
        }),
      });
      if (res.ok) {
        fetchPage();
      }
    } catch (err) {
      console.error("Failed to save page:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleTaskAction(taskId: string, action: "apply" | "skip") {
    setActionLoading(`${taskId}-${action}`);
    try {
      const res = await fetch(
        `/api/pages/${id}/optimizations/${taskId}/${action}`,
        { method: "POST" }
      );
      if (res.ok) {
        setPage((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            optimizationTasks: prev.optimizationTasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: action === "apply" ? "applied" : "skipped",
                    appliedAt:
                      action === "apply" ? new Date().toISOString() : t.appliedAt,
                  }
                : t
            ),
          };
        });
      }
    } catch (err) {
      console.error("Task action failed:", err);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500">Page not found.</p>
        <Link href="/pages">
          <Button variant="outline">
            <ArrowLeft className="mr-2 size-4" />
            Back to Pages
          </Button>
        </Link>
      </div>
    );
  }

  // Group performance by week for table display
  const performanceByWeek = page.performance.reduce<
    Record<string, Performance[]>
  >((acc, p) => {
    const weekKey = new Date(p.week).toLocaleDateString();
    if (!acc[weekKey]) acc[weekKey] = [];
    acc[weekKey].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/pages">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">{page.url}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {page.title || "Monitored page"} &middot;{" "}
            <span className={`font-mono ${positionColor(page.currentPosition)}`}>
              Position:{" "}
              {page.currentPosition !== null
                ? page.currentPosition.toFixed(1)
                : "--"}
            </span>
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="optimizations">
            Optimizations ({page.optimizationTasks.length})
          </TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Current Position</p>
                <p className={`text-3xl font-bold ${positionColor(page.currentPosition)}`}>
                  {page.currentPosition !== null
                    ? page.currentPosition.toFixed(1)
                    : "--"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Page Type</p>
                <p className="mt-1 text-lg font-medium capitalize">{page.pageType}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Target Keywords</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {page.targetKeywords.length > 0 ? (
                    page.targetKeywords.map((kw) => (
                      <Badge key={kw} variant="outline" className="text-xs">
                        {kw}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">None set</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          {page.metaTitle && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Meta Title</p>
                <p className="mt-1 font-medium">{page.metaTitle}</p>
              </CardContent>
            </Card>
          )}
          {page.metaDescription && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-500">Meta Description</p>
                <p className="mt-1 text-sm text-gray-500">
                  {page.metaDescription}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance">
          {page.performance.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-lg font-medium text-gray-500">
                  No performance data yet
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Performance data will appear after the first tracking run.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(performanceByWeek).map(([week, entries]) =>
                      entries.map((entry, idx) => (
                        <TableRow key={entry.id}>
                          {idx === 0 && (
                            <TableCell
                              rowSpan={entries.length}
                              className="font-medium"
                            >
                              {week}
                            </TableCell>
                          )}
                          <TableCell>{entry.keyword}</TableCell>
                          <TableCell>
                            <span
                              className={`font-mono font-medium ${positionColor(entry.position)}`}
                            >
                              {entry.position !== null
                                ? entry.position.toFixed(1)
                                : "--"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="optimizations">
          {page.optimizationTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-lg font-medium text-gray-500">
                  No optimization tasks
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Optimization suggestions will appear here after analysis runs.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {page.optimizationTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={typeColors[task.type] || ""}
                          >
                            {task.type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-gray-500 mt-1 max-w-md truncate">
                              {task.suggestion}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {task.priority}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusColors[task.status] || ""}
                          >
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {task.status === "pending" && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleTaskAction(task.id, "apply")
                                }
                                disabled={
                                  actionLoading === `${task.id}-apply`
                                }
                              >
                                {actionLoading === `${task.id}-apply` ? (
                                  <Loader2 className="mr-1 size-3 animate-spin" />
                                ) : (
                                  <Check className="mr-1 size-3" />
                                )}
                                Apply
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleTaskAction(task.id, "skip")
                                }
                                disabled={
                                  actionLoading === `${task.id}-skip`
                                }
                              >
                                {actionLoading === `${task.id}-skip` ? (
                                  <Loader2 className="mr-1 size-3 animate-spin" />
                                ) : (
                                  <SkipForward className="mr-1 size-3" />
                                )}
                                Skip
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="edit">
          <Card>
            <CardContent className="pt-6 space-y-4 max-w-lg">
              <div>
                <Label>URL</Label>
                <Input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                />
              </div>
              <div>
                <Label>Page Type</Label>
                <Select value={editPageType} onValueChange={(val) => { if (val) setEditPageType(val); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Page title"
                />
              </div>
              <div>
                <Label>Target Keywords (comma-separated)</Label>
                <Input
                  value={editKeywords}
                  onChange={(e) => setEditKeywords(e.target.value)}
                  placeholder="keyword 1, keyword 2"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>Active</Label>
                <button
                  onClick={() => setEditActive(!editActive)}
                  className="cursor-pointer"
                >
                  <Badge
                    variant="outline"
                    className={
                      editActive
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }
                  >
                    {editActive ? "Active" : "Paused"}
                  </Badge>
                </button>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
