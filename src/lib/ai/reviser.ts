import { askClaude } from "@/lib/ai";

interface ArticleInput {
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
}

interface SiteContext {
  brandVoice: string;
}

interface RevisedArticleOutput {
  title: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  contentMarkdown: string;
  sections: { heading: string; anchor: string }[];
  faqItems: { question: string; answer: string }[];
  keywords: string[];
  wordCount: number;
}

export async function reviseArticle(
  article: ArticleInput,
  revisionNotes: string,
  site: SiteContext
): Promise<RevisedArticleOutput> {
  const response = await askClaude(
    `You are an expert SEO content editor. Revise the following article based on the revision notes.

CURRENT ARTICLE:
- Title: "${article.title}"
- Meta Title: "${article.metaTitle}"
- Meta Description: "${article.metaDescription}"
- Content:
${article.content}

REVISION NOTES:
${revisionNotes}

BRAND VOICE: ${site.brandVoice}

INSTRUCTIONS:
Apply the revision notes to improve the article. This may include:
- Rewriting sections for clarity, engagement, or better keyword integration
- Adding or removing sections as instructed
- Improving the meta title and description
- Fixing tone or voice issues
- Strengthening weak arguments or adding supporting evidence
- Improving readability and flow
- Adding or refining FAQ items

Preserve what works well in the original. Only change what the revision notes call for, plus any obvious improvements you notice.

Return a JSON object (no markdown code blocks, no extra text) with these exact keys:
1. "title": The revised article title
2. "metaTitle": Revised SEO meta title (50-60 chars)
3. "metaDescription": Revised meta description (150-160 chars)
4. "content": The full revised article as clean HTML (no H1 tag — title serves as H1)
5. "contentMarkdown": The same revised content in Markdown format
6. "sections": Array of {"heading", "anchor"} for each H2/H3
7. "faqItems": Array of {"question", "answer"} — 4-6 items
8. "keywords": Array of all keywords used
9. "wordCount": Approximate word count

Return ONLY the JSON object.`,
    {
      maxTokens: 8192,
      temperature: 0.6,
      system:
        "You are a meticulous SEO content editor. You improve articles while preserving their strengths. You have a keen eye for readability, keyword optimization, and user engagement. You always respond with valid JSON only — no markdown code blocks, no explanations.",
    }
  );

  let cleaned = response.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(cleaned) as RevisedArticleOutput;
}
