import { askClaudeJSON } from "@/lib/ai";

interface ArticleData {
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  targetKeyword: string;
  publishedAt: string;
  wordCount: number;
}

interface PerformanceData {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface ResearchData {
  competitorInsights?: string;
  contentGaps?: string[];
  trendingTopics?: string[];
  newPAAQuestions?: string[];
  freshnessIssues?: string[];
}

interface OptimizationTask {
  type:
    | "rewrite_section"
    | "expand_content"
    | "update_meta"
    | "add_faq"
    | "add_section"
    | "update_stats"
    | "create_supporting";
  title: string;
  suggestion: string;
  changeSize: "small" | "medium" | "large";
  priority: number;
}

interface OptimizationResult {
  tasks: OptimizationTask[];
}

export async function analyzeAndOptimize(
  article: ArticleData,
  performance: PerformanceData[],
  research: ResearchData
): Promise<OptimizationResult> {
  const avgPosition =
    performance.length > 0
      ? performance.reduce((sum, p) => sum + p.position, 0) / performance.length
      : 0;
  const avgCTR =
    performance.length > 0
      ? performance.reduce((sum, p) => sum + p.ctr, 0) / performance.length
      : 0;
  const totalClicks = performance.reduce((sum, p) => sum + p.clicks, 0);
  const totalImpressions = performance.reduce((sum, p) => sum + p.impressions, 0);

  const daysSincePublished = Math.floor(
    (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return askClaudeJSON<OptimizationResult>(
    `You are an expert SEO optimization analyst. Analyze this article's performance and generate specific, actionable optimization tasks.

ARTICLE:
- Title: "${article.title}"
- Target Keyword: "${article.targetKeyword}"
- Meta Title: "${article.metaTitle}"
- Meta Description: "${article.metaDescription}"
- Word Count: ${article.wordCount}
- Published: ${article.publishedAt} (${daysSincePublished} days ago)

PERFORMANCE METRICS (last ${performance.length} data points):
- Average Position: ${avgPosition.toFixed(1)}
- Average CTR: ${(avgCTR * 100).toFixed(2)}%
- Total Clicks: ${totalClicks}
- Total Impressions: ${totalImpressions}
${performance.length > 1 ? `- Position Trend: ${performance[0].position > performance[performance.length - 1].position ? "IMPROVING" : "DECLINING"} (${performance[0].position.toFixed(1)} → ${performance[performance.length - 1].position.toFixed(1)})` : ""}

MARKET RESEARCH:
${research.competitorInsights ? `- Competitor Insights: ${research.competitorInsights}` : ""}
${research.contentGaps?.length ? `- Content Gaps: ${research.contentGaps.join("; ")}` : ""}
${research.trendingTopics?.length ? `- Trending Topics: ${research.trendingTopics.join("; ")}` : ""}
${research.newPAAQuestions?.length ? `- New PAA Questions: ${research.newPAAQuestions.join("; ")}` : ""}
${research.freshnessIssues?.length ? `- Freshness Issues: ${research.freshnessIssues.join("; ")}` : ""}

ARTICLE CONTENT:
${article.content.substring(0, 3000)}${article.content.length > 3000 ? "\n...[truncated]" : ""}

ANALYSIS FRAMEWORK:
1. **Position Analysis**: If avg position is 4-10, the article is close to top 3 — identify what would push it up. If 11-20, it needs significant improvements. If 20+, it may need a complete overhaul or the keyword strategy is wrong.

2. **CTR Analysis**: Compare CTR to position benchmarks (pos 1: ~30%, pos 2: ~15%, pos 3: ~10%, pos 4-5: ~5-7%, pos 6-10: ~2-4%). If CTR is below benchmark, meta title/description need work.

3. **Content Freshness**: Articles older than 90 days should be checked for outdated statistics, examples, or references.

4. **Content Depth**: Compare word count and topic coverage against what ranking competitors would have. Identify missing subtopics.

5. **Supporting Content**: Identify opportunities for new supporting articles that could boost the cluster.

Generate 3-8 optimization tasks. Each task must have:
- "type": One of "rewrite_section", "expand_content", "update_meta", "add_faq", "add_section", "update_stats", "create_supporting"
- "title": Short descriptive title for the task
- "suggestion": Detailed, actionable description of what to change and why. Be specific — mention exact sections, keywords, or data points.
- "changeSize": "small" (< 30 min), "medium" (30-60 min), "large" (1-2 hours)
- "priority": 1-10 (10 = most impactful, do first)

Prioritize tasks by expected ranking impact. Quick wins (meta updates, adding FAQs) should have high priority if they can move the needle.

Return JSON with key: "tasks" (array of task objects).`,
    {
      maxTokens: 4096,
      temperature: 0.5,
      system:
        "You are a data-driven SEO optimization specialist. You analyze performance metrics and content quality to generate high-impact optimization recommendations. Every suggestion must be specific and actionable. Respond ONLY with valid JSON.",
    }
  );
}
