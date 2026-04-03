import { askClaudeJSON } from "@/lib/ai";

interface QAInput {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  wordCount: number;
}

interface QACriteria {
  name: string;
  score: number; // 0-100
  weight: number; // how much this counts toward total
  feedback: string;
  passed: boolean;
}

export interface QAResult {
  overallScore: number; // 0-100 weighted average
  passed: boolean; // overallScore >= 80
  criteria: QACriteria[];
  aiPatterns: string[]; // specific AI patterns detected
  revisionInstructions: string; // if failed, specific instructions for the writer
  summary: string;
}

export async function qaScoreArticle(
  article: QAInput,
  site: { domain: string; industry: string; brandVoice: string }
): Promise<QAResult> {
  return await askClaudeJSON<QAResult>(
    `You are a strict QA scorer for SEO content. Score this article on a 0-100 scale across multiple criteria. Be HARSH — we'd rather reject and improve than publish mediocre content.

ARTICLE:
Title: ${article.title}
Slug: ${article.slug}
Meta Title: ${article.metaTitle} (${article.metaTitle.length} chars)
Meta Description: ${article.metaDescription} (${article.metaDescription.length} chars)
Target Keyword: "${article.targetKeyword}"
Secondary Keywords: ${article.secondaryKeywords.join(", ")}
Word Count: ${article.wordCount}
Domain: ${site.domain}
Industry: ${site.industry}
Brand Voice: ${site.brandVoice}

CONTENT:
${article.content}

SCORE EACH CRITERION (0-100):

1. **seo_optimization** (weight: 20)
   - Primary keyword in first 100 words? In an H2? In meta title? In meta description?
   - Secondary keywords used naturally?
   - Meta title length 50-60 chars?
   - Meta description length 150-160 chars?
   - Proper heading hierarchy?
   - Internal linking opportunities present?
   Score 90+: All SEO boxes checked perfectly
   Score 70-89: Minor SEO gaps
   Score <70: Missing critical SEO elements

2. **content_depth** (weight: 20)
   - Does it comprehensively cover the topic?
   - Are there specific examples, data points, statistics?
   - Does it answer the user's search intent fully?
   - Is the word count adequate (1000-1500 words target)?
   - Are there unique insights not found in generic articles?
   Score 90+: Expert-level depth with unique insights
   Score 70-89: Good depth but could go deeper
   Score <70: Surface-level or generic coverage

3. **readability** (weight: 15)
   - Sentence length variety (mix of short and long)
   - Paragraph length appropriate (3-5 sentences max)
   - Clear transitions between sections
   - Scannable with headers, lists, bold text
   - Grade level 8-10 (accessible but not childish)
   Score 90+: Flows beautifully, easy to read
   Score 70-89: Mostly readable with some rough spots
   Score <70: Hard to read or poorly structured

4. **ai_detection_avoidance** (weight: 25) — MOST IMPORTANT
   Scan for these AI content red flags and penalize heavily:
   - Predictable sentence patterns (same length, same structure)
   - AI cliche phrases: "In today's [X] world", "It's worth noting", "Let's dive in", "In conclusion", "Whether you're a [X] or [Y]", "From [X] to [Y]", "leveraging", "navigating the landscape", "comprehensive guide", "delve", "holistic", "multifaceted", "tapestry"
   - Overly balanced/neutral tone with no personality or opinion
   - Generic examples that could apply to any topic
   - Perfect grammar with zero personality (real humans make stylistic choices)
   - Cookie-cutter structure (intro → 3-5 equal sections → conclusion)
   - Excessive hedging ("may", "might", "could potentially", "it depends")
   - Starting multiple paragraphs/sentences the same way
   - Lists that all follow identical grammatical patterns
   Count every AI pattern found. Each pattern costs 5-10 points.
   Score 90+: Reads completely human, natural, has personality
   Score 70-89: Mostly natural but some AI tells
   Score <70: Obviously AI-generated, would get flagged

5. **eeat_signals** (weight: 10) — Experience, Expertise, Authority, Trust
   - Does it demonstrate first-hand experience or domain knowledge?
   - Are claims backed with evidence or reasoning?
   - Does it cite or reference authoritative sources?
   - Does it have a clear author perspective/point of view?
   Score 90+: Strong EEAT signals throughout
   Score 70-89: Some EEAT signals present
   Score <70: Generic content with no authority signals

6. **brand_voice_match** (weight: 10)
   - Does the tone match: ${site.brandVoice}?
   - Is the vocabulary appropriate for the target audience?
   - Is the formality level correct?
   Score 90+: Perfect brand voice match
   Score 70-89: Close but not quite right
   Score <70: Doesn't match brand voice at all

Return a JSON object:
{
  "overallScore": <weighted average 0-100>,
  "passed": <true if overallScore >= 80>,
  "criteria": [
    {"name": "seo_optimization", "score": <0-100>, "weight": 20, "feedback": "specific feedback", "passed": <score >= 70>},
    {"name": "content_depth", "score": <0-100>, "weight": 20, "feedback": "specific feedback", "passed": <score >= 70>},
    {"name": "readability", "score": <0-100>, "weight": 15, "feedback": "specific feedback", "passed": <score >= 70>},
    {"name": "ai_detection_avoidance", "score": <0-100>, "weight": 25, "feedback": "specific feedback", "passed": <score >= 75>},
    {"name": "eeat_signals", "score": <0-100>, "weight": 10, "feedback": "specific feedback", "passed": <score >= 70>},
    {"name": "brand_voice_match", "score": <0-100>, "weight": 10, "feedback": "specific feedback", "passed": <score >= 70>}
  ],
  "aiPatterns": ["list of specific AI patterns found in the content"],
  "revisionInstructions": "If failed: detailed, specific instructions for the writer to fix the issues. Reference exact sections/sentences. If passed: empty string.",
  "summary": "2-3 sentence summary of the QA assessment"
}

Be brutally honest. This QA gate exists to prevent bad content from reaching human reviewers.`,
    {
      maxTokens: 4096,
      temperature: 0.3,
      system:
        "You are a ruthless QA scorer for SEO content. You score strictly and catch AI-generated content patterns. You never give inflated scores. A score of 80+ means truly publication-ready. You always respond with valid JSON only.",
    }
  );
}
