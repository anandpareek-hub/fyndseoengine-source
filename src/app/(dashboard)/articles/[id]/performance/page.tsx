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
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";

type PerformanceEntry = {
  id: string;
  week: string;
  targetKeyword: string;
  position: number | null;
  trafficEstimate: number | null;
  keywordDifficulty: number | null;
  competitorCount: number | null;
  serpFeatures: string[] | null;
  topCompetitors: { domain: string; position: number }[] | null;
};

type ArticleInfo = {
  id: string;
  title: string;
  status: string;
};

function positionColor(pos: number | null): string {
  if (pos == null) return "text-gray-400";
  if (pos <= 3) return "text-green-600 font-semibold";
  if (pos <= 10) return "text-emerald-600";
  if (pos <= 20) return "text-yellow-600";
  return "text-red-600";
}

function TrendIcon({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return <Minus className="size-4 text-gray-400" />;
  if (current < previous) return <TrendingUp className="size-4 text-green-600" />;
  if (current > previous) return <TrendingDown className="size-4 text-red-500" />;
  return <Minus className="size-4 text-gray-400" />;
}

export default function ArticlePerformancePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const [article, setArticle] = useState<ArticleInfo | null>(null);
  const [data, setData] = useState<PerformanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [articleRes, perfRes] = await Promise.all([
          fetch(`/api/articles/${articleId}`),
          fetch(`/api/articles/${articleId}/performance`),
        ]);
        if (articleRes.ok) {
          const a = await articleRes.json();
          setArticle({ id: a.id, title: a.title, status: a.status });
        }
        if (perfRes.ok) {
          setData(await perfRes.json());
        }
      } catch (err) {
        console.error("Failed to fetch performance:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [articleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-gray-500" />
      </div>
    );
  }

  // Group by keyword
  const byKeyword = new Map<string, PerformanceEntry[]>();
  for (const entry of data) {
    const kw = entry.targetKeyword;
    if (!byKeyword.has(kw)) byKeyword.set(kw, []);
    byKeyword.get(kw)!.push(entry);
  }

  // Latest stats
  const latest = data[0];
  const previous = data[1];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push(`/articles/${articleId}`)} className="mb-2">
        <ArrowLeft className="mr-2 size-4" />
        Back to Article
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Performance Tracking</h1>
        {article && (
          <p className="mt-1 text-sm text-gray-500">{article.title}</p>
        )}
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart3 className="size-12 text-gray-400" />
            <p className="mt-4 text-lg font-medium text-gray-500">No performance data yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Performance tracking starts after the article is published and tracked by the cron system.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription className="text-gray-500">Current Position</CardDescription>
                <CardTitle className={`text-3xl ${positionColor(latest?.position ?? null)}`}>
                  {latest?.position != null ? `#${latest.position}` : "--"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="flex items-center gap-2 text-gray-500">
                  Position Trend
                  <TrendIcon current={latest?.position ?? null} previous={previous?.position ?? null} />
                </CardDescription>
                <CardTitle className="text-3xl text-[#1a1a2e]">
                  {latest?.position != null && previous?.position != null
                    ? `${previous.position > latest.position ? "+" : ""}${(previous.position - latest.position).toFixed(1)}`
                    : "--"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="text-gray-500">Est. Traffic</CardDescription>
                <CardTitle className="text-3xl text-[#1a1a2e]">
                  {latest?.trafficEstimate?.toLocaleString() ?? "--"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription className="text-gray-500">Keyword Difficulty</CardDescription>
                <CardTitle className="text-3xl text-[#1a1a2e]">
                  {latest?.keywordDifficulty != null ? `${latest.keywordDifficulty}/100` : "--"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Position History Table */}
          <Card>
            <CardHeader>
              <CardTitle>Position History</CardTitle>
              <CardDescription>Weekly ranking data per keyword</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Traffic Est.</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Competitors</TableHead>
                    <TableHead>SERP Features</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-gray-500">
                        {new Date(entry.week).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{entry.targetKeyword}</TableCell>
                      <TableCell className={positionColor(entry.position)}>
                        {entry.position != null ? `#${entry.position}` : "--"}
                      </TableCell>
                      <TableCell>{entry.trafficEstimate?.toLocaleString() ?? "--"}</TableCell>
                      <TableCell>{entry.keywordDifficulty ?? "--"}</TableCell>
                      <TableCell>{entry.competitorCount ?? "--"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(entry.serpFeatures || []).slice(0, 3).map((f, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top Competitors */}
          {latest?.topCompetitors && latest.topCompetitors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Competitors</CardTitle>
                <CardDescription>Sites ranking for the same keyword</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(latest.topCompetitors as { domain: string; position: number }[]).map((comp, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{comp.domain}</TableCell>
                        <TableCell className={positionColor(comp.position)}>
                          #{comp.position}
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
