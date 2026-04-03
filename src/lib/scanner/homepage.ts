import * as cheerio from "cheerio";

export interface HomepageData {
  title: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  headings: { level: string; text: string }[];
  navLinks: { text: string; href: string }[];
  bodyText: string[];
  canonical: string;
}

export async function scanHomepage(url: string): Promise<HomepageData> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15000),
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  const headings: { level: string; text: string }[] = [];
  $("h1, h2, h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text) headings.push({ level: el.tagName, text: text.slice(0, 200) });
  });

  const navLinks: { text: string; href: string }[] = [];
  $("nav a, header a").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href");
    if (text && href && !href.startsWith("#") && !href.startsWith("javascript")) {
      navLinks.push({ text: text.slice(0, 100), href });
    }
  });

  const bodyText: string[] = [];
  $("main p, article p, section p, .content p, [class*='hero'] p, [class*='about'] p").each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 30) bodyText.push(text.slice(0, 500));
  });

  if (bodyText.length < 3) {
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 40 && bodyText.length < 20) bodyText.push(text.slice(0, 500));
    });
  }

  const seen = new Set<string>();
  const dedupedLinks = navLinks.filter((l) => {
    if (seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });

  return {
    title: $("title").text().trim(),
    metaDescription: $('meta[name="description"]').attr("content") || "",
    ogTitle: $('meta[property="og:title"]').attr("content") || "",
    ogDescription: $('meta[property="og:description"]').attr("content") || "",
    ogImage: $('meta[property="og:image"]').attr("content") || "",
    headings: headings.slice(0, 30),
    navLinks: dedupedLinks.slice(0, 30),
    bodyText: bodyText.slice(0, 20),
    canonical: $('link[rel="canonical"]').attr("href") || url,
  };
}
