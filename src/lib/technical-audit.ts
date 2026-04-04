import type {
  AuditIssue,
  AuditMetrics,
  AuditSnapshot,
  HtmlEvidence,
  Severity,
  TechnicalAuditResult,
} from "@/lib/studio-types";
import { fetchHtmlPage, inspectInfra, inspectPageHtml, normalizeAuditUrl } from "@/lib/site-crawler";

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

export async function runTechnicalAudit(rawUrl: string): Promise<TechnicalAuditResult> {
  const normalizedUrl = normalizeAuditUrl(rawUrl);
  const fetched = await fetchHtmlPage(normalizedUrl);
  const finalUrl = fetched.finalUrl || normalizedUrl;
  const finalUrlObject = new URL(finalUrl);
  const origin = finalUrlObject.origin;
  const inspection = inspectPageHtml(fetched.html, finalUrl);
  const insights: TechnicalAuditResult["insights"] = {
    technicalSeo: [],
    pagePerformance: [],
    contentQuality: [],
  };
  const htmlEvidence: HtmlEvidence[] = [];
  const infra = await inspectInfra(origin);

  const snapshot: AuditSnapshot = {
    titleTag: inspection.title,
    metaDescription: inspection.metaDescription,
    canonical: inspection.canonical,
    robotsMeta: inspection.robotsMeta,
    h1s: inspection.h1s,
    h2s: inspection.h2s,
    ogTitle: inspection.ogTitle,
    ogDescription: inspection.ogDescription,
    twitterCard: inspection.twitterCard,
  };

  const metrics: AuditMetrics = {
    statusCode: fetched.statusCode,
    titleLength: textLength(inspection.title),
    metaDescriptionLength: textLength(inspection.metaDescription),
    h1Count: inspection.h1s.length,
    h2Count: inspection.h2s.length,
    paragraphCount: inspection.paragraphCount,
    wordCount: inspection.wordCount,
    internalLinks: inspection.internalLinks,
    externalLinks: inspection.externalLinks,
    images: inspection.images,
    imagesMissingAlt: inspection.imagesMissingAlt,
    scripts: inspection.scripts,
    stylesheets: inspection.stylesheets,
    domNodes: inspection.domNodes,
    structuredDataBlocks: inspection.structuredDataBlocks,
    hreflangCount: inspection.hreflangCount,
    hasCanonical: inspection.hasCanonical,
    hasNoindex: inspection.hasNoindex,
    hasRobotsTxt: infra.hasRobotsTxt,
    hasSitemap: infra.hasSitemap,
    hasSchema: inspection.hasSchema,
    hasViewport: inspection.hasViewport,
    hasOpenGraph: inspection.hasOpenGraph,
    hasTwitterCard: inspection.hasTwitterCard,
    hasLang: inspection.hasLang,
  };

  if (fetched.statusCode >= 400) {
    pushIssue(insights, "technicalSeo", {
      title: "Page did not return a healthy status code",
      severity: "high",
      evidence: `The fetched URL returned HTTP ${fetched.statusCode}. Search engines and users may not reach the intended page reliably.`,
      action: "Fix the response status, redirect chain, or deployment issue before investing in on-page SEO work.",
    });
  }

  if (!inspection.title) {
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
      `<title>${finalUrlObject.hostname.replace(/^www\./, "")} | ${inspection.h1s[0] || "Primary page topic"}</title>`,
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
      `<title>${inspection.title}</title>`,
      `<title>${inspection.title.slice(0, 58)}</title>`,
      "Keeping the title concise helps preserve the whole message in SERP snippets."
    );
  }

  if (!inspection.metaDescription) {
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

  if (!inspection.canonical) {
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

  if (inspection.hasNoindex) {
    pushIssue(insights, "technicalSeo", {
      title: "Page is marked noindex",
      severity: "high",
      evidence: `The robots meta contains "${inspection.robotsMeta}", which can stop the page from being indexed.`,
      action: "Remove the noindex directive unless this page is intentionally blocked from search.",
    });
    pushEvidence(
      htmlEvidence,
      "Robots meta",
      `<meta name="robots" content="${inspection.robotsMeta}">`,
      '<meta name="robots" content="index,follow">',
      "Indexable pages need crawler directives that match the SEO goal."
    );
  }

  if (!inspection.hasLang) {
    pushIssue(insights, "technicalSeo", {
      title: "HTML language attribute is missing",
      severity: "low",
      evidence: "The <html> element has no lang attribute, which weakens accessibility and language targeting signals.",
      action: 'Add a lang attribute such as <html lang="en"> to the page shell.',
    });
  }

  if (!inspection.hasViewport) {
    pushIssue(insights, "technicalSeo", {
      title: "Viewport meta tag is missing",
      severity: "medium",
      evidence: "The page does not declare a viewport meta tag, which can hurt mobile rendering and usability.",
      action: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the head.',
    });
  }

  if (inspection.h1s.length === 0) {
    pushIssue(insights, "contentQuality", {
      title: "The page has no H1",
      severity: "high",
      evidence: "Search engines and users do not get a clear top-level topic heading from the content.",
      action: "Add one visible H1 that matches the main intent of the page without duplicating the title word-for-word.",
    });
  } else if (inspection.h1s.length > 1) {
    pushIssue(insights, "contentQuality", {
      title: "Multiple H1s dilute the page hierarchy",
      severity: "medium",
      evidence: `The page contains ${inspection.h1s.length} H1 tags, which can blur the primary topic signal.`,
      action: "Keep one main H1 and convert the rest into H2 or H3 headings based on section hierarchy.",
    });
  }

  if (inspection.h2s.length === 0) {
    pushIssue(insights, "contentQuality", {
      title: "Subheading structure is thin",
      severity: "low",
      evidence: "The page has no H2 sections, which usually makes it harder to scan and harder for search engines to understand subtopics.",
      action: "Introduce clear H2 sections that break the page into use cases, benefits, how-it-works, or FAQ blocks.",
    });
  }

  if (inspection.wordCount < 250) {
    pushIssue(insights, "contentQuality", {
      title: "Page content is very thin",
      severity: "high",
      evidence: `The page only exposes about ${inspection.wordCount} words of visible copy, which is usually not enough to rank or convert well for commercial queries.`,
      action: "Expand the page with practical sections that explain the offer, use cases, proof points, and FAQs.",
    });
  } else if (inspection.wordCount < 500) {
    pushIssue(insights, "contentQuality", {
      title: "Page could use more semantic depth",
      severity: "medium",
      evidence: `The page has roughly ${inspection.wordCount} words of visible copy, which may not cover the full intent well enough.`,
      action: "Add richer supporting copy around benefits, objections, use cases, and internal links.",
    });
  }

  if (inspection.imagesMissingAlt > 0) {
    pushIssue(insights, "technicalSeo", {
      title: "Some images are missing alt text",
      severity: inspection.imagesMissingAlt > 3 ? "medium" : "low",
      evidence: `${inspection.imagesMissingAlt} image${inspection.imagesMissingAlt === 1 ? "" : "s"} have no alt attribute, which weakens accessibility and image search relevance.`,
      action: "Add concise descriptive alt text to meaningful images and use empty alt text only for decorative assets.",
    });
  }

  if (inspection.internalLinks < 3) {
    pushIssue(insights, "technicalSeo", {
      title: "Internal linking is too sparse",
      severity: "medium",
      evidence: `Only ${inspection.internalLinks} internal link${inspection.internalLinks === 1 ? "" : "s"} were found on the page, which limits crawl flow and topical clustering.`,
      action: "Add a visible internal link block to relevant money pages, supporting pages, and FAQs.",
    });
  }

  if (!inspection.hasSchema) {
    pushIssue(insights, "technicalSeo", {
      title: "Structured data is missing",
      severity: "low",
      evidence: "No JSON-LD markup was detected on the page.",
      action: "Add schema that matches the page type, such as FAQPage, Article, Product, or WebPage markup.",
    });
  }

  if (!inspection.hasOpenGraph) {
    pushIssue(insights, "contentQuality", {
      title: "Social preview metadata is incomplete",
      severity: "low",
      evidence: "Open Graph title and description tags were not both detected.",
      action: "Add og:title and og:description tags so the page shares cleanly across social and messaging platforms.",
    });
  }

  if (!inspection.hasTwitterCard) {
    pushIssue(insights, "contentQuality", {
      title: "Twitter card metadata is missing",
      severity: "low",
      evidence: "No twitter:card tag was detected, so previews can become inconsistent across social surfaces.",
      action: "Add a twitter:card tag and align the social preview copy with the Open Graph tags.",
    });
  }

  if (!infra.hasRobotsTxt) {
    pushIssue(insights, "technicalSeo", {
      title: "robots.txt is missing or inaccessible",
      severity: "medium",
      evidence: "The site did not return a healthy robots.txt file during the audit.",
      action: "Publish a valid robots.txt file and make sure it does not accidentally block important paths.",
    });
  }

  if (!infra.hasSitemap) {
    pushIssue(insights, "technicalSeo", {
      title: "XML sitemap is missing or hard to discover",
      severity: "medium",
      evidence: "No working sitemap.xml was found on the site during the audit.",
      action: "Generate a sitemap.xml, keep it fresh, and reference it from robots.txt.",
    });
  }

  if (inspection.scripts > 18 || inspection.domNodes > 1200 || inspection.images > 20) {
    pushIssue(insights, "pagePerformance", {
      title: "Page structure is heavier than it needs to be",
      severity: inspection.scripts > 24 || inspection.domNodes > 1800 ? "medium" : "low",
      evidence: `The page uses ${inspection.scripts} scripts, ${inspection.images} images, and about ${inspection.domNodes} DOM nodes, which can increase rendering and interaction cost.`,
      action: "Trim non-critical scripts, lazy-load media where possible, and simplify overly deep layout structures.",
    });
  }

  if (inspection.stylesheets > 5) {
    pushIssue(insights, "pagePerformance", {
      title: "Stylesheet count suggests render-blocking overhead",
      severity: "low",
      evidence: `The page references ${inspection.stylesheets} stylesheet files, which can slow first render if they are all critical.`,
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
    title: inspection.title || inspection.h1s[0] || finalUrlObject.hostname,
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
