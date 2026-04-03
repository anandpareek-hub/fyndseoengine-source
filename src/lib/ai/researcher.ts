import { askClaudeJSON } from "@/lib/ai";

interface ArticleData {
  title: string;
  content: string;
  targetKeyword: string;
  metaTitle: string;
  metaDescription: string;
  publishedAt: string;
  wordCount: number;
}

interface ResearchOutput {
  competitorInsights: string;
  contentGaps: string[];
  trendingTopics: string[];
  newPAAQuestions: string[];
  freshnessIssues: string[];
  overallAssessment: string;
}

export async function conductMarketResearch(
  article: ArticleData,
  targetKeyword: string,
  currentPosition: number | null
): Promise<ResearchOutput> {
  return askClaudeJSON<ResearchOutput>(
    `You are an expert SEO market researcher. Conduct a thorough competitive analysis for an article targeting a specific keyword.

ARTICLE UNDER ANALYSIS:
- Title: "${article.title}"
- Target Keyword: "${targetKeyword}"
- Meta Title: "${article.metaTitle}"
- Meta Description: "${article.metaDescription}"
- Word Count: ${article.wordCount}
- Published: ${article.publishedAt}
- Current Position: ${currentPosition !== null ? currentPosition : "Unknown / Not ranking"}

ARTICLE CONTENT (first 3000 chars):
${article.content.substring(0, 3000)}${article.content.length > 3000 ? "\n...[truncated]" : ""}

RESEARCH TASKS:
Based on your deep expertise in SEO and understanding of how search engines evaluate content for the keyword "${targetKeyword}", provide:

1. "competitorInsights" (string): Analyze what top-ranking content for "${targetKeyword}" typically includes. What formats work best? What depth of coverage is expected? What unique angles do top results take? What E-E-A-T signals do they display? How does this article compare? Be specific and actionable in 3-5 sentences.

2. "contentGaps" (array of strings): Identify 3-6 specific subtopics, questions, or content angles that are commonly covered in top-ranking content for this keyword but are MISSING or underserved in this article. Each gap should be a clear, specific topic (not vague).

3. "trendingTopics" (array of strings): Identify 3-5 trending or emerging topics/subtopics within this keyword space that could make the content more current and relevant. Think about recent developments, new tools, updated best practices, or shifts in the industry.

4. "newPAAQuestions" (array of strings): Generate 4-6 "People Also Ask" style questions that searchers looking for "${targetKeyword}" commonly have. Focus on questions NOT already answered in the article. These should be real questions with clear search intent.

5. "freshnessIssues" (array of strings): Identify 2-4 potential freshness issues — outdated statistics, old examples, deprecated tools/methods, or references that may need updating. If the article is recent, note any time-sensitive claims that will age poorly.

6. "overallAssessment" (string): A concise 2-3 sentence overall assessment of the article's competitive position for this keyword, with the single most impactful improvement recommendation.

Return valid JSON with the six keys described above.`,
    {
      maxTokens: 4096,
      temperature: 0.6,
      system:
        "You are a senior SEO researcher and competitive analyst. You have deep knowledge of search engine ranking factors, content quality signals, and competitive landscape analysis. You provide specific, evidence-based insights rather than generic advice. Respond ONLY with valid JSON.",
    }
  );
}
