import * as cheerio from "cheerio";

export interface AboutData {
  aboutUrl: string | null;
  companyDescription: string;
  teamInfo: string;
  missionStatement: string;
}

const ABOUT_PATHS = ["/about", "/about-us", "/company", "/about/", "/about-us/", "/company/"];

export async function scanAboutPage(baseUrl: string, navLinks?: { text: string; href: string }[]): Promise<AboutData> {
  const origin = new URL(baseUrl).origin;

  const aboutFromNav = navLinks?.find((l) => {
    const lower = l.text.toLowerCase();
    return lower.includes("about") || lower.includes("company") || lower.includes("who we are");
  });

  const candidates = aboutFromNav
    ? [resolveUrl(aboutFromNav.href, origin), ...ABOUT_PATHS.map((p) => origin + p)]
    : ABOUT_PATHS.map((p) => origin + p);

  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;

      const html = await res.text();
      const $ = cheerio.load(html);

      const paragraphs: string[] = [];
      $("main p, article p, section p, .content p, [class*='about'] p").each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 30) paragraphs.push(text.slice(0, 500));
      });

      if (paragraphs.length < 2) {
        $("p").each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 40 && paragraphs.length < 15) paragraphs.push(text.slice(0, 500));
        });
      }

      if (paragraphs.length === 0) continue;

      return {
        aboutUrl: url,
        companyDescription: paragraphs.slice(0, 10).join("\n\n"),
        teamInfo: extractSection($, ["team", "people", "leadership", "founders"]),
        missionStatement: extractSection($, ["mission", "vision", "values", "purpose"]),
      };
    } catch { continue; }
  }

  return { aboutUrl: null, companyDescription: "", teamInfo: "", missionStatement: "" };
}

function extractSection($: cheerio.CheerioAPI, keywords: string[]): string {
  let result = "";
  $("h2, h3").each((_, el) => {
    const heading = $(el).text().toLowerCase();
    if (keywords.some((k) => heading.includes(k))) {
      const next = $(el).nextAll("p").first().text().trim();
      if (next) result = next.slice(0, 500);
    }
  });
  return result;
}

function resolveUrl(href: string, origin: string): string {
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return origin + href;
  return origin + "/" + href;
}
