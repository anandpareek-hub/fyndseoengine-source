"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/lib/site-context";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Loader2, Globe, ExternalLink } from "lucide-react";

type PublishedArticle = {
  id: string;
  title: string;
  publishedAt: string;
  webflowBlogItemId: string | null;
  publishedUrl: string | null;
  optimizationScore: number | null;
  lastOptimizedAt: string | null;
};

export default function PublishedPage() {
  const { currentSite } = useSite();
  const router = useRouter();
  const [articles, setArticles] = useState<PublishedArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentSite) return;
    async function fetchPublished() {
      try {
        const res = await fetch(`/api/articles?siteId=${currentSite!.id}&status=published`);
        if (res.ok) {
          setArticles(await res.json());
        }
      } catch (err) {
        console.error("Failed to fetch published articles:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPublished();
  }, [currentSite]);

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
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Published Content</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track and manage your live published articles
        </p>
      </div>

      {articles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="size-12 text-gray-500/50" />
            <p className="mt-4 text-lg font-medium text-gray-500">No published articles</p>
            <p className="mt-1 text-sm text-gray-500">
              Articles will appear here once they are published to your site.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Webflow Blog ID</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Optimization Score</TableHead>
                  <TableHead>Last Optimized</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow
                    key={article.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/articles/${article.id}`)}
                  >
                    <TableCell className="font-medium">{article.title}</TableCell>
                    <TableCell className="text-gray-500">
                      {article.publishedAt
                        ? new Date(article.publishedAt).toLocaleDateString()
                        : "--"}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {article.webflowBlogItemId || "--"}
                    </TableCell>
                    <TableCell>
                      {article.publishedUrl ? (
                        <a
                          href={article.publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#FF5722] hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="size-3" />
                          View
                        </a>
                      ) : (
                        <span className="text-gray-500">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {article.optimizationScore != null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 rounded-full bg-muted">
                            <div
                              className={`h-2 rounded-full ${
                                article.optimizationScore >= 80
                                  ? "bg-green-500"
                                  : article.optimizationScore >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${article.optimizationScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500">
                            {article.optimizationScore}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {article.lastOptimizedAt
                        ? new Date(article.lastOptimizedAt).toLocaleDateString()
                        : "--"}
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
