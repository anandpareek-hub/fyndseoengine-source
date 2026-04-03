import * as cheerio from "cheerio";
import type {
  AuditIssue,
  AuditMetrics,
  HtmlEvidence,
  Severity,
  AuditSnapshot,
  TechnicalAuditResult,
} from "@/lib/studio-types";

const USER_AGENT =
  "Mozilla/5.0 (compatible; FyndSeoEngineBot/1.0; +https://github.com/anandpareek-hub/fyndseoengine-source)";

function normalizeUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    throw new Error("Enter a URL to audit.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);

  return url.toString();
}

function clampHtml(value: string, max = 220) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function textLength(value: string | undefined) {
  return value ? value.trim().length : 0;
}

function severityWeight(severity: Severity) {
  switch (severity) {
    case "high":
      return 12;
    case "medium":
      return 7;
    case "low":
      return 3;
  }
}

function statusFromScore(score: number) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Promising";
  if (score >= 50) return "Needs work";
  return "High priority";
}

async function inspectInfra(origin: string) {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  let hasRobotsTxt = false;
  let hasSitemap = false;
  let sitemapCandidate = new URL("/sitemap.xml", origin).toString();

  try {
    const robotsResponse = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });

    if (robotsResponse.ok) {
      hasRobotsTxt = true;
      const body = await robotsResponse.text();
      const sitemapLine = body
        .split("\n")
        .find((line) => line.trim().toLowerCase().startsWith("sitemap:"));

      if (sitemapLine) {
        sitemapCandidate = sitemapLine.split(":").slice(1).join(":").trim() || sitemapCandidate;
      }
    }
  } catch {
    hasRobotsTxt = false;
  }

  try {
    const sitemapResponse = await fetch(sitemapCandidate, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });

    if (sitemapResponse.ok) {
      const text = await sitemapResponse.text();
      hasSitemap = /<(urlset|sitemapindex)\b/i.test(text);
    }
  } catch {
    hasSitemap = false;
  }

  return { hasRobotsTxt, hasSitemap };
}

function pushIssue(
  issues: TechnicalAuditResult["insights"],
  bucket: keyof TechnicalAuditResult["insights"],
  issue: AuditIssue
) {
  issues[bucket].push(issue);
}

function pushEvidence(
  evidence: HtmlEvidence[],
  label: string,
  current: string,
  solution: string,
  why: string
) {
  evidence.push({
    label,
    current: clampHtml(current || "Missing"),
    solution: clampHtml(solution),
    why,
  });
}

function classifyLinks(hrefs: string[], origin: string) {
  let internalLinks = 0;
  let externalLinks = 0;

  for (const href of hrefs) {
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }

    try {
      const parsed = new URL(href, origin);
      if (parsed.origin === origin) {
        internalLinks += 1;
      } else {
        externalLinks += 1;
      }
    } catch {
      continue;
    }
  }

  return { internalLinks, externalLinks };
}

export async function runTechnicalAudit(rawUrl: string): Promise<TechnicalAuditResult> {
  const normalizedUrl = normalizeUrl(rawUrl);
  const response = await fetch(normalizedUrl, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });

  const html = await response.text();
  const finalUrl = response.url || normalizedUrl;
  const finalUrlObject = new URL(finalUrl);
  const origin = finalUrlObject.origin;
  const $ = cheerio.load(html);
  const insights: TechnicalAuditResult["insights"] = {
    technicalSeo: [],
    pagePerformance: [],
    contentQuality: [],
  };
  const htmlEvidence: HtmlEvidence[] = [];

  const title = $("title").first().text().trim();
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() || "";
  const robotsMeta = $('meta[name="robots"]').attr("content")?.trim().toLowerCase() || "";
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const paragraphCount = $("p")
    .toArray()
    .map((node) => $(node).text().trim())
    .filter((text) => text.length > 24).length;
  const wordCount = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
  const imageNodes = $("img").toArray();
  const imagesMissingAlt = imageNodes.filter((node) => $(node).attr("alt") == null).length;
  const hrefs = $("a[href]")
    .map((_, node) => $(node).attr("href") || "")
    .get();
  const { internalLinks, externalLinks } = classifyLinks(hrefs, origin);
  const scripts = $("script").length;
  const stylesheets = $('link[rel="stylesheet"]').length;
  const domNodes = $("body *").length;
  const structuredDataBlocks = $('script[type="application/ld+json"]').length;
  const hasSchema = structuredDataBlocks > 0;
  const hasViewport = $('meta[name="viewport"]').length > 0;
  const hreflangCount = $('link[rel="alternate"][hreflang]').length;
  const hasOpenGraph =
    $('meta[property="og:title"]').length > 0 &&
    $('meta[property="og:description"]').length > 0;
  const hasTwitterCard = $('meta[name="twitter:card"]').length > 0;
  const hasLang = Boolean($("html").attr("lang"));
  const hasNoindex = robotsMeta.includes("noindex");
  const { hasRobotsTxt, hasSitemap } = await inspectInfra(origin);

  const snapshot: AuditSnapshot = {
    titleTag: title,
    metaDescription,
    canonical,
    robotsMeta,
    h1s: $("h1")
      .toArray()
      .map((node) => $(node).text().trim())
      .filter(Boolean)
      .slice(0, 5),
    h2s: $("h2")
      .toArray()
      .map((node) => $(node).text().trim())
      .filter(Boolean)
      .slice(0, 8),
    ogTitle: $('meta[property="og:title"]').attr("content")?.trim() || "",
    ogDescription: $('meta[property="og:description"]').attr("content")?.trim() || "",
    twitterCard: $('meta[name="twitter:card"]').attr("content")?.trim() || "",
  };

  const metrics: AuditMetrics = {
    statusCode: response.status,
    titleLength: textLength(title),
    metaDescriptionLength: textLength(metaDescription),
    h1Count,
    h2Count,
    paragraphCount,
    wordCount,
    internalLinks,
    externalLinks,
    images: imageNodes.length,
    imagesMissingAlt,
    scripts,
    stylesheets,
    domNodes,
    structuredDataBlocks,
    hreflangCount,
    hasCanonical: Boolean(canonical),
    hasNoindex,
    hasRobotsTxt,
    hasSitemap,
    hasSchema,
    hasViewport,
    hasOpenGraph,
    hasTwitterCard,
    hasLang,
  };

  if (!response.ok) {
    pushIssue(insights, "technicalSeo", {
      title: "Page did not return a healthy status code",
      severity: "high",
      evidence: `The fetched URL returned HTTP ${response.status}. Search engines and users may not reach the intended page reliably.`,
      action: "Fix the response status, redirect chain, or deployment issue before investing in on-page SEO work.",
    });
  }

  if (!title) {
    pushIssue(insights, "technicalSeo", {
      title: "Missing title tag",
      severity: "high",
      evidence: "The page has no <title> tag, so search engines do not have a strong primary headline for the result.",
      action: "Add a unique title tag that leads with the main keyword and ends with the brand name.",
    });
    pushEvidence(
      htmlEvidence,
      "Title tag",
      "<title></title>",
      `<title>${finalUrlObject.hostname.replace(/^www\./, "")} | ${$("h1").first().text().trim() || "Primary page topic"}</title>`,
      "A strong title is one of the highest-impact SEO signals for CTR and topical clarity."
    );
  } else if (metrics.titleLength < 35 || metrics.titleLength > 65) {
    pushIssue(insights, "technicalSeo", {
      title: "Title tag length is outside the ideal range",
      severity: "medium",
      evidence: `The current title is ${metrics.titleLength} characters long, which risks being vague or truncated in search results.`,
      action: "Tighten the title to roughly 45-60 characters while keeping the main intent explicit.",
    });
    pushEvidence(
      htmlEvidence,
      "Title tag",
      `<title>${title}</title>`,
      `<title>${title.slice(0, 58)}</title>`,
      "Keeping the title concise helps preserve the whole message in SERP snippets."
    );
  }

  if (!metaDescription) {
    pushIssue(insights, "contentQuality", {
      title: "Missing meta description",
      severity: "medium",
      evidence: "The page has no meta description, which weakens control over the search snippet.",
      action: "Write a 140-155 character description that explains the page value and includes a clear reason to click.",
    });
    pushEvidence(
      htmlEvidence,
      "Meta description",
      '<meta name="description" content="">',
      '<meta name="description" content="Explain the page value, mention the audience, and give the user a reason to click.">',
      "A well-shaped meta description improves snippet quality and clarifies intent."
    );
  } else if (metrics.metaDescriptionLength < 110 || metrics.metaDescriptionLength > 165) {
    pushIssue(insights, "contentQuality", {
      title: "Meta description needs tightening",
      severity: "low",
      evidence: `The current description is ${metrics.metaDescriptionLength} characters long, which is outside the common snippet sweet spot.`,
      action: "Rewrite the meta description to be concise, benefit-led, and easier to display in full.",
    });
  }

  if (!canonical) {
    pushIssue(insights, "technicalSeo", {
      title: "Canonical tag is missing",
      severity: "medium",
      evidence: "The page does not declare a canonical URL, making duplication and indexing signals less explicit.",
      action: "Add a self-referencing canonical link tag on the final indexable URL.",
    });
    pushEvidence(
      htmlEvidence,
      "Canonical",
      "Missing",
      `<link rel="canonical" href="${finalUrl}">`,
      "Canonical tags help consolidate ranking signals and reduce ambiguity for crawlers."
    );
  }

  if (hasNoindex) {
    pushIssue(insights, "technicalSeo", {
      title: "Page is marked noindex",
      severity: "high",
      evidence: `The robots meta contains "${robotsMeta}", which can stop the page from being indexed.`,
      action: "Remove the noindex directive unless this page is intentionally blocked from search.",
    });
    pushEvidence(
      htmlEvidence,
      "Robots meta",
      `<meta name="robots" content="${robotsMeta}">`,
      '<meta name="robots" content="index,follow">',
      "Indexable pages need crawler directives that match the SEO goal."
    );
  }

  if (!hasLang) {
    pushIssue(insights, "technicalSeo", {
      title: "HTML language attribute is missing",
      severity: "low",
      evidence: "The <html> element has no lang attribute, which weakens accessibility and language targeting signals.",
      action: 'Add a lang attribute such as <html lang="en"> to the page shell.',
    });
  }

  if (!hasViewport) {
    pushIssue(insights, "technicalSeo", {
      title: "Viewport meta tag is missing",
      severity: "medium",
      evidence: "The page does not declare a viewport meta tag, which can hurt mobile rendering and usability.",
      action: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the head.',
    });
  }

  if (h1Count === 0) {
    pushIssue(insights, "contentQuality", {
      title: "The page has no H1",
      severity: "high",
      evidence: "Search engines and users do not get a clear top-level topic heading from the content.",
      action: "Add one visible H1 that matches the main intent of the page without duplicating the title word-for-word.",
    });
  } else if (h1Count > 1) {
    pushIssue(insights, "contentQuality", {
      title: "Multiple H1s dilute the page hierarchy",
      severity: "medium",
      evidence: `The page contains ${h1Count} H1 tags, which can blur the primary topic signal.`,
      action: "Keep one main H1 and convert the rest into H2 or H3 headings based on section hierarchy.",
    });
  }

  if (h2Count === 0) {
    pushIssue(insights, "contentQuality", {
      title: "Subheading structure is thin",
      severity: "low",
      evidence: "The page has no H2 sections, which usually makes it harder to scan and harder for search engines to understand subtopics.",
      action: "Introduce clear H2 sections that break the page into use cases, benefits, how-it-works, or FAQ blocks.",
    });
  }

  if (wordCount < 250) {
    pushIssue(insights, "contentQuality", {
      title: "Page content is very thin",
      severity: "high",
      evidence: `The page only exposes about ${wordCount} words of visible copy, which is usually not enough to rank or convert well for commercial queries.`,
      action: "Expand the page with practical sections that explain the offer, use cases, proof points, and FAQs.",
    });
  } else if (wordCount < 500) {
    pushIssue(insights, "contentQuality", {
      title: "Page could use more semantic depth",
      severity: "medium",
      evidence: `The page has roughly ${wordCount} words of visible copy, which may not cover the full intent well enough.`,
      action: "Add richer supporting copy around benefits, objections, use cases, and internal links.",
    });
  }

  if (imagesMissingAlt > 0) {
    pushIssue(insights, "technicalSeo", {
      title: "Some images are missing alt text",
      severity: imagesMissingAlt > 3 ? "medium" : "low",
      evidence: `${imagesMissingAlt} image${imagesMissingAlt === 1 ? "" : "s"} have no alt attribute, which weakens accessibility and image search relevance.`,
      action: "Add concise descriptive alt text to meaningful images and use empty alt text only for decorative assets.",
    });
  }

  if (internalLinks < 3) {
    pushIssue(insights, "technicalSeo", {
      title: "Internal linking is too sparse",
      severity: "medium",
      evidence: `Only ${internalLinks} internal link${internalLinks === 1 ? "" : "s"} were found on the page, which limits crawl flow and topical clustering.`,
      action: "Add a visible internal link block to relevant money pages, supporting pages, and FAQs.",
    });
  }

  if (!hasSchema) {
    pushIssue(insights, "technicalSeo", {
      title: "Structured data is missing",
      severity: "low",
      evidence: "No JSON-LD markup was detected on the page.",
      action: "Add schema that matches the page type, such as FAQPage, Article, Product, or WebPage markup.",
    });
  }

  if (!hasOpenGraph) {
    pushIssue(insights, "contentQuality", {
      title: "Social preview metadata is incomplete",
      severity: "low",
      evidence: "Open Graph title and description tags were not both detected.",
      action: "Add og:title and og:description tags so the page shares cleanly across social and messaging platforms.",
    });
  }

  if (!hasTwitterCard) {
    pushIssue(insights, "contentQuality", {
      title: "Twitter card metadata is missing",
      severity: "low",
      evidence: "No twitter:card tag was detected, so previews can become inconsistent across social surfaces.",
      action: "Add a twitter:card tag and align the social preview copy with the Open Graph tags.",
    });
  }

  if (!hasRobotsTxt) {
    pushIssue(insights, "technicalSeo", {
      title: "robots.txt is missing or inaccessible",
      severity: "medium",
      evidence: "The site did not return a healthy robots.txt file during the audit.",
      action: "Publish a valid robots.txt file and make sure it does not accidentally block important paths.",
    });
  }

  if (!hasSitemap) {
    pushIssue(insights, "technicalSeo", {
      title: "XML sitemap is missing or hard to discover",
      severity: "medium",
      evidence: "No working sitemap.xml was found on the site during the audit.",
      action: "Generate a sitemap.xml, keep it fresh, and reference it from robots.txt.",
    });
  }

  if (scripts > 18 || domNodes > 1200 || imageNodes.length > 20) {
    pushIssue(insights, "pagePerformance", {
      title: "Page structure is heavier than it needs to be",
      severity: scripts > 24 || domNodes > 1800 ? "medium" : "low",
      evidence: `The page uses ${scripts} scripts, ${imageNodes.length} images, and about ${domNodes} DOM nodes, which can increase rendering and interaction cost.`,
      action: "Trim non-critical scripts, lazy-load media where possible, and simplify overly deep layout structures.",
    });
  }

  if (stylesheets > 5) {
    pushIssue(insights, "pagePerformance", {
      title: "Stylesheet count suggests render-blocking overhead",
      severity: "low",
      evidence: `The page references ${stylesheets} stylesheet files, which can slow first render if they are all critical.`,
      action: "Reduce stylesheet fragmentation or inline the smallest critical styles for faster first paint.",
    });
  }

  const allIssues = [
    ...insights.technicalSeo,
    ...insights.pagePerformance,
    ...insights.contentQuality,
  ];

  const score = Math.max(
    18,
    100 - allIssues.reduce((sum, issue) => sum + severityWeight(issue.severity), 0)
  );

  const quickWins = allIssues
    .filter((issue) => issue.severity !== "high")
    .slice(0, 4)
    .map((issue) => issue.action);

  const majorFixes = allIssues
    .filter((issue) => issue.severity === "high")
    .slice(0, 4)
    .map((issue) => issue.action);

  return {
    url: normalizedUrl,
    finalUrl,
    title: title || $("h1").first().text().trim() || finalUrlObject.hostname,
    score,
    status: statusFromScore(score),
    fetchedAt: new Date().toISOString(),
    quickWins:
      quickWins.length > 0
        ? quickWins
        : ["No obvious quick wins were detected; focus on improving depth, links, and metadata clarity."],
    majorFixes:
      majorFixes.length > 0
        ? majorFixes
        : ["No critical blockers were detected. Shift effort toward content expansion and supporting page creation."],
    htmlEvidence,
    snapshot,
    insights,
    metrics,
  };
}
