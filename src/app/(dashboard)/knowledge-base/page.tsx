"use client";

import { useEffect, useState, useCallback } from "react";
import { useSite } from "@/lib/site-context";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, Loader2, File, FileType, BookOpen, Clock } from "lucide-react";
import { toast } from "sonner";

interface KnowledgeAsset {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  summary: string | null;
  tags: string[];
  status: string;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileType,
  docx: FileText,
  txt: File,
  md: BookOpen,
  csv: File,
};

export default function KnowledgeBasePage() {
  const { currentSite } = useSite();
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fetchAssets = useCallback(async () => {
    if (!currentSite?.id) return;
    try {
      const res = await fetch(`/api/knowledge?siteId=${currentSite.id}`);
      const data = await res.json();
      if (Array.isArray(data)) setAssets(data);
    } catch {
      toast.error("Failed to load knowledge base");
    }
    setLoading(false);
  }, [currentSite?.id]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  async function handleUpload(files: FileList | File[]) {
    if (!currentSite?.id) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const allowed = [".pdf", ".docx", ".txt", ".md", ".csv"];
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowed.includes(ext)) {
        toast.error(`Unsupported file: ${file.name}. Use PDF, DOCX, TXT, MD, or CSV.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("siteId", currentSite.id);

      try {
        const res = await fetch("/api/knowledge/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          toast.success(`Uploaded ${file.name}`);
        } else {
          const data = await res.json();
          toast.error(`Failed: ${data.error || file.name}`);
        }
      } catch {
        toast.error(`Upload failed: ${file.name}`);
      }
    }

    setUploading(false);
    fetchAssets();
  }

  async function handleDelete(id: string, fileName: string) {
    if (!confirm(`Delete "${fileName}"?`)) return;
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        toast.success("Deleted");
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload documents to give the AI context about your brand, products, and guidelines.
          This knowledge is used when generating articles.
        </p>
      </div>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver
                ? "border-[#FF5722] bg-[#FFF3E0]"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-[#FF5722] animate-spin" />
                <p className="text-sm font-medium text-[#1a1a2e]">Processing files...</p>
                <p className="text-xs text-gray-500">Extracting text and generating summaries</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-[#1a1a2e]">
                    Drop files here or click to upload
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, DOCX, TXT, MD, CSV — up to 10MB each
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.md,.csv"
                    className="hidden"
                    onChange={(e) => e.target.files && handleUpload(e.target.files)}
                  />
                  <span className="inline-flex items-center gap-2 rounded-lg bg-[#FF5722] px-4 py-2 text-sm font-medium text-white hover:bg-[#E64A19] transition-colors">
                    <Upload className="w-4 h-4" />
                    Choose Files
                  </span>
                </label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assets List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Uploaded Documents</CardTitle>
          <CardDescription>
            {assets.length} document{assets.length !== 1 ? "s" : ""} in your knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-[#FF5722] animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No documents yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Upload brand guidelines, product catalogs, style guides, or any reference material
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assets.map((asset) => {
                const Icon = FILE_ICONS[asset.fileType] || File;
                return (
                  <div
                    key={asset.id}
                    className="flex items-start gap-4 rounded-lg border border-gray-100 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[#FFF3E0] shrink-0">
                      <Icon className="w-5 h-5 text-[#FF5722]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a1a2e] truncate">
                        {asset.fileName}
                      </p>
                      {asset.summary && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {asset.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-medium uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {asset.fileType}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {formatBytes(asset.fileSize)}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(asset.createdAt)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(asset.id, asset.fileName)}
                      className="text-gray-400 hover:text-red-500 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
