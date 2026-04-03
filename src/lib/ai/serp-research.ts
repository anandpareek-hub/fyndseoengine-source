import OpenAI from "openai";

interface SerpResult {
  title: string;
  link: string;
  snippet: string;
}

interface ResearchResult {
  topResults: SerpResult[];
  competitorAnalysis: string;
  contentGaps: string;
  recommendedAngle: string;
}

/**
 * Search Google using a simple scraping approach and analyze top results.
 * Falls back gracefully if search fails.
 */
export async function researchKeyword(
  keyword: string,
  openaiKey: string,
  domain: string
): Promise<string> {
  try {
    // Step 1: Search Google via scraping
    const searchResults = await searchGoogle(keyword);
    if (searchResults.length === 0) return "";

    // Step 2: Fetch content from top 3 results
    const topPages = await Promise.all(
      searchResults.slice(0, 3).map(async (result) => {
        try {
          const content = await fetchPageContent(result.link);
          return {
            ...result,
            content: content.slice(0, 3000), // First 3000 chars
          };
        } catch {
          return { ...result, content: "" };
        }
      })
    );

    // Step 3: Use AI to analyze competitors and generate research brief
    const openai = new OpenAI({ apiKey: openaiKey });
    
    const competitorInfo = topPages.map((p, i) => {
      return `Result #${i + 1}: "${p.title}"
URL: ${p.link}
Snippet: ${p.snippet}
Content excerpt: ${p.content.slice(0, 1500)}`;
    }).join("\n\n---\n\n");

    const analysisPrompt = `You are an SEO content strategist. Analyze these top 3 Google results for the keyword "${keyword}".

${competitorInfo}

Provide a concise research brief (max 400 words) covering:
1. CONTENT PATTERNS: What topics/subtopics do all top results cover? What is the common structure?
2. CONTENT GAPS: What are the top results missing that we could cover better?
3. TONE & STYLE: How do the top articles write? (formal, casual, data-driven, story-driven?)
4. KEY STATS/FACTS: Any specific data points, statistics, or facts mentioned that we should reference or beat?
5. RECOMMENDED ANGLE: Based on gaps and patterns, what unique angle should our article take to outrank these?
6. MUST-COVER TOPICS: List 5-7 specific subtopics our article MUST include to be competitive.

Our brand domain is ${domain} - if any of our pages already rank, note that.
Be specific and actionable. This brief will be given to a writer.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert SEO analyst. Be concise and actionable." },
        { role: "user", content: analysisPrompt },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const analysis = response.choices[0]?.message?.content || "";
    
    if (!analysis) return "";

    return `\n\n## SERP Research (Top Google Results for "${keyword}")
The following is an analysis of the current top-ranking articles. Use this to write a BETTER, more comprehensive article:

${analysis}

IMPORTANT: Beat these competitors by covering more subtopics, providing better examples, and adding our unique brand perspective.\n`;
    
  } catch (error) {
    console.log(`[serp-research] Failed for "${keyword}":`, error instanceof Error ? error.message : error);
    return "";
  }
}

async function searchGoogle(keyword: string): Promise<SerpResult[]> {
  try {
    const query = encodeURIComponent(keyword);
    const res = await fetch(`https://www.google.com/search?q=${query}&num=5&hl=en`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    
    if (!res.ok) return [];
    const html = await res.text();
    
    // Simple regex extraction of search results
    const results: SerpResult[] = [];
    const titleRegex = /<h3[^>]*>(.*?)<\/h3>/g;
    const linkRegex = /<a[^>]*href="\/url\?q=([^&"]+)/g;
    const snippetRegex = /<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>(.*?)<\/div>/g;
    
    // Try a simpler approach - extract from the HTML
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);
    
    $("div.g").each((_i, el) => {
      const title = $(el).find("h3").first().text();
      const link = $(el).find("a").first().attr("href") || "";
      const snippet = $(el).find(".VwiC3b, .lEBKkf").first().text();
      
      if (title && link && link.startsWith("http") && !link.includes("google.com")) {
        results.push({ title, link: link.split("&")[0], snippet });
      }
    });
    
    // Fallback: try extracting from href patterns
    if (results.length === 0) {
      const hrefMatches = html.matchAll(/href="\/url\?q=(https?:\/\/[^&"]+)/g);
      for (const match of hrefMatches) {
        const url = decodeURIComponent(match[1]);
        if (!url.includes("google.com") && !url.includes("youtube.com") && results.length < 5) {
          results.push({ title: url, link: url, snippet: "" });
        }
      }
    }
    
    return results.slice(0, 5);
  } catch {
    return [];
  }
}

async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });
    
    if (!res.ok) return "";
    const html = await res.text();
    
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);
    
    // Remove scripts, styles, nav, footer
    $("script, style, nav, footer, header, aside, .sidebar, .menu, .nav").remove();
    
    // Get main content
    const content = $("article, main, .content, .post-content, .entry-content, [role='main']").first().text()
      || $("body").text();
    
    // Clean up whitespace
    return content.replace(/\s+/g, " ").trim().slice(0, 5000);
  } catch {
    return "";
  }
}
