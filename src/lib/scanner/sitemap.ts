import * as cheerio from "cheerio";

export interface SitemapData {
  sitemapUrl: string | null;
  totalUrls: number;
  categories: Record<string, number>;
  sampleUrls: { category: string; url: string }[];
}

const SITEMAP_PATHS = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap/sitemap.xml", "/sitemap.xml.gz"];

export async function scanSitemap(baseUrl: string): Promise<SitemapData> {
  const origin = new URL(baseUrl).origin;

  for (const path of SITEMAP_PATHS) {
    try {
      const url = origin + path;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SEOAutopilot/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;

      const xml = await res.text();
      if (!xml.includes("<urlset") && !xml.includes("<sitemapindex")) continue;

      const urls = parseSitemapUrls(xml);

      if (xml.includes("<sitemapindex")) {
        const childUrls = parseChildSitemaps(xml);
        for (const childUrl of childUrls.slice(0, 3)) {
          try {
            const childRes = await fetch(childUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (compatible; SEOAutopilot/1.0)" },
              signal: AbortSignal.timeout(10000),
            });
            if (childRes.ok) {
              const childXml = await childRes.text();
              urls.push(...parseSitemapUrls(childXml));
            }
          } catch { /* skip */ }
        }
      }

      const categories = categorizeUrls(urls, origin);
      const sampleUrls: { category: string; url: string }[] = [];
      for (const [cat] of Object.entries(categories)) {
        const matching = urls.filter((u) => categorizeUrl(u, origin) === cat);
        for (const u of matching.slice(0, 3)) sampleUrls.push({ category: cat, url: u });
      }

      return { sitemapUrl: url, totalUrls: urls.length, categories, sampleUrls: sampleUrls.slice(0, 30) };
    } catch { continue; }
  }

  return { sitemapUrl: null, totalUrls: 0, categories: {}, sampleUrls: [] };
}

function parseSitemapUrls(xml: string): string[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls: string[] = [];
  $("url > loc").each((_, el) => { urls.push($(el).text().trim()); });
  return urls;
}

function parseChildSitemaps(xml: string): string[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const urls: string[] = [];
  $("sitemap > loc").each((_, el) => { urls.push($(el).text().trim()); });
  return urls;
}

function categorizeUrl(url: string, origin: string): string {
  const path = url.replace(origin, "").toLowerCase();
  if (path.includes("/blog") || path.includes("/post") || path.includes("/article")) return "blog";
  if (path.includes("/product") || path.includes("/shop") || path.includes("/item")) return "products";
  if (path.includes("/doc") || path.includes("/guide") || path.includes("/help")) return "docs";
  if (path.includes("/case-stud") || path.includes("/customer") || path.includes("/success")) return "case_studies";
  if (path.includes("/about") || path.includes("/team") || path.includes("/company")) return "company";
  if (path.includes("/pricing") || path.includes("/plan")) return "pricing";
  if (path.includes("/career") || path.includes("/job")) return "careers";
  return "other";
}

function categorizeUrls(urls: string[], origin: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const url of urls) {
    const cat = categorizeUrl(url, origin);
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}
