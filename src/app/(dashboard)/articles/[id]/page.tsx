"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Save,
  Check,
  X,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ShieldX,
  BarChart3,
  Pencil,
  Eye,
  RefreshCw,
  Trash2,
} from "lucide-react";

type Revision = {
  id: string;
  action: string;
  notes: string;
  createdAt: string;
  createdBy: string;
};

type Article = {
  id: string;
  title: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  wordCount: number;
  status: string;
  publishedUrl: string | null;
  webflowBlogItemId: string | null;
  qaScore: number | null;
  qaPassed: boolean | null;
  qaResult: Record<string, unknown> | null;
  pipelineLog: Record<string, unknown>[] | null;
  pipelineAttempts: number;
  siteId: string;
  revisions: Revision[];
  createdAt: string;
  planTask?: { targetKeyword?: string; secondaryKeywords?: string[]; brief?: string; cluster?: string } | null;
};

const statusConfig: Record<string, { label: string; className: string }> = {
  generating: { label: "Generating...", className: "bg-orange-50 text-orange-600 border-orange-200 animate-pulse" },
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200" },
  in_review: { label: "In Review", className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  approved: { label: "Approved", className: "bg-green-50 text-green-700 border-green-200" },
  published: { label: "Published", className: "bg-blue-50 text-blue-700 border-blue-200" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
  revision_requested: { label: "Revision Requested", className: "bg-orange-50 text-orange-700 border-orange-200" },
};

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionsExpanded, setRevisionsExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [slug, setSlug] = useState("");

  // Content editing
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [savingContent, setSavingContent] = useState(false);
  const [rewriting, setRewriting] = useState(false);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const res = await fetch(`/api/articles/${articleId}`);
        if (res.ok) {
          const data = await res.json();
          setArticle(data);
          setMetaTitle(data.metaTitle || "");
          setMetaDescription(data.metaDescription || "");
          setSlug(data.slug || "");
          setEditContent(data.content || "");
        }
      } catch (err) {
        console.error("Failed to fetch article:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchArticle();
  }, [articleId]);

  // Poll for status changes when generating
  useEffect(() => {
    if (article?.status !== "generating" && !rewriting) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/articles/${articleId}`);
        if (res.ok) {
          const data = await res.json();
          setArticle(data);
          setEditContent(data.content || "");
          if (data.status !== "generating") {
            setRewriting(false);
            setMetaTitle(data.metaTitle || "");
            setMetaDescription(data.metaDescription || "");
            setSlug(data.slug || "");
            toast.success("Article generation complete");
          }
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [article?.status, articleId, rewriting]);

  async function handleSave() {
    if (!article) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaTitle, metaDescription, slug }),
      });
      if (res.ok) {
        const updated = await res.json();
        setArticle(updated);
        toast.success("Changes saved");
      } else {
        toast.error("Failed to save changes");
      }
    } catch (err) {
      console.error("Failed to save:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveContent() {
    if (!article) return;
    setSavingContent(true);
    try {
      // Calculate new word count
      const text = editContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const wordCount = text.split(/\s+/).filter(Boolean).length;

      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent, wordCount }),
      });
      if (res.ok) {
        const updated = await res.json();
        setArticle(updated);
        setEditMode(false);
        toast.success("Content saved");
      } else {
        toast.error("Failed to save content");
      }
    } catch (err) {
      console.error("Failed to save content:", err);
      toast.error("Failed to save content");
    } finally {
      setSavingContent(false);
    }
  }

  async function handleRewrite() {
    if (!article) return;
    setRewriting(true);
    try {
      // Update status to generating
      await fetch(`/api/articles/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "generating" }),
      });
      setArticle({ ...article, status: "generating" });

      // Trigger regeneration
      const res = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: article.siteId,
          articleId: article.id,
          title: article.title,
          targetKeyword: article.keywords?.[0] || article.title,
          secondaryKeywords: article.keywords?.slice(1) || [],
          brief: article.planTask?.brief || "",
          cluster: article.planTask?.cluster || "",
          rewrite: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to start rewrite");
        setRewriting(false);
      } else {
        toast.success("Rewriting article...");
      }
    } catch (err) {
      console.error("Failed to rewrite:", err);
      toast.error("Failed to start rewrite");
      setRewriting(false);
    }
  }

  async function handleAction(action: string, body?: Record<string, string>) {
    setActionLoading(action);
    try {
      const endpoint = action === "revision" ? "revise" : action;
      const res = await fetch(`/api/articles/${articleId}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      if (res.ok) {
        const updated = await res.json();
        setArticle(updated);
        setRejectOpen(false);
        setRevisionOpen(false);
        setRejectReason("");
        setRevisionNotes("");
        const labels: Record<string, string> = {
          approve: "Article approved",
          reject: "Article rejected",
          revision: "Revision requested",
          publish: "Published to Webflow",
        };
        toast.success(labels[action] || "Action completed");
      } else {
        toast.error(`Failed to ${action} article`);
      }
    } catch (err) {
      console.error("Failed to perform action:", err);
      toast.error(`Failed to ${action} article`);
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

  if (!article) {
    return (
      <div className="py-20 text-center text-gray-500">Article not found.</div>
    );
  }

  const sc = statusConfig[article.status] || statusConfig.draft;
  const isGenerating = article.status === "generating";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/articles")} className="mb-2">
        <ArrowLeft className="mr-2 size-4" />
        Back to Articles
      </Button>

      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">{article.title}</h1>
        <Badge variant="outline" className={sc.className}>
          {sc.label}
        </Badge>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: Content */}
        <div className="lg:w-3/5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editMode ? "Edit Content" : "Content Preview"}</CardTitle>
                <div className="flex items-center gap-2">
                  {!isGenerating && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (editMode) {
                            setEditContent(article.content || "");
                          }
                          setEditMode(!editMode);
                        }}
                      >
                        {editMode ? (
                          <>
                            <Eye className="mr-1.5 size-3.5" />
                            Preview
                          </>
                        ) : (
                          <>
                            <Pencil className="mr-1.5 size-3.5" />
                            Edit
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRewrite}
                        disabled={rewriting}
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        {rewriting ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1.5 size-3.5" />
                        )}
                        Rewrite
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="size-8 animate-spin text-orange-500 mb-4" />
                  <p className="text-lg font-medium text-gray-700">Generating article...</p>
                  <p className="text-sm text-gray-500 mt-1">This may take 1-2 minutes</p>
                </div>
              ) : editMode ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={25}
                    className="font-mono text-sm"
                    placeholder="HTML content..."
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      Edit the HTML content directly. Use semantic tags: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt;, etc.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditContent(article.content || "");
                          setEditMode(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveContent}
                        disabled={savingContent}
                      >
                        {savingContent ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : (
                          <Save className="mr-1.5 size-3.5" />
                        )}
                        Save Content
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: article.content || "<p>No content yet.</p>" }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: SEO Metadata */}
        <div className="space-y-6 lg:w-2/5">
          <Card>
            <CardHeader>
              <CardTitle>SEO Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={article.title} disabled />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Meta Title</Label>
                <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Meta Description</Label>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Keywords</Label>
                <div className="flex flex-wrap gap-1">
                  {(article.keywords || []).map((kw, i) => (
                    <Badge key={i} variant="secondary">
                      {kw}
                    </Badge>
                  ))}
                  {(!article.keywords || article.keywords.length === 0) && (
                    <span className="text-sm text-gray-500">No keywords</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Word Count</span>
                <span className="font-medium">{article.wordCount?.toLocaleString() || "--"}</span>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* QA Pipeline Score */}
          {article.qaScore != null && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {article.qaPassed ? (
                      <ShieldCheck className="size-5 text-green-600" />
                    ) : (
                      <ShieldX className="size-5 text-red-600" />
                    )}
                    QA Score
                  </CardTitle>
                  <span className={`text-2xl font-bold ${
                    article.qaScore >= 80 ? "text-green-600" :
                    article.qaScore >= 60 ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {article.qaScore}/100
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="outline" className={
                  article.qaPassed
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }>
                  {article.qaPassed ? "QA Passed" : "QA Failed"}
                </Badge>
                {article.qaResult && typeof article.qaResult === "object" && (
                  <div className="space-y-2 text-sm">
                    {Object.entries(article.qaResult as Record<string, unknown>)
                      .filter(([k]) => k !== "overall" && typeof (article.qaResult as Record<string, unknown>)[k] === "number")
                      .map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-gray-500 capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="font-medium">{String(val)}</span>
                        </div>
                      ))}
                  </div>
                )}
                {article.pipelineAttempts > 0 && (
                  <p className="text-xs text-gray-400">
                    Pipeline attempts: {article.pipelineAttempts}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Draft articles can be sent to review */}
              {article.status === "draft" && !isGenerating && (
                <Button
                  className="w-full"
                  onClick={() => handleAction("approve")}
                  disabled={actionLoading === "approve"}
                >
                  {actionLoading === "approve" ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 size-4" />
                  )}
                  Approve
                </Button>
              )}

              {article.status === "in_review" && (
                <>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction("approve")}
                    disabled={actionLoading === "approve"}
                  >
                    {actionLoading === "approve" ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 size-4" />
                    )}
                    Approve
                  </Button>

                  <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                    <DialogTrigger>
                      <Button variant="destructive" className="w-full">
                        <X className="mr-2 size-4" />
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
                            placeholder="Why is this article being rejected?"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleAction("reject", { reason: rejectReason })}
                          disabled={actionLoading === "reject"}
                        >
                          {actionLoading === "reject" && <Loader2 className="mr-2 size-4 animate-spin" />}
                          Confirm Reject
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
                    <DialogTrigger>
                      <Button variant="outline" className="w-full border-orange-300 text-orange-600 hover:bg-orange-50">
                        <RotateCcw className="mr-2 size-4" />
                        Request Revision
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Revision</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Revision Notes</Label>
                          <Textarea
                            value={revisionNotes}
                            onChange={(e) => setRevisionNotes(e.target.value)}
                            placeholder="What changes are needed?"
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => handleAction("revision", { notes: revisionNotes })}
                          disabled={actionLoading === "revision"}
                        >
                          {actionLoading === "revision" && <Loader2 className="mr-2 size-4 animate-spin" />}
                          Submit Revision Request
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {article.status === "approved" && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleAction("publish")}
                  disabled={actionLoading === "publish"}
                >
                  {actionLoading === "publish" ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ExternalLink className="mr-2 size-4" />
                  )}
                  Publish to Webflow
                </Button>
              )}

              {article.status === "published" && (
                <div className="space-y-3 text-sm">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/articles/${articleId}/performance`)}
                  >
                    <BarChart3 className="mr-2 size-4" />
                    View Performance
                  </Button>
                  {article.publishedUrl && (
                    <a
                      href={article.publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#FF5722] hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      View Published Article
                    </a>
                  )}
                  {article.webflowBlogItemId && (
                    <p className="text-gray-500">
                      Webflow Blog Item ID: {article.webflowBlogItemId}
                    </p>
                  )}
                </div>
              )}

              {/* Delete */}
              <div className="border-t pt-3 mt-3">
                {!deleteConfirm ? (
                  <Button
                    variant="ghost"
                    className="w-full text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete Article
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600 text-center">Are you sure? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        disabled={deleting}
                        onClick={async () => {
                          setDeleting(true);
                          try {
                            const res = await fetch(`/api/articles/${articleId}`, { method: "DELETE" });
                            if (res.ok) {
                              toast.success("Article deleted");
                              router.push("/articles");
                            } else {
                              toast.error("Failed to delete article");
                            }
                          } catch {
                            toast.error("Failed to delete article");
                          }
                          setDeleting(false);
                        }}
                      >
                        {deleting ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Revision History */}
      {article.revisions && article.revisions.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setRevisionsExpanded(!revisionsExpanded)}
          >
            <div className="flex items-center justify-between">
              <CardTitle>Revision History ({article.revisions.length})</CardTitle>
              {revisionsExpanded ? (
                <ChevronDown className="size-5 text-gray-500" />
              ) : (
                <ChevronRight className="size-5 text-gray-500" />
              )}
            </div>
          </CardHeader>
          {revisionsExpanded && (
            <CardContent>
              <div className="space-y-4">
                {article.revisions.map((rev) => (
                  <div key={rev.id} className="border-l-2 border-muted pl-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{rev.action}</Badge>
                      <span className="text-gray-500">
                        by {rev.createdBy}
                      </span>
                      <span className="text-gray-500">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {rev.notes && (
                      <p className="mt-1 text-sm text-gray-500">{rev.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
