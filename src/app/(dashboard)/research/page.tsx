"use client";

import { useEffect, useState } from "react";
import { useSite } from "@/lib/site-context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronDown, ChevronRight } from "lucide-react";

type Research = {
  id: string;
  overallAssessment: string;
  contentGaps: string[];
  competitorInsights: string[];
  trendingTopics: string[];
  paaQuestions: string[];
  freshnessIssues: string[];
  createdAt: string;
};

type Article = {
  id: string;
  title: string;
  keywords: string[];
  status: string;
};

type ArticleWithResearch = Article & {
  research: Research | null;
  researchLoading: boolean;
};

export default function ResearchPage() {
  const { currentSite } = useSite();
  const [articles, setArticles] = useState<ArticleWithResearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSite) return;
    async function fetchArticles() {
      try {
        const res = await fetch(`/api/articles?siteId=${currentSite!.id}&status=published`);
        if (res.ok) {
          const data: Article[] = await res.json();
          setArticles(data.map((a) => ({ ...a, research: null, researchLoading: false })));
        }
      } catch (err) {
        console.error("Failed to fetch articles:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
  }, [currentSite]);

  async function toggleExpand(articleId: string) {
    if (expandedId === articleId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(articleId);

    const article = articles.find((a) => a.id === articleId);
    if (article?.research) return;

    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, researchLoading: true } : a))
    );

    try {
      const res = await fetch(`/api/research/${articleId}`);
      if (res.ok) {
        const research = await res.json();
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId ? { ...a, research, researchLoading: false } : a
          )
        );
      } else {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId ? { ...a, research: null, researchLoading: false } : a
          )
        );
      }
    } catch {
      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleId ? { ...a, researchLoading: false } : a
        )
      );
    }
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
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Market Research</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI-powered research insights for your published content
        </p>
      </div>

      {articles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="size-12 text-gray-500/50" />
            <p className="mt-4 text-lg font-medium text-gray-500">No published articles</p>
            <p className="mt-1 text-sm text-gray-500">
              Research data will be available once you have published articles.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => {
            const isExpanded = expandedId === article.id;
            return (
              <Card key={article.id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => toggleExpand(article.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{article.title}</CardTitle>
                      <CardDescription className="mt-1 flex gap-2">
                        {article.keywords?.slice(0, 3).map((kw, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </CardDescription>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="size-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="size-5 text-gray-500" />
                    )}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    {article.researchLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="size-5 animate-spin text-gray-500" />
                      </div>
                    ) : !article.research ? (
                      <p className="py-4 text-center text-sm text-gray-500">
                        No research data available yet. Research runs automatically for published content.
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {article.research.overallAssessment && (
                          <div>
                            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-2">Overall Assessment</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                              {article.research.overallAssessment}
                            </p>
                          </div>
                        )}

                        {article.research.contentGaps?.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-2">Content Gaps</h3>
                            <ul className="space-y-1">
                              {article.research.contentGaps.map((gap, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-600" />
                                  {gap}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {article.research.competitorInsights?.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-2">Competitor Insights</h3>
                            <ul className="space-y-1">
                              {article.research.competitorInsights.map((insight, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-600" />
                                  {insight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {article.research.trendingTopics?.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-2">Trending Topics</h3>
                            <div className="flex flex-wrap gap-2">
                              {article.research.trendingTopics.map((topic, i) => (
                                <Badge key={i} variant="secondary">{topic}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {article.research.paaQuestions?.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-2">People Also Ask</h3>
                            <ul className="space-y-1">
                              {article.research.paaQuestions.map((q, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-purple-600" />
                                  {q}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {article.research.freshnessIssues?.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-[#1a1a2e] mb-2">Freshness Issues</h3>
                            <ul className="space-y-1">
                              {article.research.freshnessIssues.map((issue, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-yellow-600" />
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="text-xs text-gray-500">
                          Last updated: {new Date(article.research.createdAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
