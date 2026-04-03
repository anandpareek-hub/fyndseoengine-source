"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Loader2, Sparkles, FileText, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  targetKeyword: string;
  type: string;
  priority: string;
  status: string;
  scheduledDate: string | null;
  articleId: string | null;
};

type TopicCluster = {
  name: string;
  description: string;
  tasks: Task[];
};

type Plan = {
  id: string;
  strategySummary: string;
  topicClusters: TopicCluster[];
  tasks: Task[];
};

type Goal = {
  id: string;
  title: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  status: string;
  plan: Plan | null;
};

const priorityColors: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  low: "bg-green-50 text-green-700 border-green-200",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 border-gray-200",
  generating: "bg-blue-50 text-blue-700 border-blue-200",
  ready: "bg-green-50 text-green-700 border-green-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatingTaskId, setGeneratingTaskId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGoal() {
      try {
        const res = await fetch(`/api/goals/${goalId}`);
        if (res.ok) {
          setGoal(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch goal:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchGoal();
  }, [goalId]);

  async function handleGeneratePlan() {
    setGeneratingPlan(true);
    try {
      const res = await fetch(`/api/goals/${goalId}/plan`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setGoal(updated);
        toast.success("Plan generated successfully");
      } else {
        toast.error("Failed to generate campaign plan");
      }
    } catch (err) {
      console.error("Failed to generate plan:", err);
      toast.error("Failed to generate campaign plan");
    } finally {
      setGeneratingPlan(false);
    }
  }

  async function handleGenerateArticle(taskId: string) {
    setGeneratingTaskId(taskId);
    try {
      const res = await fetch(`/api/plan-tasks/${taskId}/generate`, { method: "POST" });
      if (res.ok) {
        const updatedTask = await res.json();
        toast.success("Article generated successfully");
        setGoal((prev) => {
          if (!prev?.plan) return prev;
          return {
            ...prev,
            plan: {
              ...prev.plan,
              tasks: prev.plan.tasks.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t)),
              topicClusters: prev.plan.topicClusters.map((cluster) => ({
                ...cluster,
                tasks: cluster.tasks.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t)),
              })),
            },
          };
        });
      }
    } catch (err) {
      console.error("Failed to generate article:", err);
      toast.error("Failed to generate article");
    } finally {
      setGeneratingTaskId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="py-20 text-center text-gray-500">
        Goal not found.
      </div>
    );
  }

  const allTasks = goal.plan?.topicClusters?.length
    ? goal.plan.topicClusters.flatMap((c) => c.tasks)
    : goal.plan?.tasks || [];

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/goals")} className="mb-4">
          <ArrowLeft className="mr-2 size-4" />
          Back to Campaigns
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">{goal.title}</h1>
            {goal.description && (
              <p className="mt-1 text-sm text-gray-500">{goal.description}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className={
              goal.status === "active"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : goal.status === "completed"
                ? "bg-green-50 text-green-700 border-green-200"
                : ""
            }
          >
            {goal.status}
          </Badge>
        </div>
        <div className="mt-2 flex gap-4 text-sm text-gray-500">
          <span>Metric: {goal.targetMetric.replace("_", " ")}</span>
          <span>Target: {goal.targetValue.toLocaleString()}</span>
        </div>
      </div>

      {!goal.plan ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Sparkles className="size-12 text-gray-500/50" />
            <p className="mt-4 text-lg font-medium text-gray-500">No plan generated yet</p>
            <p className="mt-1 mb-6 text-sm text-gray-500">
              Generate an AI-powered content plan for this goal.
            </p>
            <Button onClick={handleGeneratePlan} disabled={generatingPlan}>
              {generatingPlan ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              {generatingPlan ? "Generating Plan..." : "Generate Plan"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {goal.plan.strategySummary && (
            <Card>
              <CardHeader>
                <CardTitle>Strategy Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {goal.plan.strategySummary}
                </p>
              </CardContent>
            </Card>
          )}

          {goal.plan.topicClusters?.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">Topic Clusters</h2>
              {goal.plan.topicClusters.map((cluster, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-base">{cluster.name}</CardTitle>
                    {cluster.description && (
                      <CardDescription>{cluster.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Keyword</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Scheduled</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cluster.tasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">{task.title}</TableCell>
                            <TableCell className="text-gray-500">{task.targetKeyword}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{task.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={priorityColors[task.priority] || ""}>
                                {task.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusColors[task.status] || ""}>
                                {task.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {task.scheduledDate
                                ? new Date(task.scheduledDate).toLocaleDateString()
                                : "--"}
                            </TableCell>
                            <TableCell className="text-right">
                              {task.status === "ready" && task.articleId ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/articles/${task.articleId}`)}
                                >
                                  <FileText className="mr-1 size-3" />
                                  View Article
                                </Button>
                              ) : task.status === "pending" ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleGenerateArticle(task.id)}
                                  disabled={generatingTaskId === task.id}
                                >
                                  {generatingTaskId === task.id ? (
                                    <Loader2 className="mr-1 size-3 animate-spin" />
                                  ) : (
                                    <Sparkles className="mr-1 size-3" />
                                  )}
                                  Generate
                                </Button>
                              ) : task.status === "generating" ? (
                                <span className="flex items-center text-sm text-gray-500">
                                  <Loader2 className="mr-1 size-3 animate-spin" />
                                  Generating...
                                </span>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {(!goal.plan.topicClusters || goal.plan.topicClusters.length === 0) && allTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Keyword</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell className="text-gray-500">{task.targetKeyword}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{task.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={priorityColors[task.priority] || ""}>
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[task.status] || ""}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {task.scheduledDate
                            ? new Date(task.scheduledDate).toLocaleDateString()
                            : "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          {task.status === "ready" && task.articleId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/articles/${task.articleId}`)}
                            >
                              <FileText className="mr-1 size-3" />
                              View Article
                            </Button>
                          ) : task.status === "pending" ? (
                            <Button
                              size="sm"
                              onClick={() => handleGenerateArticle(task.id)}
                              disabled={generatingTaskId === task.id}
                            >
                              {generatingTaskId === task.id ? (
                                <Loader2 className="mr-1 size-3 animate-spin" />
                              ) : (
                                <Sparkles className="mr-1 size-3" />
                              )}
                              Generate
                            </Button>
                          ) : task.status === "generating" ? (
                            <span className="flex items-center text-sm text-gray-500">
                              <Loader2 className="mr-1 size-3 animate-spin" />
                              Generating...
                            </span>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
