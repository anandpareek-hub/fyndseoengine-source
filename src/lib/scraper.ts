/**
 * Website scraper — extracts structured content from web pages
 * Used by competitors, customer intelligence, and audit modules
 */

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Extract key content from a single HTML page */
function extractPageContent(html: string, maxBodyChars = 1500): string {
  const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() || "";
  const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i)?.[1]?.trim() || "";
  const metaKeywords = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["'](.*?)["']/i)?.[1]?.trim() || "";
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/i)?.[1]?.trim() || "";
  const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/i)?.[1]?.trim() || "";

  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean).slice(0, 5);
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean).slice(0, 10);

  const navText = [...html.matchAll(/<nav[^>]*>([\s\S]*?)<\/nav>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .join(" ")
    .slice(0, 500);

  const jsonLd = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => {
      try {
        const data = JSON.parse(m[1]);
        return { type: data["@type"], name: data.name, description: data.description?.slice(0, 200), category: data.category };
      } catch { return null; }
    })
    .filter(Boolean)
    .slice(0, 3);

  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxBodyChars);

  const parts = [
    title && `Title: ${title}`,
    metaDesc && `Meta Description: ${metaDesc}`,
    metaKeywords && `Meta Keywords: ${metaKeywords}`,
    ogTitle && ogTitle !== title && `OG Title: ${ogTitle}`,
    ogDesc && ogDesc !== metaDesc && `OG Description: ${ogDesc}`,
    h1s.length > 0 && `H1 Headings: ${h1s.join(", ")}`,
    h2s.length > 0 && `H2 Headings: ${h2s.join(", ")}`,
    navText && `Navigation: ${navText}`,
    jsonLd.length > 0 && `Structured Data: ${JSON.stringify(jsonLd)}`,
    bodyText && `Page Content (excerpt): ${bodyText.slice(0, 800)}`,
  ].filter(Boolean);

  return parts.join("\n");
}

/** Extract internal links from HTML that look like important pages */
function extractInternalLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  const base = new URL(baseUrl);

  // Common important page patterns
  const importantPatterns = [
    /\/(about|about-us|who-we-are)/i,
    /\/(products|collections|shop|store|catalog)/i,
    /\/(services|solutions|offerings)/i,
    /\/(brands|our-brands)/i,
    /\/(categories|departments)/i,
    /\/(blog|news|magazine|journal)/i,
    /\/(contact|contact-us)/i,
    /\/(faq|help|support)/i,
  ];

  const anchors = [...html.matchAll(/<a[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)];

  for (const match of anchors) {
    let href = match[1].trim();
    // Skip external links, javascript, mailto, tel
    if (href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

    try {
      const url = new URL(href, baseUrl);
      // Only same domain
      if (url.hostname !== base.hostname) continue;
      const path = url.pathname.replace(/\/$/, "") || "/";
      if (path === "/" || path === "") continue;
      if (seen.has(path)) continue;
      seen.add(path);

      // Check if it matches important patterns
      if (importantPatterns.some(p => p.test(path))) {
        links.push(url.toString());
      }
    } catch {
      continue;
    }
  }

  return links.slice(0, 5); // Max 5 extra pages
}

/** Fetch using curl-impersonate (Chrome TLS fingerprint) to bypass Cloudflare */
async function fetchWithCurlImpersonate(url: string, timeout = 15000): Promise<string | null> {
  try {
    const { execSync } = require("child_process");
    const timeoutSec = Math.ceil(timeout / 1000);
    const result = execSync(
      `curl_chrome116 -s -L --max-time ${timeoutSec} "${url}"`,
      { encoding: "utf-8", timeout: timeout + 5000, maxBuffer: 10 * 1024 * 1024 }
    );
    // Check if we got HTML (not a Cloudflare challenge page)
    if (result && !result.includes("Attention Required") && !result.includes("cf-browser-verification")) {
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

/** Fetch a single page and return its content — falls back to curl-impersonate on 403 */
async function fetchPage(url: string, timeout = 10000): Promise<{ url: string; html: string } | null> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(timeout),
    });
    if (res.ok) {
      const html = await res.text();
      // Verify it's not a Cloudflare challenge
      if (!html.includes("Attention Required") && !html.includes("cf-browser-verification")) {
        return { url, html };
      }
    }
    // Fallback to curl-impersonate for 403/challenge responses
    const html = await fetchWithCurlImpersonate(url, timeout);
    if (html) return { url, html };
    return null;
  } catch {
    // Fallback to curl-impersonate
    const html = await fetchWithCurlImpersonate(url, timeout);
    if (html) return { url, html };
    return null;
  }
}

/**
 * Scrape a website's homepage and extract content
 */
export async function scrapeHomepage(domain: string): Promise<string> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  const page = await fetchPage(url);
  if (!page) return "";
  return extractPageContent(page.html);
}

/**
 * Scrape a website's homepage + key internal pages for deeper understanding
 * Returns structured content from multiple pages
 */
export async function scrapeWebsite(domain: string): Promise<{ homepage: string; pages: { url: string; content: string }[]; totalChars: number }> {
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;

  console.log(`[scraper] Fetching homepage: ${baseUrl}`);
  const homepageFetch = await fetchPage(baseUrl);

  if (!homepageFetch) {
    return { homepage: "", pages: [], totalChars: 0 };
  }

  const homepageContent = extractPageContent(homepageFetch.html, 2000);
  console.log(`[scraper] Homepage: ${homepageContent.length} chars`);

  // Find important internal pages from homepage links
  const internalLinks = extractInternalLinks(homepageFetch.html, baseUrl);
  console.log(`[scraper] Found ${internalLinks.length} important internal pages: ${internalLinks.join(", ")}`);

  // Fetch internal pages in parallel
  const pageResults = await Promise.all(
    internalLinks.map(link => fetchPage(link, 8000))
  );

  const pages: { url: string; content: string }[] = [];
  for (const result of pageResults) {
    if (!result) continue;
    const content = extractPageContent(result.html, 1000);
    if (content.length > 50) {
      const path = new URL(result.url).pathname;
      pages.push({ url: path, content });
      console.log(`[scraper] Page ${path}: ${content.length} chars`);
    }
  }

  const totalChars = homepageContent.length + pages.reduce((sum, p) => sum + p.content.length, 0);
  console.log(`[scraper] Total scraped: ${totalChars} chars across ${1 + pages.length} pages`);

  return { homepage: homepageContent, pages, totalChars };
}

/**
 * Fetch sitemap URLs from a domain (tries /sitemap.xml, /sitemap_index.xml)
 * Returns list of page URLs found in the sitemap
 */
export async function fetchSitemapUrls(domain: string, limit = 200): Promise<string[]> {
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;
  const urls: string[] = [];
  const sitemapPaths = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-pages.xml", "/page-sitemap.xml"];

  /** Fetch XML with automatic curl-impersonate fallback */
  async function fetchXml(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10000), redirect: "follow" });
      if (res.ok) {
        const text = await res.text();
        if (text.includes("<loc>") || text.includes("<url>") || text.includes("<sitemap>")) return text;
      }
    } catch {}
    // Fallback: curl-impersonate (bypasses Cloudflare TLS fingerprinting)
    const html = await fetchWithCurlImpersonate(url, 15000);
    if (html && (html.includes("<loc>") || html.includes("<url>"))) return html;
    return null;
  }

  for (const path of sitemapPaths) {
    try {
      const xml = await fetchXml(`${baseUrl}${path}`);
      if (!xml) continue;

      // Check if it's a sitemap index (contains other sitemaps)
      const sitemapLocs = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>/gi)].map(m => m[1].trim());
      if (sitemapLocs.length > 0) {
        // Fetch first 5 child sitemaps
        for (const childUrl of sitemapLocs.slice(0, 5)) {
          try {
            const childXml = await fetchXml(childUrl);
            if (!childXml) continue;
            const childUrls = [...childXml.matchAll(/<url>[\s\S]*?<loc>(.*?)<\/loc>/gi)].map(m => m[1].trim());
            urls.push(...childUrls);
          } catch { continue; }
        }
      } else {
        // Direct sitemap with URLs
        const pageUrls = [...xml.matchAll(/<url>[\s\S]*?<loc>(.*?)<\/loc>/gi)].map(m => m[1].trim());
        urls.push(...pageUrls);
      }

      if (urls.length > 0) break; // Found a working sitemap
    } catch { continue; }
  }

  // Deduplicate and limit
  return [...new Set(urls)].slice(0, limit);
}

/**
 * Extract all internal links from a page (not just important ones)
 * Returns paths with their anchor text
 */
export function extractAllInternalLinks(html: string, baseUrl: string): { path: string; text: string }[] {
  const links: { path: string; text: string }[] = [];
  const seen = new Set<string>();
  const base = new URL(baseUrl);

  const anchors = [...html.matchAll(/<a[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)];

  for (const match of anchors) {
    const href = match[1].trim();
    const text = match[2].replace(/<[^>]+>/g, "").trim();
    if (href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;

    try {
      const url = new URL(href, baseUrl);
      if (url.hostname !== base.hostname) continue;
      const path = url.pathname.replace(/\/$/, "") || "/";
      if (path === "/" || seen.has(path)) continue;
      seen.add(path);
      if (text.length > 0 && text.length < 100) {
        links.push({ path, text });
      }
    } catch { continue; }
  }

  return links;
}

/**
 * Extract product categories from our own sitemap URLs
 * e.g., "/collections/men-suits" → { category: "men", product: "suits" }
 * e.g., "/products/leather-oxford-shoes" → { product: "leather oxford shoes" }
 * Returns deduplicated categories and product types as seed keywords
 */
export function extractProductCategoriesFromSitemap(urls: string[]): {
  categories: string[];
  productTypes: string[];
  seedKeywords: string[];
} {
  const categorySet = new Set<string>();
  const productTypeSet = new Set<string>();

  // Common e-commerce URL patterns
  const collectionPatterns = [
    /\/collections?\/([\w-]+)/i,
    /\/categor(?:y|ies)\/([\w-]+)/i,
    /\/shop\/([\w-]+)/i,
    /\/department\/([\w-]+)/i,
    /\/(men|women|kids|boys|girls|unisex|baby|toddler)(?:\/|$)/i,
  ];

  const productPatterns = [
    /\/products?\/([\w-]+)/i,
    /\/item\/([\w-]+)/i,
  ];

  // Gender/audience segments
  const genderMap: Record<string, string> = {
    men: "men's", mans: "men's", male: "men's", him: "men's",
    women: "women's", womans: "women's", female: "women's", her: "women's",
    kids: "kids'", children: "kids'", boys: "boys'", girls: "girls'",
    baby: "baby", toddler: "toddler", unisex: "unisex",
  };

  // Known product type keywords (common across e-commerce)
  const knownProductTypes = new Set([
    "suits", "blazers", "jackets", "coats", "shirts", "t-shirts", "tshirts",
    "pants", "trousers", "jeans", "shorts", "chinos",
    "shoes", "sneakers", "boots", "loafers", "sandals", "oxfords",
    "bags", "handbags", "backpacks", "wallets", "belts",
    "watches", "jewelry", "sunglasses", "accessories",
    "perfumes", "fragrances", "cologne",
    "dresses", "skirts", "tops", "blouses",
    "sportswear", "activewear", "swimwear", "underwear", "socks",
    "scarves", "ties", "hats", "caps", "gloves",
    "knitwear", "sweaters", "hoodies", "polos",
    "outerwear", "vests", "gilets",
  ]);

  for (const url of urls) {
    let path: string;
    try { path = new URL(url).pathname.toLowerCase(); } catch { path = url.toLowerCase(); }

    // Extract from collection/category URLs
    for (const pattern of collectionPatterns) {
      const match = path.match(pattern);
      if (match) {
        const segment = match[1].replace(/-/g, " ").trim();
        // Check if it's a gender/audience
        if (genderMap[segment]) {
          categorySet.add(genderMap[segment]);
        } else {
          // Could be "men-suits", "leather-jackets", etc.
          const words = segment.split(" ");
          let foundGender = false;
          for (const w of words) {
            if (genderMap[w]) {
              categorySet.add(genderMap[w]);
              foundGender = true;
            }
          }
          // Extract product type from the segment
          const productPart = words.filter(w => !genderMap[w]).join(" ");
          if (productPart.length > 1) {
            productTypeSet.add(productPart);
          }
          if (!foundGender && segment.length > 1) {
            productTypeSet.add(segment);
          }
        }
      }
    }

    // Extract from product URLs (less reliable, but get product type hints)
    for (const pattern of productPatterns) {
      const match = path.match(pattern);
      if (match) {
        const slug = match[1].replace(/-/g, " ").trim();
        // Try to find known product types in the slug
        for (const pt of knownProductTypes) {
          if (slug.includes(pt.replace(/-/g, " "))) {
            productTypeSet.add(pt);
          }
        }
      }
    }

    // Also extract from deeper path segments like /men/suits/slim-fit
    const segments = path.split("/").filter(Boolean);
    for (const seg of segments) {
      const cleaned = seg.replace(/-/g, " ");
      if (genderMap[cleaned]) {
        categorySet.add(genderMap[cleaned]);
      }
      if (knownProductTypes.has(cleaned)) {
        productTypeSet.add(cleaned);
      }
    }
  }

  // Filter out junk product types (marketing campaign names, look names, etc.)
  const junkPatterns = /^(byob|discover|shop the look|look \d|new in|sale|all |gifts? for|test |wi \d|boss x|hugo x|beckham|performance|effortless|holiday|fall |clothing fall|mix |three piece|keep it|be your|for special)/i;
  const cleanProductTypes = [...productTypeSet].filter(pt => {
    if (junkPatterns.test(pt)) return false;
    if (pt.split(" ").length > 4) return false; // Too long, likely a campaign name
    if (pt.length < 3) return false;
    return true;
  });

  // Build seed keywords by combining categories with product types
  const categories = [...categorySet];
  const seedKeywords: string[] = [];

  // Product types alone
  for (const pt of cleanProductTypes) {
    seedKeywords.push(pt);
  }

  // Category + product type combinations (only top product types)
  for (const cat of categories) {
    for (const pt of cleanProductTypes.slice(0, 15)) {
      seedKeywords.push(`${cat} ${pt}`);
    }
  }

  // Deduplicate and clean
  const uniqueSeeds = [...new Set(seedKeywords.map(s => s.trim().toLowerCase()))].filter(s => s.length > 2);

  return { categories, productTypes: cleanProductTypes, seedKeywords: uniqueSeeds };
}

/** Content page patterns for detection */
const CONTENT_PATTERNS = /\/(blog|news|magazine|journal|articles?|editorial|stories|style-guide|inspiration|trends|guide|lookbook|how-to|tips|advice|styling|outfit|gift-guide|care-guide|size-guide|buying-guide|fashion|world-of|discover|lifestyle|culture)\b/i;
const CATEGORY_PATTERNS = /\/(categor|collect|shop|product|department|brand|men$|women$|kids$|accessories$|shoes$)/i;
const PRODUCT_PATTERNS = /\/(product|item|p)\/|\/[a-z0-9]+-[a-z0-9]+-[a-z0-9]+(-[a-z0-9]+){3,}/i;

/**
 * Extract a readable topic from a URL path
 * e.g., "/blog/mens-suit-guide" → "mens suit guide"
 * e.g., "/editorial/how-to-style-blazer" → "how to style blazer"
 */
export function extractTopicFromPath(path: string): string {
  // Remove common prefixes
  let topic = path.replace(/^\//, "");
  topic = topic.replace(/^(blog|news|magazine|journal|articles?|editorial|stories|style-guide|inspiration|trends|guide|content|discover|world-of|lifestyle)\//i, "");
  // Remove trailing slashes and file extensions
  topic = topic.replace(/\/$/, "").replace(/\.(html?|php|aspx?)$/i, "");
  // Convert slugs to readable text
  topic = topic.replace(/[-_]/g, " ").replace(/\//g, " — ").trim();
  return topic;
}

/**
 * Scrape a competitor's content structure — what pages/blog posts they have
 * Returns categorized URLs with extracted topics
 */
export interface CompetitorContent {
  domain: string;
  totalPages: number;
  contentPages: { path: string; topic: string }[];
  blogPosts: { path: string; topic: string }[];
  categories: string[];
  productPages: number;
  otherPages: string[];
}

export async function scrapeCompetitorContent(domain: string): Promise<CompetitorContent> {
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;

  // Try sitemap first (get more URLs for better analysis)
  const sitemapUrls = await fetchSitemapUrls(domain, 300);

  const result: CompetitorContent = {
    domain,
    totalPages: sitemapUrls.length,
    contentPages: [],
    blogPosts: [],
    categories: [],
    productPages: 0,
    otherPages: [],
  };

  if (sitemapUrls.length > 0) {
    for (const url of sitemapUrls) {
      let path: string;
      try { path = new URL(url).pathname; } catch { continue; }

      if (PRODUCT_PATTERNS.test(path)) {
        result.productPages++;
      } else if (CONTENT_PATTERNS.test(path)) {
        const topic = extractTopicFromPath(path);
        if (topic.length > 2 && topic.split(" ").length <= 12) {
          result.contentPages.push({ path, topic });
          // Also mark as blog post if it's in a blog-like section
          if (/\/(blog|news|magazine|journal|articles?|editorial|stories)\b/i.test(path)) {
            result.blogPosts.push({ path, topic });
          }
        }
      } else if (CATEGORY_PATTERNS.test(path)) {
        result.categories.push(path);
      } else {
        result.otherPages.push(path);
      }
    }
  } else {
    // Fallback: scrape homepage for links
    const homepage = await fetchPage(baseUrl);
    if (homepage) {
      const links = extractAllInternalLinks(homepage.html, baseUrl);
      for (const link of links) {
        if (CONTENT_PATTERNS.test(link.path)) {
          result.contentPages.push({ path: link.path, topic: link.text || extractTopicFromPath(link.path) });
          if (/\/(blog|news|magazine|journal|articles?|editorial|stories)\b/i.test(link.path)) {
            result.blogPosts.push({ path: link.path, topic: link.text || extractTopicFromPath(link.path) });
          }
        } else if (CATEGORY_PATTERNS.test(link.path)) {
          result.categories.push(`${link.path} — ${link.text}`);
        } else {
          result.otherPages.push(`${link.path} — ${link.text}`);
        }
      }
    }
  }

  // Also try to fetch a few blog page titles for accuracy
  const blogUrlsToFetch = result.blogPosts.length > 0
    ? sitemapUrls.filter(u => { try { return result.blogPosts.some(b => new URL(u).pathname === b.path); } catch { return false; } }).slice(0, 8)
    : [];

  if (blogUrlsToFetch.length > 0) {
    const titleResults = await Promise.all(
      blogUrlsToFetch.map(async (url) => {
        try {
          const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(5000), redirect: "follow" });
          if (!res.ok) return null;
          const html = await res.text();
          const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim();
          const path = new URL(url).pathname;
          return title ? { path, title } : null;
        } catch { return null; }
      })
    );

    // Update blog topics with real titles where available
    for (const t of titleResults) {
      if (!t) continue;
      const existing = result.blogPosts.find(b => b.path === t.path);
      if (existing) {
        existing.topic = t.title.replace(/\s*[|–—-]\s*.+$/, "").trim(); // Remove "| Brand Name" suffix
      }
    }
  }

  return result;
}
