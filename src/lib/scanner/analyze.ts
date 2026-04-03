import { askClaudeJSON } from "@/lib/ai";
import type { HomepageData } from "./homepage";
import type { SitemapData } from "./sitemap";
import type { AboutData } from "./about";

export interface WebsiteAnalysis {
  name: string;
  description: string;
  products: string[];
  targetAudience: string;
  industry: string;
  competitors: string[];
  brandVoice: string;
  suggestedKeywords: string[];
  contentGaps: string[];
}

export async function analyzeWebsite(
  url: string,
  homepage: HomepageData,
  sitemap: SitemapData,
  about: AboutData,
  apiKey?: string
): Promise<WebsiteAnalysis> {
  const prompt = `Analyze this website and return a JSON object describing the business.

WEBSITE URL: ${url}

HOMEPAGE DATA:
- Title: ${homepage.title}
- Meta Description: ${homepage.metaDescription}
- OG Title: ${homepage.ogTitle}
- OG Description: ${homepage.ogDescription}
- Headings: ${homepage.headings.map((h) => `${h.level}: ${h.text}`).join("\n")}
- Navigation Links: ${homepage.navLinks.map((l) => `${l.text} (${l.href})`).join(", ")}
- Key Body Text:
${homepage.bodyText.slice(0, 10).join("\n---\n")}

SITEMAP DATA:
- Total URLs: ${sitemap.totalUrls}
- Content Categories: ${JSON.stringify(sitemap.categories)}
- Sample URLs: ${sitemap.sampleUrls.map((s) => `[${s.category}] ${s.url}`).join("\n")}

ABOUT PAGE:
- URL: ${about.aboutUrl || "Not found"}
- Description: ${about.companyDescription.slice(0, 1000)}
- Mission: ${about.missionStatement}

Return ONLY a JSON object with these exact fields:
{
  "name": "Company Name",
  "description": "2-3 sentence description of what this company does, its main value proposition",
  "products": ["Product 1", "Product 2", "Service 1"],
  "targetAudience": "Who their ideal customers are",
  "industry": "Primary industry/vertical",
  "competitors": ["Competitor 1", "Competitor 2", "Competitor 3"],
  "brandVoice": "Description of their communication tone and style",
  "suggestedKeywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5", "keyword 6", "keyword 7", "keyword 8", "keyword 9", "keyword 10"],
  "contentGaps": ["Gap 1: what's missing from their content strategy", "Gap 2: ..."]
}

Be specific and detailed. For competitors, infer from the industry even if not explicitly mentioned. For keywords, suggest high-intent search terms their target audience would use.`;

  return askClaudeJSON<WebsiteAnalysis>(prompt, {
    maxTokens: 2048,
    temperature: 0.3,
    system: "You are a business analyst and SEO expert. Analyze websites thoroughly and return accurate, actionable JSON data. Always return valid JSON.",
    apiKey,
  });
}
