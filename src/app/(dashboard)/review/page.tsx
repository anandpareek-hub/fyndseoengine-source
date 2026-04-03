"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/lib/site-context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Check, X, Eye, ClipboardList, Wrench } from "lucide-react";
import { toast } from "sonner";

type Article = {
  id: string;
  title: string;
  keywords: string[];
  wordCount: number;
  content: string;
  createdAt: string;
};

type Optimization = {
  id: string;
  articleTitle: string;
  title: string;
  type: string;
  priority: string;
  status: string;
};

export default function ReviewPage() {
  const { currentSite } = useSite();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!currentSite) return;
    async function fetchData() {
      try {
        const [articlesRes, optimizationsRes] = await Promise.all([
          fetch(`/api/articles?siteId=${currentSite!.id}&status=in_review`),
          fetch(`/api/optimizations?siteId=${currentSite!.id}&status=review_needed`),
        ]);
        if (articlesRes.ok) setArticles(await articlesRes.json());
        if (optimizationsRes.ok) setOptimizations(await optimizationsRes.json());
      } catch (err) {
        console.error("Failed to fetch review data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentSite]);

  async function handleArticleAction(articleId: string, action: string, body?: Record<string, string>) {
    setActionLoading(`${articleId}-${action}`);
    try {
      const endpoint = action === "revision" ? "revise" : action;
      const res = await fetch(`/api/articles/${articleId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      if (res.ok) {
        setArticles((prev) => prev.filter((a) => a.id !== articleId));
        setRejectId(null);
        setRejectReason("");
        toast.success(action === "approve" ? "Article approved" : "Article rejected");
      } else {
        toast.error(`Failed to ${action} article`);
      }
    } catch (err) {
      console.error("Action failed:", err);
      toast.error(`Failed to ${action} article`);
    } finally {
      setActionLoading(null);
    }
  }

  function stripHtml(html: string) {
    const tmp = typeof document !== "undefined" ? document.createElement("div") : null;
    if (tmp) {
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || "";
    }
    return html.replace(/<[^>]*>/g, "");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Review Queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Articles and optimizations awaiting your review
        </p>
      </div>

      {/* Articles in Review */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1a1a2e]">
          <ClipboardList className="size-5" />
          Articles for Review ({articles.length})
        </h2>

        {articles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="size-10 text-gray-500/50" />
              <p className="mt-3 text-gray-500">No articles awaiting review</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {articles.map((article) => (
              <Card key={article.id}>
                <CardHeader>
                  <CardTitle className="text-base">{article.title}</CardTitle>
                  <CardDescription className="flex items-center gap-3">
                    <span>{article.wordCount?.toLocaleString()} words</span>
                    <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                  </CardDescription>
                  {article.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {article.keywords.slice(0, 3).map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-3 text-sm text-gray-500">
                    {stripHtml(article.content || "").slice(0, 200)}...
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleArticleAction(article.id, "approve")}
                      disabled={actionLoading === `${article.id}-approve`}
                    >
                      {actionLoading === `${article.id}-approve` ? (
                        <Loader2 className="mr-1 size-3 animate-spin" />
                      ) : (
                        <Check className="mr-1 size-3" />
                      )}
                      Approve
                    </Button>

                    <Dialog
                      open={rejectId === article.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setRejectId(null);
                          setRejectReason("");
                        }
                      }}
                    >
                      <DialogTrigger >
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectId(article.id)}
                        >
                          <X className="mr-1 size-3" />
                          Reject
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Article</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Reason</Label>
                            <Textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Provide a reason for rejection..."
                            />
                          </div>
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() =>
                              handleArticleAction(article.id, "reject", { reason: rejectReason })
                            }
                            disabled={actionLoading === `${article.id}-reject`}
                          >
                            {actionLoading === `${article.id}-reject` && (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            )}
                            Confirm Reject
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/articles/${article.id}`)}
                    >
                      <Eye className="mr-1 size-3" />
                      View Full
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Optimization Tasks */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1a1a2e]">
          <Wrench className="size-5" />
          Optimization Tasks ({optimizations.length})
        </h2>

        {optimizations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wrench className="size-10 text-gray-500/50" />
              <p className="mt-3 text-gray-500">No optimization tasks needing review</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {optimizations.map((opt) => (
              <Card key={opt.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{opt.title}</CardTitle>
                    <Badge variant="outline">{opt.type.replace("_", " ")}</Badge>
                  </div>
                  <CardDescription>{opt.articleTitle}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/optimizations")}
                  >
                    Review in Optimizations
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
