"use client";

import { useEffect, useState, useCallback } from "react";
import { useSite } from "@/lib/site-context";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Upload,
  Trash2,
  ExternalLink,
  FileText,
} from "lucide-react";

type MonitoredPage = {
  id: string;
  url: string;
  pageType: string;
  title: string | null;
  targetKeywords: string[];
  currentPosition: number | null;
  lastCheckedAt: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { optimizationTasks: number };
};

const PAGE_TYPES = [
  "home",
  "listing",
  "collection",
  "product",
  "category",
  "custom",
];

const pageTypeColors: Record<string, string> = {
  home: "bg-blue-50 text-blue-700 border-blue-200",
  listing: "bg-purple-50 text-purple-700 border-purple-200",
  collection: "bg-cyan-50 text-cyan-700 border-cyan-200",
  product: "bg-green-50 text-green-700 border-green-200",
  category: "bg-orange-50 text-orange-700 border-orange-200",
  custom: "bg-gray-100 text-gray-600 border-gray-200",
};

function positionColor(pos: number | null): string {
  if (pos === null) return "text-gray-500";
  if (pos < 10) return "text-green-600";
  if (pos <= 30) return "text-yellow-600";
  return "text-red-600";
}

export default function MonitoredPagesPage() {
  const { currentSite } = useSite();
  const [pages, setPages] = useState<MonitoredPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add form state
  const [newUrl, setNewUrl] = useState("");
  const [newPageType, setNewPageType] = useState("custom");
  const [newTitle, setNewTitle] = useState("");
  const [newKeywords, setNewKeywords] = useState("");

  // Import form state
  const [importUrls, setImportUrls] = useState("");
  const [importPageType, setImportPageType] = useState("custom");

  const fetchPages = useCallback(async () => {
    if (!currentSite) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/pages?siteId=${currentSite.id}`);
      if (res.ok) {
        setPages(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch pages:", err);
    } finally {
      setLoading(false);
    }
  }, [currentSite]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  async function handleAdd() {
    if (!currentSite || !newUrl.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: currentSite.id,
          url: newUrl.trim(),
          pageType: newPageType,
          title: newTitle.trim() || undefined,
          targetKeywords: newKeywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        setNewUrl("");
        setNewPageType("custom");
        setNewTitle("");
        setNewKeywords("");
        fetchPages();
      }
    } catch (err) {
      console.error("Failed to add page:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImport() {
    if (!currentSite || !importUrls.trim()) return;
    setSubmitting(true);
    try {
      const urls = importUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean)
        .map((url) => ({ url, pageType: importPageType }));

      const res = await fetch("/api/pages/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: currentSite.id, urls }),
      });
      if (res.ok) {
        setImportOpen(false);
        setImportUrls("");
        setImportPageType("custom");
        fetchPages();
      }
    } catch (err) {
      console.error("Failed to import pages:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/pages/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPages((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete page:", err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleActive(page: MonitoredPage) {
    try {
      const res = await fetch(`/api/pages/${page.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !page.isActive }),
      });
      if (res.ok) {
        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id ? { ...p, isActive: !p.isActive } : p
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle page:", err);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Monitored Pages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and optimize individual pages across your site
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger>
              <Button variant="outline">
                <Upload className="mr-2 size-4" />
                Import URLs
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import URLs</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>URLs (one per line)</Label>
                  <Textarea
                    value={importUrls}
                    onChange={(e) => setImportUrls(e.target.value)}
                    placeholder={"/page-1\n/page-2\n/page-3"}
                    rows={8}
                  />
                </div>
                <div>
                  <Label>Page Type</Label>
                  <Select value={importPageType} onValueChange={(val) => { if (val) setImportPageType(val); }}>
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
                <Button onClick={handleImport} disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Import
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger>
              <Button>
                <Plus className="mr-2 size-4" />
                Add Page
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Monitored Page</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>URL</Label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="/my-page"
                  />
                </div>
                <div>
                  <Label>Page Type</Label>
                  <Select value={newPageType} onValueChange={(val) => { if (val) setNewPageType(val); }}>
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
                  <Label>Title (optional)</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Page title"
                  />
                </div>
                <div>
                  <Label>Target Keywords (comma-separated)</Label>
                  <Input
                    value={newKeywords}
                    onChange={(e) => setNewKeywords(e.target.value)}
                    placeholder="keyword 1, keyword 2"
                  />
                </div>
                <Button onClick={handleAdd} disabled={submitting} className="w-full">
                  {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Add Page
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-gray-500" />
        </div>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="size-12 text-gray-500/50" />
            <p className="mt-4 text-lg font-medium text-gray-500">
              No monitored pages
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Add pages to start tracking their performance and get optimization suggestions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target Keywords</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Last Checked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">
                      <Link
                        href={`/pages/${page.id}`}
                        className="hover:underline"
                      >
                        {page.url}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={pageTypeColors[page.pageType] || ""}
                      >
                        {page.pageType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {page.targetKeywords.slice(0, 3).map((kw) => (
                          <Badge
                            key={kw}
                            variant="outline"
                            className="text-xs"
                          >
                            {kw}
                          </Badge>
                        ))}
                        {page.targetKeywords.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{page.targetKeywords.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono font-medium ${positionColor(page.currentPosition)}`}>
                        {page.currentPosition !== null
                          ? page.currentPosition.toFixed(1)
                          : "--"}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {page.lastCheckedAt
                        ? new Date(page.lastCheckedAt).toLocaleDateString()
                        : "--"}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleActive(page)}
                        className="cursor-pointer"
                      >
                        <Badge
                          variant="outline"
                          className={
                            page.isActive
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }
                        >
                          {page.isActive ? "Active" : "Paused"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {page._count.optimizationTasks}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/pages/${page.id}`}>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="size-3" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(page.id)}
                          disabled={deletingId === page.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {deletingId === page.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
