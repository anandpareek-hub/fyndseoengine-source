import { askClaude } from "@/lib/ai";

interface CheckerInput {
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  targetKeyword: string;
  secondaryKeywords: string[];
}

interface CheckerOutput {
  revisedTitle: string;
  revisedMetaTitle: string;
  revisedMetaDescription: string;
  revisedContent: string;
  revisedContentMarkdown: string;
  changes: { section: string; issue: string; fix: string }[];
  factCheckFlags: { claim: string; status: string; suggestion: string }[];
}

export async function checkArticle(
  article: CheckerInput,
  site: { brandVoice: string; industry: string }
): Promise<CheckerOutput> {
  const response = await askClaude(
    `Review and improve this article. Fix SEO issues, remove AI-sounding phrases, improve readability. Keep the article at 1200-1500 words — do NOT shorten it.

Title: ${article.title}
Meta Title: ${article.metaTitle}
Meta Description: ${article.metaDescription}
Target Keyword: ${article.targetKeyword}
Secondary Keywords: ${article.secondaryKeywords.join(", ")}

CONTENT:
${article.content}

Fix these if found:
- AI vocabulary (delve, utilize, leverage, comprehensive, crucial, seamless, robust, vibrant, multifaceted, paramount, groundbreaking, transformative, innovative, holistic, furthermore, moreover, additionally, consequently, nonetheless) — replace with simple everyday words
- AI phrases ("In today's world", "Let's dive in", "It's worth noting", "plays a crucial role", "serves as a", "boasts a") — remove or rewrite
- Too many em-dashes (max 2 per article) — convert to commas
- Hedging language ("may", "might", "could potentially") — make direct
- Neutral tone without opinions — add personality ("we think", "honestly")
- Uniform sentence lengths — vary dramatically (5 words then 25 words)
- Lists of exactly 3 items — change to 2, 4, or 5
- Keyword not in first 100 words or missing from H2s
- Meta title not 50-60 chars or meta description not 150-160 chars
- Made-up statistics (qualify with "studies suggest" or remove)

Return JSON:
{"revisedTitle":"...","revisedMetaTitle":"50-60 chars","revisedMetaDescription":"150-160 chars","revisedContent":"full revised HTML — must be complete, do not truncate","changes":[{"section":"where","issue":"what","fix":"how"}],"factCheckFlags":[{"claim":"...","status":"verified|removed","suggestion":"..."}]}

Return ONLY valid JSON. Apply all fixes in revisedContent.`,
    {
      maxTokens: 8192,
      temperature: 0.5,
      system: "You are an editorial checker. Fix issues in the content and return the full revised HTML. Respond with valid JSON only. Do not shorten the article.",
    }
  );

  let cleaned = response.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(cleaned) as CheckerOutput;
}
