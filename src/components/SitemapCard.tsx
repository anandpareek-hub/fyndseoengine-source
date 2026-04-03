"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, CheckCircle2, Globe, Clock, Link2 } from "lucide-react";
import { toast } from "sonner";

export default function SitemapCard({ siteId }: { siteId: string }) {
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [urlCount, setUrlCount] = useState(0);
  const [totalUrls, setTotalUrls] = useState(0);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/sites/${siteId}/sitemap`);
      const data = await res.json();
      setUrlCount(data.count || 0);
      setTotalUrls(data.totalInSitemap || data.count || 0);
      setFetchedAt(data.fetchedAt || null);
    } catch {}
    setLoading(false);
  }, [siteId]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  async function handleFetch() {
    if (!siteId) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/sitemap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitemapUrl: sitemapUrl.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setUrlCount(data.count);
        setTotalUrls(data.totalInSitemap || data.count);
        setFetchedAt(data.fetchedAt);
        toast.success(`Fetched ${data.count} English URLs from sitemap (${data.totalInSitemap || data.count} total)`);
      } else {
        toast.error(data.error || "Failed to fetch sitemap");
      }
    } catch {
      toast.error("Failed to fetch sitemap");
    }
    setFetching(false);
  }

  const isStale = fetchedAt ? (Date.now() - new Date(fetchedAt).getTime()) > 3 * 24 * 60 * 60 * 1000 : true;

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5" />
          Sitemap
        </CardTitle>
        <CardDescription>
          Fetch your sitemap to enable internal linking in articles. Auto-refreshes every 3 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Sitemap URL (optional)</Label>
          <p className="text-xs text-muted-foreground">
            Leave blank to auto-detect from your domain (tries /sitemap.xml, /sitemap_index.xml)
          </p>
          <div className="flex gap-2">
            <Input
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              placeholder="https://yourdomain.com/sitemap.xml"
              className="flex-1"
            />
            <Button onClick={handleFetch} disabled={fetching}>
              {fetching ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {fetching ? "Fetching..." : "Fetch Sitemap"}
            </Button>
          </div>
        </div>

        {/* Status */}
        {!loading && (
          <div className={`rounded-lg border p-3 ${urlCount > 0 ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-gray-50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {urlCount > 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Globe className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className={`text-sm font-medium ${urlCount > 0 ? "text-emerald-800" : "text-gray-600"}`}>
                    {urlCount > 0 ? `${urlCount} English URLs indexed` + (totalUrls > urlCount ? ` (${totalUrls} total in sitemap)` : "") : "No sitemap fetched yet"}
                  </p>
                  {fetchedAt && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      Last fetched: {formatDate(fetchedAt)}
                      {isStale && <span className="text-amber-600 font-medium ml-1">(stale — click Fetch to refresh)</span>}
                    </p>
                  )}
                </div>
              </div>
              {urlCount > 0 && (
                <p className="text-xs text-gray-400">Used for internal linking</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
