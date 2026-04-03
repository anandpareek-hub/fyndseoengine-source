/**
 * Generic product scraper for e-commerce sites.
 * Scrapes product names, URLs, and images from collection/category pages.
 * Works with Webflow, Shopify, WooCommerce, and generic e-commerce sites.
 */

export interface ProductData {
  name: string;
  url: string;
  image: string;
}

/**
 * Scrape products from a collection/category page.
 * Extracts product links, names, and images from the HTML.
 */
export async function scrapeProductsFromPage(pageUrl: string, domain: string): Promise<ProductData[]> {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];
    const html = await res.text();

    const origin = `https://${domain}`;
    const products: ProductData[] = [];
    const seen = new Set<string>();

    // Strategy 1: Find product links with nearby images (works for most e-commerce)
    // Match <a href="/product/..."> elements that contain product info
    const productLinkRegex = /href=["']((?:https?:\/\/[^"']*)?\/product\/[^"']+)["'][^>]*>/gi;
    let match;

    while ((match = productLinkRegex.exec(html)) !== null) {
      const rawUrl = match[1];
      const fullUrl = rawUrl.startsWith("http") ? rawUrl : `${origin}${rawUrl}`;
      const slug = rawUrl.split("/product/")[1]?.split(/[?"#]/)[0] || "";

      if (!slug || seen.has(slug)) continue;
      seen.add(slug);

      // Extract name from slug
      const name = slug
        .replace(/-\d+$/, "") // remove trailing numeric IDs
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();

      if (!name) continue;

      // Find the closest product image (CDN image near this product link)
      const linkPos = match.index;
      const searchWindow = html.substring(Math.max(0, linkPos - 2000), linkPos + 2000);
      // Match product images from CDN domains or common image paths
      // Use [^"'\s]* (zero or more) before keywords so cdn.domain.com matches
      const imgMatch = searchWindow.match(
        /(?:src|srcset)=["'](https?:\/\/[^"'\s]*(?:cdn|images|media|static|assets|products\/pictures)[^"'\s]*\.(?:jpg|jpeg|png|webp)[^"'\s]*)["']/i
      );

      const image = imgMatch
        ? imgMatch[1].split(/\s/)[0].replace(/\?.*$/, "") // clean query params
        : "";

      products.push({ name, url: fullUrl, image });
    }

    // Strategy 2: Shopify-style product cards (data-product-id, product-card class)
    if (products.length === 0) {
      const shopifyRegex = /href=["'](\/products\/[^"']+)["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/gi;
      while ((match = shopifyRegex.exec(html)) !== null) {
        const url = `${origin}${match[1]}`;
        const slug = match[1].replace("/products/", "").split("?")[0];
        if (seen.has(slug)) continue;
        seen.add(slug);

        const name = slug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim();

        products.push({ name, url, image: match[2] });
      }
    }

    // Strategy 3: Generic — find any links to product-like pages + nearby images
    if (products.length === 0) {
      const genericRegex = /href=["']((?:\/[^"']*(?:product|item|shop|buy)[^"']*))["']/gi;
      while ((match = genericRegex.exec(html)) !== null) {
        const url = `${origin}${match[1]}`;
        const path = match[1].split("/").pop()?.split("?")[0] || "";
        if (!path || seen.has(path)) continue;
        seen.add(path);

        const name = path
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim();

        products.push({ name, url, image: "" });
      }
    }

    return products;
  } catch (err) {
    console.warn(`[product-scraper] Failed to scrape ${pageUrl}:`, err);
    return [];
  }
}

// Synonyms for fashion/e-commerce product categories
const SYNONYMS: Record<string, string[]> = {
  flats: ["loafers", "moccasins", "ballet", "slip-on", "casual-shoes"],
  loafers: ["flats", "moccasins", "slip-on"],
  sneakers: ["trainers", "running-shoes", "athletic-shoes"],
  trainers: ["sneakers", "running-shoes"],
  heels: ["pumps", "stilettos", "wedges"],
  pumps: ["heels", "stilettos"],
  boots: ["ankle-boots", "chelsea-boots"],
  sandals: ["slides", "flip-flops", "sliders"],
  shirts: ["button-down", "dress-shirts", "oxford"],
  trousers: ["pants", "chinos", "slacks"],
  pants: ["trousers", "chinos"],
  jackets: ["blazers", "coats", "outerwear"],
  blazers: ["jackets", "suit-jackets"],
  bags: ["handbags", "totes", "backpacks", "clutches"],
  dresses: ["gowns", "frocks"],
  jeans: ["denim"],
  shoes: ["footwear"],
  tops: ["t-shirts", "blouses", "shirts"],
};

/**
 * Find the best matching collection URL for a given topic/keyword.
 * Uses synonym expansion and gender-aware matching.
 * e.g., "men's flats" → /collection/men-loafers, /collection/men-casual-shoes
 */
export function findRelevantCollections(
  collectionUrls: string[],
  keyword: string,
  limit = 3
): string[] {
  const kw = keyword.toLowerCase().replace(/['']/g, "").replace(/\s+/g, " ");
  const kwWords = kw.split(" ").filter((w) => w.length > 2);

  // Detect gender context
  const isMen = kwWords.some((w) => w === "men" || w === "mens" || w === "male" || w === "him" || w === "his");
  const isWomen = kwWords.some((w) => w === "women" || w === "womens" || w === "female" || w === "her" || w === "ladies");

  // Expand keywords with synonyms
  const expandedWords = new Set(kwWords);
  for (const word of kwWords) {
    const syns = SYNONYMS[word];
    if (syns) {
      for (const s of syns) {
        // Add synonym words (split hyphenated ones)
        for (const part of s.split("-")) {
          expandedWords.add(part);
        }
      }
    }
  }

  const scored = collectionUrls.map((url) => {
    const pathSegment = url.toLowerCase().split("/").filter(Boolean).pop() || "";
    const pathWords = pathSegment.split(/[-_]/);
    let score = 0;

    // Gender mismatch penalty — skip women's collections for men's keywords and vice versa
    const pathHasMen = pathWords.some((pw) => pw === "men" || pw === "mens");
    const pathHasWomen = pathWords.some((pw) => pw === "women" || pw === "womens");
    if (isMen && pathHasWomen && !pathHasMen) return { url, score: -1 };
    if (isWomen && pathHasMen && !pathHasWomen) return { url, score: -1 };

    for (const word of expandedWords) {
      if (pathWords.some((pw) => pw === word || pw === word + "s" || pw + "s" === word)) {
        // Original keyword match scores higher than synonym match
        score += kwWords.includes(word) ? 2 : 1;
      }
    }

    // Exact slug match bonus
    if (pathSegment.includes(kw.replace(/\s+/g, "-"))) score += 5;
    // Gender match bonus
    if (isMen && pathHasMen) score += 1;
    if (isWomen && pathHasWomen) score += 1;

    return { url, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.url);
}

/**
 * Get products relevant to an article topic by scraping matching collection pages.
 * Returns products with real names, URLs, and images.
 */
export async function getProductsForArticle(
  collectionUrls: string[],
  keyword: string,
  domain: string,
  limit = 6
): Promise<ProductData[]> {
  const relevantCollections = findRelevantCollections(collectionUrls, keyword, 2);

  if (relevantCollections.length === 0) {
    console.log(`[product-scraper] No matching collections for "${keyword}"`);
    return [];
  }

  console.log(`[product-scraper] Scraping ${relevantCollections.length} collections for "${keyword}": ${relevantCollections.join(", ")}`);

  const allProducts: ProductData[] = [];
  for (const collUrl of relevantCollections) {
    const products = await scrapeProductsFromPage(collUrl, domain);
    allProducts.push(...products);
    if (allProducts.length >= limit) break;
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allProducts.filter((p) => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });

  console.log(`[product-scraper] Found ${unique.length} products for "${keyword}"`);
  return unique.slice(0, limit);
}
