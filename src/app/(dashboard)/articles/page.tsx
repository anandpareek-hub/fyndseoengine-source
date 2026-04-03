"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSite } from "@/lib/site-context";
import { Card, CardContent } from "@/components/ui/card";
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
import { FileText, Loader2 } from "lucide-react";

type Article = {
  id: string;
  title: string;
  status: string;
  wordCount: number;
  keywords: string[];
  createdAt: string;
};

const statusConfig: Record<string, { label: string; className: string }> = {
  generating: { label: "Generating...", className: "bg-orange-50 text-orange-600 border-orange-200 animate-pulse" },
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600 border-gray-200" },
  in_review: { label: "In Review", className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  published: { label: "Published", className: "bg-[#FFF3E0] text-[#FF5722] border-[#FF5722]/20" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-700 border-red-200" },
  qa_failed: { label: "QA Failed", className: "bg-red-50 text-red-600 border-red-200" },
};

const tabs = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

export default function ArticlesPage() {
  const { currentSite } = useSite();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const fetchArticles = async () => {
    if (!currentSite) return;
    try {
      const statusParam = activeTab === "all" ? "" : `&status=${activeTab}`;
      const res = await fetch(`/api/articles?siteId=${currentSite.id}${statusParam}`);
      if (res.ok) {
        setArticles(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch articles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentSite) return;
    setLoading(true);
    fetchArticles();
  }, [currentSite, activeTab]);

  // Auto-refresh every 10s while any article is generating
  useEffect(() => {
    const hasGenerating = articles.some((a) => a.status === "generating");
    if (!hasGenerating) return;
    const interval = setInterval(fetchArticles, 10000);
    return () => clearInterval(interval);
  }, [articles]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Articles</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your content pipeline
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
            ) : articles.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileText className="size-12 text-gray-500/50" />
                  <p className="mt-4 text-lg font-medium text-gray-500">
                    No articles found
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Articles will appear here as they are generated from your goals.
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
                        <TableHead>Status</TableHead>
                        <TableHead>Words</TableHead>
                        <TableHead>Keywords</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {articles.map((article) => {
                        const sc = statusConfig[article.status] || statusConfig.draft;
                        return (
                          <TableRow
                            key={article.id}
                            className="cursor-pointer"
                            onClick={() => router.push(`/articles/${article.id}`)}
                          >
                            <TableCell className="font-medium">{article.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={sc.className}>
                                {sc.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {article.wordCount?.toLocaleString() || "--"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {(article.keywords || []).slice(0, 2).map((kw, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {kw}
                                  </Badge>
                                ))}
                                {(article.keywords || []).length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{article.keywords.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {new Date(article.createdAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
