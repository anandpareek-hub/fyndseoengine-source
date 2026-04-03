import OpenAI from "openai";

const openai = new OpenAI();

interface WriterInput {
  title: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  brief: string;
  cluster: string;
}

interface ScrapedProduct {
  name: string;
  url: string;
  image: string;
}

interface SiteContext {
  name?: string;
  description?: string;
  domain: string;
  brandVoice: string;
  targetAudience: string;
  industry: string;
  interlinkUrls?: string[];
  productUrls?: string[];
  collectionUrls?: string[];
  scrapedProducts?: ScrapedProduct[];
}

interface ArticleOutput {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  contentMarkdown: string;
  sections: { heading: string; anchor: string }[];
  faqItems: { question: string; answer: string }[];
  keywords: string[];
  wordCount: number;
}

function extractSections(html: string): { heading: string; anchor: string }[] {
  const sections: { heading: string; anchor: string }[] = [];
  const h2Regex = /<h2[^>]*id=["']([^"']+)["'][^>]*>(.*?)<\/h2>/gi;
  let match;
  while ((match = h2Regex.exec(html)) !== null) {
    sections.push({ heading: match[2].replace(/<[^>]+>/g, "").trim(), anchor: match[1] });
  }
  return sections;
}

function extractFaqItems(html: string): { question: string; answer: string }[] {
  const items: { question: string; answer: string }[] = [];
  const faqMatch = html.match(/<section[^>]*class=["']faq["'][^>]*>([\s\S]*?)<\/section>/i);
  if (!faqMatch) return items;
  const h3Regex = /<h3[^>]*>(.*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = h3Regex.exec(faqMatch[1])) !== null) {
    items.push({ question: match[1].replace(/<[^>]+>/g, "").trim(), answer: match[2].replace(/<[^>]+>/g, "").trim() });
  }
  return items;
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<li>(.*?)<\/li>/gi, "- $1")
    .replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, "> $1")
    .replace(/<\/?(p|ul|ol|nav|section|div|table|thead|tbody|tr|th|td|br|h4)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract a readable name from a URL path.
 * e.g., /blog/some-article-title → "Some Article Title"
 */
function nameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const lastSegment = path.split("/").filter(Boolean).pop() || "";
    return lastSegment
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  } catch {
    return url;
  }
}

export async function generateArticle(
  task: WriterInput,
  site: SiteContext
): Promise<ArticleOutput> {
  const brandName = site.name || site.domain.replace(/\.(com|ae|co\.uk|net|org)$/i, "").replace(/^www\./,"");
  const origin = `https://${site.domain}`;

  // Build smart interlink instructions - extract page names from URLs for context
  let interlinkInstructions: string;
  if (site.interlinkUrls && site.interlinkUrls.length > 0) {
    const enrichedUrls = site.interlinkUrls.slice(0, 30).map((url) => {
      try {
        const path = new URL(url).pathname.replace(/\/$/, "");
        const parts = path.split("/").filter(Boolean);
        const name = parts.pop() || "";
        const readable = name.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const section = parts[0] || "";
        return `- ${url} \u2192 ${section ? section + ": " : ""}${readable}`;
      } catch { return `- ${url}`; }
    }).join("\n");
    
    interlinkInstructions = `
INTERNAL LINKING (CRITICAL - you MUST follow this):
Here are real pages on ${site.domain}. Link to 4-6 of the MOST RELEVANT ones:
${enrichedUrls}

LINKING STRATEGY:
- Match article topic to relevant pages intelligently (e.g. article about "makeup tips" MUST link to makeup-related solution pages)
- Use internal links to naturally guide readers toward ${brandName}'s solutions
- The article should educate the reader AND show how ${brandName} solves their problem
- Use descriptive anchor text matching the linked page content
- Do NOT make up URLs - only use ones listed above
- Internal links = plain <a href="URL">text</a> with NO rel attribute`;
  } else {
    interlinkInstructions = `Include 2-3 links to ${origin}/ as the main site link. Do NOT make up URLs.`;
  }

  const prompt = `Write a 1200-1500 word SEO blog post as HTML for ${site.domain} (brand: ${brandName}). YOU MUST WRITE AT LEAST 1200 WORDS — short articles will be rejected and rewritten.

Topic: "${task.title}"
Primary keyword: "${task.targetKeyword}"
Secondary keywords: ${task.secondaryKeywords.join(", ")}
Brief: ${task.brief}
Industry: ${site.industry}
Audience: ${site.targetAudience}

Write as ${brandName}'s content team — use "our", "we". Mention ${brandName} 3-5 times naturally.

BRAND CONNECTION (IMPORTANT):
- This article should educate readers AND naturally connect the topic to ${brandName}'s solutions/services
- If the topic relates to any service/product ${brandName} offers, explain how ${brandName} addresses this need
- Don't be salesy — be informative first, then naturally show how ${brandName} helps
- Use brand context: "${site.description || ""}"
- Brand voice: ${site.brandVoice || "professional and informative"}

${interlinkInstructions}

End with a compelling CTA encouraging readers to explore ${brandName}'s relevant solutions or get in touch.

Return JSON with exactly 5 keys:
{"title":"SEO title 50-65 chars","slug":"url-slug","metaTitle":"meta title 50-60 chars","metaDescription":"150-160 chars with keyword","content":"FULL HTML article"}

The "content" value must be 1200-1500 words of semantic HTML structured as:
1. Intro paragraph (primary keyword in first sentence, no heading)
2. Five to six <h2 id="slug">sections</h2>, each with 2-3 paragraphs and a list or blockquote
3. <section class="faq"><h2 id="faq">FAQ</h2> with 4-5 <h3>Q</h3><p>A</p> pairs</section>
4. Conclusion paragraph with CTA
Do NOT include any product grids, product cards, or shopping-related sections.

Do NOT create a "Table of Contents" / "What You'll Learn" section. Do NOT include a "Key Takeaways" section.

Use <strong> for key terms. Use <p>, <h2>, <h3>, <ul>, <ol>, <li>, <blockquote>. No <h1>, no inline styles, no custom CSS classes. Primary keyword 5-8 times naturally.

OUTPUT FORMAT:
- Clean HTML suitable for Webflow Rich Text fields
- Proper heading hierarchy (H2 for main sections, H3 for subsections and FAQ questions)
- No <div> wrappers with custom classes
- Semantic HTML: p, h2, h3, ul, ol, li, a, strong, em, blockquote, table, thead, tbody, tr, th, td, figure, figcaption

RICH CONTENT RULES (make articles visually engaging and easy to scan):
- Include at least ONE comparison or data table using <table> with <thead> and <tbody> — comparing options, features, stats, pros/cons, etc.
- Use <blockquote> for expert quotes, key insights, or important callouts (1-2 per article)
- Use bullet lists (<ul>) and numbered lists (<ol>) for steps, tips, features — at least 2 lists per article
- Bold key terms and important phrases with <strong>
- Break content into short paragraphs (2-3 sentences max per paragraph)
- Use transition sentences between sections to keep flow
- Include a "Quick Summary" or "At a Glance" section near the top as a bulleted overview
- End with a clear FAQ section (4-6 questions) using H3 for questions and P for answers

LINKING RULES (CRITICAL — follow these exactly):
- INTERNAL links (to ${site.domain}): MUST include at least 4-6 internal links. Use plain <a href="URL">anchor text</a> with NO rel attribute. These are YOUR site pages — they should be dofollow.
- EXTERNAL links (to other domains): Add 1-2 links to authoritative external sources. These MUST use rel="nofollow noopener" target="_blank".
- Use descriptive anchor text (not "click here" or "read more")
- Links should feel natural within the text, spread across the article
- IMPORTANT: Internal links (${site.domain}) = NO rel attribute. External links (other domains) = rel="nofollow noopener" target="_blank".

EVERGREEN CONTENT RULE (CRITICAL):
- NEVER include any year (2023, 2024, 2025, 2026, etc.) in the title, slug, meta title, headings, or content
- Write timeless, evergreen content that doesn't become dated
- Instead of "Best X in 2025", just say "Best X" or "Top X"

TITLE RULES (CRITICAL):
- NEVER start titles with: "Discover", "Unlock", "Unveil", "Explore", "Master", "Navigate", "Embrace", "Demystifying", "Understanding", "A Comprehensive", "The Ultimate", "The Complete", "Everything You Need"
- Good titles are specific and direct: "How Virtual Try-On Cuts Return Rates by 40%" or "5 Ways AR Skin Analysis Beats In-Store Testing"
- Titles should promise a specific benefit or answer a specific question
- Keep titles under 65 characters

OPENING PARAGRAPH RULES (CRITICAL):
- NEVER start with: "Welcome to", "In today's", "In the world of", "In this article", "When it comes to", "In the ever-evolving", "In recent years", "As we all know"
- Start with a bold claim, a surprising stat, a direct question, or a relatable scenario
- Good openings: "Return rates for online beauty products sit around 30%. That's a problem." or "You've probably tried picking foundation online and gotten it completely wrong."
- The first sentence should hook the reader immediately, make them want to read more

ANTI-AI-DETECTION RULES (CRITICAL — follow these or the article will be rejected):
- Vary sentence length DRAMATICALLY: mix 5-word punchy sentences with 25-word detailed ones
- Use contractions always (don't, isn't, we're, it's)
- Have opinions — don't be neutral. Say "we think", "honestly", "the truth is"
- Use simple everyday words. NEVER use: delve, utilize, leverage, comprehensive, crucial, seamless, robust, vibrant, multifaceted, tapestry, synergy, paradigm, cornerstone, realm, landscape, furthermore, moreover, additionally, consequently, nonetheless, paramount, groundbreaking, transformative, innovative, holistic, nuanced, pivotal, compelling, unprecedented, discover, unlock, unveil, explore, navigate, embrace, harness, streamline, empower, elevate, foster, cultivate, spearhead, unleash, cutting-edge, state-of-the-art, game-changing, next-generation, best-in-class, world-class, deep dive, at the end of the day, it goes without saying, needless to say, it's worth noting, it's no secret
- Include 1-2 rhetorical questions per article ("But does it actually matter?")
- Start 2+ sentences with "And" or "But"
- Never list exactly 3 things — use 2, 4, or 5 instead
- NEVER use em-dashes (—) or en-dashes (–). Use commas or periods instead. Zero em-dashes allowed.
- Don't start with grand sweeping statements. Start specific.
- Avoid hedging ("may", "might", "could potentially") — be direct
- Use sentence fragments occasionally for emphasis. Like this.

IMPORTANT: Write the FULL 1200-1500 words. Do not truncate. If under 1200, keep writing more sections and FAQ items.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 16384,
    temperature: 0.8,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are an expert SEO content writer. You write like a real human with personality and opinions. Your articles are well-researched, informative blog posts with proper internal linking and clean HTML structure. You use simple words, contractions, and varied sentence lengths. You write titles that are specific and benefit-driven, never generic AI patterns like 'Discover' or 'The Ultimate Guide'. Your article openings hook readers with bold claims, stats, or relatable scenarios, never 'Welcome to' or 'In today's world'. Write 1200-1500 word articles as clean semantic HTML suitable for Webflow Rich Text fields. No product grids, no shopping CTAs, no e-commerce elements. Respond with valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
  });

  const response = completion.choices[0]?.message?.content || "{}";

  let parsed: { title: string; slug: string; metaTitle: string; metaDescription: string; content: string };
  try {
    parsed = JSON.parse(response);
  } catch (e) {
    console.error("[writer] Failed to parse OpenAI JSON response:", (e as Error).message);
    parsed = { title: "", slug: "", metaTitle: "", metaDescription: "", content: "" };
  }

  // Safety: ensure parsed has content
  if (!parsed.content) {
    console.error("[writer] OpenAI response missing content field, keys:", Object.keys(parsed));
    parsed.content = "<p>Content generation returned empty result.</p>";
  }
  if (!parsed.title) parsed.title = task.title;
  if (!parsed.slug) parsed.slug = task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  if (!parsed.metaTitle) parsed.metaTitle = task.title;
  if (!parsed.metaDescription) parsed.metaDescription = "";

  // Check word count — if too short, make a follow-up call to expand
  const initialText = parsed.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const initialWordCount = initialText.split(/\s+/).filter(Boolean).length;

  if (initialWordCount < 1000) {
    console.log(`[writer] Article too short (${initialWordCount} words), expanding...`);
    const expandCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 16384,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an SEO content writer. You will be given a short article and must expand it to 1200-1500 words while keeping the same structure, tone, and JSON format. Add more detail, examples, and depth to each section. Respond with valid JSON only.",
        },
        {
          role: "user",
          content: `This article is only ${initialWordCount} words. It MUST be at least 1200 words. Expand each section with more paragraphs, details, and examples. Keep the same HTML structure, links, and JSON keys.

Current article JSON:
${response}

Return the same JSON structure with {"title","slug","metaTitle","metaDescription","content"} but with the "content" expanded to at least 1200 words. Keep all existing links and HTML structure. Add more paragraphs to each <h2> section. Expand the FAQ answers to be longer.`,
        },
      ],
    });

    const expandedResponse = expandCompletion.choices[0]?.message?.content || "";
    if (expandedResponse) {
      try {
        const expandedParsed = JSON.parse(expandedResponse) as typeof parsed;
        const expandedText = expandedParsed.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        const expandedWordCount = expandedText.split(/\s+/).filter(Boolean).length;
        console.log(`[writer] Expanded article: ${expandedWordCount} words (was ${initialWordCount})`);
        if (expandedWordCount > initialWordCount) {
          parsed = expandedParsed;
        }
      } catch {
        console.warn("[writer] Failed to parse expanded article, using original");
      }
    }
  }

  // Strip years from title, slug, metaTitle (evergreen content rule)
  const yearPattern = /\s*\b(20\d{2})\b/g;
  parsed.title = parsed.title.replace(yearPattern, "").replace(/\s{2,}/g, " ").trim();
  parsed.slug = parsed.slug.replace(/-?(20\d{2})-?/g, "").replace(/^-|-$/g, "").replace(/--+/g, "-");
  parsed.metaTitle = parsed.metaTitle.replace(yearPattern, "").replace(/\s{2,}/g, " ").trim();
  parsed.metaDescription = parsed.metaDescription.replace(yearPattern, "").replace(/\s{2,}/g, " ").trim();

  const sections = extractSections(parsed.content);
  const faqItems = extractFaqItems(parsed.content);
  const contentMarkdown = htmlToMarkdown(parsed.content);

  const textContent = parsed.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;

  return {
    ...parsed,
    contentMarkdown,
    sections,
    faqItems,
    keywords: [task.targetKeyword, ...task.secondaryKeywords],
    wordCount,
  };
}
