"use client";

import { useEffect, useState } from "react";
import { useSite } from "@/lib/site-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Wrench, Check, SkipForward } from "lucide-react";

type Optimization = {
  id: string;
  article: { title: string };
  title: string;
  type: string;
  changeSize: string;
  priority: string;
  status: string;
};

const typeColors: Record<string, string> = {
  update_meta: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  add_faq: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  rewrite_section: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  expand_content: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  add_internal_links: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  update_images: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  fix_technical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  applied: "bg-green-500/20 text-green-400 border-green-500/30",
  skipped: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  review_needed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const changeSizeColors: Record<string, string> = {
  minor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  major: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const tabs = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "applied", label: "Applied" },
  { value: "skipped", label: "Skipped" },
  { value: "review_needed", label: "Review Needed" },
];

export default function OptimizationsPage() {
  const { currentSite } = useSite();
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSite) return;
    setLoading(true);
    async function fetchData() {
      try {
        const statusParam = activeTab === "all" ? "" : `&status=${activeTab}`;
        const res = await fetch(`/api/optimizations?siteId=${currentSite!.id}${statusParam}`);
        if (res.ok) {
          setOptimizations(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch optimizations:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentSite, activeTab]);

  async function handleAction(id: string, action: "apply" | "skip") {
    setActionLoading(`${id}-${action}`);
    try {
      const res = await fetch(`/api/optimizations/${id}/${action}`, { method: "POST" });
      if (res.ok) {
        setOptimizations((prev) => prev.filter((o) => o.id !== id));
      }
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Optimizations</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI-suggested improvements for your published content
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-6 animate-spin text-gray-500" />
              </div>
            ) : optimizations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Wrench className="size-12 text-gray-300" />
                  <p className="mt-4 text-lg font-medium text-gray-500">
                    No optimization tasks
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Optimization suggestions will appear here after market research runs.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optimizations.map((opt) => (
                        <TableRow key={opt.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {opt.article?.title ?? "Untitled"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={typeColors[opt.type] || ""}>
                              {opt.type.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-500 max-w-[200px] truncate">
                            {opt.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={changeSizeColors[opt.changeSize] || ""}>
                              {opt.changeSize}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-500 capitalize">
                            {opt.priority}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[opt.status] || ""}>
                              {opt.status.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {(opt.status === "pending" || opt.status === "review_needed") && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleAction(opt.id, "apply")}
                                  disabled={actionLoading === `${opt.id}-apply`}
                                >
                                  {actionLoading === `${opt.id}-apply` ? (
                                    <Loader2 className="mr-1 size-3 animate-spin" />
                                  ) : (
                                    <Check className="mr-1 size-3" />
                                  )}
                                  Apply
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAction(opt.id, "skip")}
                                  disabled={actionLoading === `${opt.id}-skip`}
                                >
                                  {actionLoading === `${opt.id}-skip` ? (
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
        ))}
      </Tabs>
    </div>
  );
}
