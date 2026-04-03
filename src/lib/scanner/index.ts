import { scanHomepage, type HomepageData } from "./homepage";
import { scanSitemap, type SitemapData } from "./sitemap";
import { scanAboutPage, type AboutData } from "./about";
import { analyzeWebsite, type WebsiteAnalysis } from "./analyze";

export interface ScanResult {
  homepage: HomepageData;
  sitemap: SitemapData;
  about: AboutData;
  analysis: WebsiteAnalysis;
}

export async function scanWebsite(url: string, openaiApiKey?: string): Promise<ScanResult> {
  if (!url.startsWith("http")) url = "https://" + url;
  const normalized = new URL(url).origin;

  const homepage = await scanHomepage(normalized);

  const [sitemap, about] = await Promise.all([
    scanSitemap(normalized),
    scanAboutPage(normalized, homepage.navLinks),
  ]);

  const analysis = await analyzeWebsite(normalized, homepage, sitemap, about, openaiApiKey);

  return { homepage, sitemap, about, analysis };
}

export type { HomepageData, SitemapData, AboutData, WebsiteAnalysis };
