import { prisma } from "@/lib/prisma";
import { fetchSitemapUrls as fetchSitemapUrlsFromScraper } from "@/lib/scraper";

export interface SitemapUrl {
  url: string;
  path: string;
  category: string;
}

/**
 * Fetch and store all sitemap URLs for a site.
 * Uses the scraper's fetchSitemapUrls which has curl-impersonate fallback for Cloudflare.
 */
export async function fetchAndStoreSitemap(siteId: string, domain: string): Promise<SitemapUrl[]> {
  const origin = domain.startsWith("http") ? new URL(domain).origin : `https://${domain}`;

  // Use existing scraper function (handles Cloudflare via curl-impersonate)
  const rawUrls = await fetchSitemapUrlsFromScraper(domain, 500);

  // Categorize URLs
  const sitemapUrls: SitemapUrl[] = rawUrls.map((url) => ({
    url,
    path: url.replace(origin, ""),
    category: categorizeUrl(url, origin),
  }));

  // Store in database
  await prisma.site.update({
    where: { id: siteId },
    data: {
      sitemapUrls: JSON.parse(JSON.stringify(sitemapUrls)),
      sitemapFetchedAt: new Date(),
    },
  });

  console.log(`[sitemap] Stored ${sitemapUrls.length} URLs for site ${siteId} (${domain})`);
  return sitemapUrls;
}

/**
 * Get sitemap URLs for a site, fetching if not cached or stale (>7 days).
 */
export async function getSitemapUrls(siteId: string, domain: string): Promise<SitemapUrl[]> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { sitemapUrls: true, sitemapFetchedAt: true },
  });

  if (site?.sitemapUrls && site.sitemapFetchedAt) {
    const ageMs = Date.now() - new Date(site.sitemapFetchedAt).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (ageMs < sevenDays) {
      return site.sitemapUrls as unknown as SitemapUrl[];
    }
  }

  // Fetch fresh
  return fetchAndStoreSitemap(siteId, domain);
}

/**
 * Get interlink-friendly URLs: collections, categories, product pages.
 * Returns up to `limit` URLs most relevant for content interlinking.
 */
export function getInterlinkUrls(sitemapUrls: SitemapUrl[], limit = 50): string[] {
  // Prioritize collection/category pages, then product pages, then blog
  const priority: Record<string, number> = {
    collection: 1,
    category: 1,
    products: 2,
    blog: 3,
    other: 4,
    company: 5,
  };

  return sitemapUrls
    .sort((a, b) => (priority[a.category] || 99) - (priority[b.category] || 99))
    .slice(0, limit)
    .map((u) => u.url);
}

function categorizeUrl(url: string, origin: string): string {
  const path = url.replace(origin, "").toLowerCase();
  if (path.includes("/collection")) return "collection";
  if (path.includes("/category") || path.includes("/categories")) return "category";
  if (path.includes("/product") || path.includes("/shop") || path.includes("/item")) return "products";
  if (path.includes("/blog") || path.includes("/post") || path.includes("/article")) return "blog";
  if (path.includes("/about") || path.includes("/team") || path.includes("/company")) return "company";
  return "other";
}
