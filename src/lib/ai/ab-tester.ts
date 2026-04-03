import { askClaudeJSON } from "@/lib/ai";

interface ArticleInput {
  title: string;
  metaTitle: string;
  targetKeyword: string;
  contentSummary: string;
}

interface MetaTitleVariant {
  title: string;
  strategy:
    | "curiosity_gap"
    | "power_words"
    | "number_driven"
    | "question"
    | "direct";
}

interface ABTestResult {
  variants: MetaTitleVariant[];
}

export async function generateMetaTitleVariants(
  article: ArticleInput
): Promise<ABTestResult> {
  return askClaudeJSON<ABTestResult>(
    `You are an expert in SEO title optimization and click-through rate improvement. Generate A/B test variants for a meta title.

CURRENT ARTICLE:
- Article Title: "${article.title}"
- Current Meta Title: "${article.metaTitle}"
- Target Keyword: "${article.targetKeyword}"
- Content Summary: ${article.contentSummary}

TASK:
Generate exactly 3 alternative meta title variants using different psychological strategies to maximize CTR from search results. Each variant must:
- Be 50-60 characters long (this is critical for SERP display)
- Include the target keyword "${article.targetKeyword}" naturally (preferably near the start)
- Be meaningfully different from the current meta title and from each other
- Accurately represent the article content (no clickbait that doesn't deliver)

Use 3 of these 5 strategies (pick the 3 most effective for this keyword/content):

1. "curiosity_gap": Create an information gap that compels the click. Hint at valuable information without revealing it. Example patterns: "The X That Y", "Why X Isn't What You Think", "What Nobody Tells You About X"

2. "power_words": Use emotionally charged words that trigger action. Words like: Ultimate, Essential, Proven, Surprising, Critical, Effortless, Guaranteed, Insider, Breakthrough. Example: "The Ultimate Guide to X: Proven Strategies"

3. "number_driven": Lead with a specific number for concrete expectations. Odd numbers and specific numbers (not round) tend to perform better. Example: "7 Proven X Strategies That Boost Y by 43%"

4. "question": Pose a compelling question the searcher wants answered. Match the search intent directly. Example: "Is X Really Worth It? Here's What the Data Shows"

5. "direct": Clear, authoritative, no-nonsense. Best for transactional/navigational intent. Establish expertise immediately. Example: "X: The Complete 2025 Guide for Professionals"

For each variant, provide:
- "title": The meta title text (50-60 characters)
- "strategy": Which strategy was used (one of the 5 listed above)

Return JSON with key "variants" containing an array of exactly 3 variant objects.`,
    {
      maxTokens: 1024,
      temperature: 0.8,
      system:
        "You are a conversion rate optimization specialist who writes meta titles that dramatically improve CTR in search results. You understand search psychology and what makes people click. Respond ONLY with valid JSON.",
    }
  );
}
