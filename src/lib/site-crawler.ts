import { createHash, randomUUID } from "node:crypto";
import { parse } from "node-html-parser";
import { XMLParser } from "fast-xml-parser";
import type { Severity, SiteChange, SitePageSnapshot, SiteSnapshot } from "@/lib/studio-types";

const USER_AGENT =
  "Mozilla/5.0 (compatible; FyndSeoEngineBot/1.0; +https://github.com/anandpareek-hub/fyndseoengine-source)";

const DEFAULT_PAGE_LIMIT = 12;
const REQUEST_TIMEOUT = 12000;

type InfraInspection = {
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  sitemapUrl: string | null;
  sitemapCandidates: string[];
};

type SitemapUrlEntry = {
  loc: string;
  lastmod: string | null;
};

type PageInspection = {
  title: string;
  metaDescription: string;
  canonical: string;
  robotsMeta: string;
  h1s: string[];
  h2s: string[];
  ogTitle: string;
  ogDescription: string;
  twitterCard: string;
  paragraphCount: number;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  images: number;
  imagesMissingAlt: number;
  scripts: number;
  stylesheets: number;
  domNodes: number;
  structuredDataBlocks: number;
  hreflangCount: number;
  hasCanonical: boolean;
  hasNoindex: boolean;
  hasSchema: boolean;
  hasViewport: boolean;
  hasOpenGraph: boolean;
  hasTwitterCard: boolean;
  hasLang: boolean;
  excerpt: string;
  hrefs: string[];
  pageHash: string;
};

type FetchedPage = {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  html: string;
};

export function normalizeAuditUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    throw new Error("Enter a URL to inspect.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(withProtocol).toString();
}

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clamp(value: string, max = 220) {
  const trimmed = compact(value);
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}...` : trimmed;
}

function normalizeComparableUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";

    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return value;
  }
}

function bodyTextFromNode(node: ReturnType<typeof parse>) {
  const body = node.querySelector("body");
  const rawText =
    (body?.textContent as string | undefined) ||
    (node.textContent as string | undefined) ||
    "";

  return compact(rawText);
}

function metaContent(root: ReturnType<typeof parse>, key: "name" | "property", value: string) {
  const match = root
    .querySelectorAll("meta")
    .find((node) => node.getAttribute(key)?.trim().toLowerCase() === value.toLowerCase());

  return compact(match?.getAttribute("content") || "");
}

function linkHref(root: ReturnType<typeof parse>, relValue: string) {
  const match = root
    .querySelectorAll("link")
    .find((node) =>
      node
        .getAttribute("rel")
        ?.split(/\s+/)
        .map((part) => part.toLowerCase())
        .includes(relValue.toLowerCase())
    );

  return compact(match?.getAttribute("href") || "");
}

function textList(root: ReturnType<typeof parse>, selector: string, limit: number) {
  return root
    .querySelectorAll(selector)
    .map((node) => compact(node.textContent))
    .filter(Boolean)
    .slice(0, limit);
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

async function fetchText(url: string, accept: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: accept,
    },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  return {
    response,
    text: await response.text(),
  };
}

export async function fetchHtmlPage(url: string): Promise<FetchedPage> {
  const normalizedUrl = normalizeAuditUrl(url);
  const { response, text } = await fetchText(normalizedUrl, "text/html,application/xhtml+xml");

  return {
    requestedUrl: normalizedUrl,
    finalUrl: response.url || normalizedUrl,
    statusCode: response.status,
    html: text,
  };
}

export async function inspectInfra(origin: string): Promise<InfraInspection> {
  const robotsUrl = new URL("/robots.txt", origin).toString();
  let hasRobotsTxt = false;
  let sitemapUrl = new URL("/sitemap.xml", origin).toString();
  const sitemapCandidates = new Set<string>([sitemapUrl]);

  try {
    const { response, text } = await fetchText(robotsUrl, "text/plain,text/*");

    if (response.ok) {
      hasRobotsTxt = true;

      for (const line of text.split("\n")) {
        if (line.trim().toLowerCase().startsWith("sitemap:")) {
          const candidate = line.split(":").slice(1).join(":").trim();
          if (candidate) {
            sitemapCandidates.add(candidate);
            sitemapUrl = candidate;
          }
        }
      }
    }
  } catch {
    hasRobotsTxt = false;
  }

  let hasSitemap = false;

  for (const candidate of sitemapCandidates) {
    try {
      const { response, text } = await fetchText(candidate, "application/xml,text/xml,text/plain");

      if (response.ok && /<(urlset|sitemapindex)\b/i.test(text)) {
        sitemapUrl = candidate;
        hasSitemap = true;
        break;
      }
    } catch {
      continue;
    }
  }

  return {
    hasRobotsTxt,
    hasSitemap,
    sitemapUrl: hasSitemap ? sitemapUrl : null,
    sitemapCandidates: [...sitemapCandidates],
  };
}

function parseSitemapText(xml: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
    attributeNamePrefix: "",
  });

  const parsed = parser.parse(xml) as {
    urlset?: { url?: Array<{ loc?: string; lastmod?: string }> | { loc?: string; lastmod?: string } };
    sitemapindex?: {
      sitemap?:
        | Array<{ loc?: string }>
        | {
            loc?: string;
          };
    };
  };

  const urlset = parsed.urlset?.url
    ? Array.isArray(parsed.urlset.url)
      ? parsed.urlset.url
      : [parsed.urlset.url]
    : [];

  const urls: SitemapUrlEntry[] = urlset
    .map((item) => ({
      loc: compact(item.loc || ""),
      lastmod: compact(item.lastmod || "") || null,
    }))
    .filter((item) => item.loc);

  const nestedSitemaps = parsed.sitemapindex?.sitemap
    ? Array.isArray(parsed.sitemapindex.sitemap)
      ? parsed.sitemapindex.sitemap
      : [parsed.sitemapindex.sitemap]
    : [];

  const sitemapUrls = nestedSitemaps
    .map((item) => compact(item.loc || ""))
    .filter(Boolean);

  return { urls, sitemapUrls };
}

async function collectSitemapUrls(
  rootUrl: string,
  candidates: string[],
  maxUrls: number
): Promise<SitemapUrlEntry[]> {
  const root = new URL(rootUrl);
  const queue = [...candidates];
  const seen = new Set<string>();
  const urls: SitemapUrlEntry[] = [];

  while (queue.length && urls.length < maxUrls) {
    const candidate = queue.shift();

    if (!candidate || seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);

    try {
      const { response, text } = await fetchText(candidate, "application/xml,text/xml,text/plain");

      if (!response.ok) {
        continue;
      }

      const parsed = parseSitemapText(text);

      for (const entry of parsed.urls) {
        try {
          const url = new URL(entry.loc);
          if (url.origin !== root.origin) {
            continue;
          }

          urls.push({
            loc: url.toString(),
            lastmod: entry.lastmod,
          });
        } catch {
          continue;
        }
      }

      for (const nested of parsed.sitemapUrls) {
        if (!seen.has(nested)) {
          queue.push(nested);
        }
      }
    } catch {
      continue;
    }
  }

  return urls.slice(0, maxUrls);
}

function candidateInternalLinks(finalUrl: string, hrefs: string[], limit: number) {
  const current = new URL(finalUrl);
  const normalized = new Set<string>();

  for (const href of hrefs) {
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }

    try {
      const url = new URL(href, current.origin);

      if (url.origin !== current.origin) {
        continue;
      }

      if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|xml|json|txt)$/i.test(url.pathname)) {
        continue;
      }

      url.hash = "";

      if (url.pathname !== "/" && url.pathname.endsWith("/")) {
        url.pathname = url.pathname.slice(0, -1);
      }

      normalized.add(url.toString());
    } catch {
      continue;
    }
  }

  return [...normalized].slice(0, limit);
}

export function inspectPageHtml(html: string, finalUrl: string): PageInspection {
  const root = parse(html);
  const finalUrlObject = new URL(finalUrl);
  const origin = finalUrlObject.origin;
  const bodyText = bodyTextFromNode(root);

  const title = compact(root.querySelector("title")?.textContent || "");
  const metaDescription =
    metaContent(root, "name", "description") || metaContent(root, "property", "og:description");
  const canonical = linkHref(root, "canonical");
  const robotsMeta = metaContent(root, "name", "robots").toLowerCase();
  const h1s = textList(root, "h1", 5);
  const h2s = textList(root, "h2", 8);
  const ogTitle = metaContent(root, "property", "og:title");
  const ogDescription = metaContent(root, "property", "og:description");
  const twitterCard = metaContent(root, "name", "twitter:card");
  const paragraphCount = root
    .querySelectorAll("p")
    .map((node) => compact(node.textContent))
    .filter((text) => text.length > 24).length;
  const wordCount = bodyText.split(" ").filter(Boolean).length;
  const hrefs = root
    .querySelectorAll("a")
    .map((node) => compact(node.getAttribute("href") || ""))
    .filter(Boolean);
  const { internalLinks, externalLinks } = classifyLinks(hrefs, origin);
  const images = root.querySelectorAll("img");
  const imagesMissingAlt = images.filter((node) => node.getAttribute("alt") == null).length;
  const scripts = root.querySelectorAll("script").length;
  const stylesheets = root
    .querySelectorAll("link")
    .filter((node) =>
      node
        .getAttribute("rel")
        ?.split(/\s+/)
        .map((part) => part.toLowerCase())
        .includes("stylesheet")
    ).length;
  const domNodes = root.querySelectorAll("*").length;
  const structuredDataBlocks = root
    .querySelectorAll("script")
    .filter((node) => node.getAttribute("type")?.trim().toLowerCase() === "application/ld+json")
    .length;
  const hreflangCount = root
    .querySelectorAll("link")
    .filter((node) => Boolean(node.getAttribute("hreflang"))).length;
  const hasOpenGraph = Boolean(ogTitle && ogDescription);
  const hasTwitterCard = Boolean(twitterCard);
  const hasLang = Boolean(root.querySelector("html")?.getAttribute("lang"));
  const hasSchema = structuredDataBlocks > 0;
  const hasViewport = Boolean(metaContent(root, "name", "viewport"));
  const hasNoindex = robotsMeta.includes("noindex");
  const pageHash = createHash("sha1")
    .update(
      JSON.stringify({
        title,
        metaDescription,
        canonical,
        robotsMeta,
        h1s,
        h2s,
        wordCount,
        bodyText,
      })
    )
    .digest("hex");

  return {
    title,
    metaDescription,
    canonical,
    robotsMeta,
    h1s,
    h2s,
    ogTitle,
    ogDescription,
    twitterCard,
    paragraphCount,
    wordCount,
    internalLinks,
    externalLinks,
    images: images.length,
    imagesMissingAlt,
    scripts,
    stylesheets,
    domNodes,
    structuredDataBlocks,
    hreflangCount,
    hasCanonical: Boolean(canonical),
    hasNoindex,
    hasSchema,
    hasViewport,
    hasOpenGraph,
    hasTwitterCard,
    hasLang,
    excerpt: clamp(bodyText, 220),
    hrefs,
    pageHash,
  };
}

async function crawlSinglePage(
  inputUrl: string,
  discoveredFrom: SitePageSnapshot["discoveredFrom"],
  lastmod: string | null
) {
  const fetched = await fetchHtmlPage(inputUrl);
  const inspection = inspectPageHtml(fetched.html, fetched.finalUrl);
  const finalUrlObject = new URL(fetched.finalUrl);

  return {
    url: normalizeComparableUrl(fetched.finalUrl),
    path: finalUrlObject.pathname || "/",
    title: inspection.title || inspection.h1s[0] || finalUrlObject.hostname,
    metaDescription: inspection.metaDescription,
    canonical: inspection.canonical,
    h1: inspection.h1s[0] || "",
    statusCode: fetched.statusCode,
    wordCount: inspection.wordCount,
    internalLinks: inspection.internalLinks,
    externalLinks: inspection.externalLinks,
    imagesMissingAlt: inspection.imagesMissingAlt,
    hasNoindex: inspection.hasNoindex,
    pageHash: inspection.pageHash,
    excerpt: inspection.excerpt,
    discoveredFrom,
    lastmod,
  } satisfies SitePageSnapshot;
}

async function mapWithConcurrency<TInput, TOutput>(
  values: TInput[],
  concurrency: number,
  worker: (value: TInput) => Promise<TOutput | null>
) {
  const output: TOutput[] = [];
  let index = 0;

  async function runWorker() {
    while (index < values.length) {
      const currentIndex = index;
      index += 1;
      const result = await worker(values[currentIndex]);

      if (result) {
        output.push(result);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => runWorker())
  );

  return output;
}

export async function crawlSiteSnapshot(rawUrl: string, pageLimit = DEFAULT_PAGE_LIMIT): Promise<SiteSnapshot> {
  const homepage = await fetchHtmlPage(rawUrl);
  const finalOrigin = new URL(homepage.finalUrl).origin;
  const infra = await inspectInfra(finalOrigin);
  const homepageInspection = inspectPageHtml(homepage.html, homepage.finalUrl);
  const sitemapEntries = infra.hasSitemap
    ? await collectSitemapUrls(homepage.finalUrl, infra.sitemapCandidates, pageLimit * 2)
    : [];

  const seededUrls = new Map<string, { url: string; discoveredFrom: SitePageSnapshot["discoveredFrom"]; lastmod: string | null }>();

  seededUrls.set(normalizeComparableUrl(homepage.finalUrl), {
    url: homepage.finalUrl,
    discoveredFrom: "homepage",
    lastmod: null,
  });

  for (const entry of sitemapEntries) {
    const key = normalizeComparableUrl(entry.loc);

    if (!seededUrls.has(key)) {
      seededUrls.set(key, {
        url: entry.loc,
        discoveredFrom: "sitemap",
        lastmod: entry.lastmod,
      });
    }
  }

  for (const href of candidateInternalLinks(homepage.finalUrl, homepageInspection.hrefs, pageLimit * 2)) {
    const key = normalizeComparableUrl(href);

    if (!seededUrls.has(key)) {
      seededUrls.set(key, {
        url: href,
        discoveredFrom: "internal",
        lastmod: null,
      });
    }
  }

  const pagesToFetch = [...seededUrls.values()].slice(0, pageLimit);
  const additionalPages = pagesToFetch.filter(
    (item) => normalizeComparableUrl(item.url) !== normalizeComparableUrl(homepage.finalUrl)
  );

  const crawled = await mapWithConcurrency(additionalPages, 4, async (item) => {
    try {
      return await crawlSinglePage(item.url, item.discoveredFrom, item.lastmod);
    } catch {
      return null;
    }
  });

  const homepageSnapshot = {
    url: normalizeComparableUrl(homepage.finalUrl),
    path: new URL(homepage.finalUrl).pathname || "/",
    title: homepageInspection.title || homepageInspection.h1s[0] || new URL(homepage.finalUrl).hostname,
    metaDescription: homepageInspection.metaDescription,
    canonical: homepageInspection.canonical,
    h1: homepageInspection.h1s[0] || "",
    statusCode: homepage.statusCode,
    wordCount: homepageInspection.wordCount,
    internalLinks: homepageInspection.internalLinks,
    externalLinks: homepageInspection.externalLinks,
    imagesMissingAlt: homepageInspection.imagesMissingAlt,
    hasNoindex: homepageInspection.hasNoindex,
    pageHash: homepageInspection.pageHash,
    excerpt: homepageInspection.excerpt,
    discoveredFrom: "homepage" as const,
    lastmod: null,
  };

  const pageMap = new Map<string, SitePageSnapshot>([[homepageSnapshot.url, homepageSnapshot]]);

  for (const page of crawled) {
    pageMap.set(page.url, page);
  }

  const pages = [...pageMap.values()].sort((a, b) => a.path.localeCompare(b.path));
  const warnings: string[] = [];

  if (!infra.hasRobotsTxt) {
    warnings.push("robots.txt is missing or inaccessible.");
  }

  if (!infra.hasSitemap) {
    warnings.push("sitemap.xml was not detected, so discovery falls back to homepage links.");
  }

  const brokenPages = pages.filter((page) => page.statusCode >= 400).length;
  if (brokenPages > 0) {
    warnings.push(`${brokenPages} tracked page${brokenPages === 1 ? "" : "s"} returned a 4xx or 5xx status.`);
  }

  const noindexPages = pages.filter((page) => page.hasNoindex).length;
  if (noindexPages > 0) {
    warnings.push(`${noindexPages} tracked page${noindexPages === 1 ? "" : "s"} are marked noindex.`);
  }

  return {
    snapshotId: randomUUID(),
    websiteUrl: homepage.finalUrl,
    finalOrigin,
    generatedAt: new Date().toISOString(),
    pageLimit,
    hasRobotsTxt: infra.hasRobotsTxt,
    hasSitemap: infra.hasSitemap,
    sitemapUrl: infra.sitemapUrl,
    pages,
    warnings,
  };
}

function severityRank(severity: Severity) {
  switch (severity) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
  }
}

function formatPageLabel(page: SitePageSnapshot) {
  return page.title || page.path || page.url;
}

export function compareSiteSnapshots(
  previous: SiteSnapshot | null,
  latest: SiteSnapshot
) {
  if (!previous) {
    return {
      hasBaseline: false,
      previousSnapshotAt: null,
      changes: [] as SiteChange[],
      summary: {
        pagesTracked: latest.pages.length,
        newPages: 0,
        removedPages: 0,
        changedPages: 0,
        warningSignals: latest.warnings.length,
      },
      warnings: latest.warnings,
    };
  }

  const previousMap = new Map(previous.pages.map((page) => [page.url, page]));
  const latestMap = new Map(latest.pages.map((page) => [page.url, page]));
  const changes: SiteChange[] = [];
  let newPages = 0;
  let removedPages = 0;
  let changedPages = 0;

  for (const page of latest.pages) {
    const before = previousMap.get(page.url);

    if (!before) {
      newPages += 1;
      changes.push({
        type: "page-added",
        severity: "medium",
        url: page.url,
        title: formatPageLabel(page),
        summary: `New page discovered at ${page.path}.`,
        action: "Review the page title, metadata, internal links, and conversion path so the new page launches in a search-ready state.",
      });
      continue;
    }

    let pageChanged = false;

    if (before.statusCode !== page.statusCode) {
      pageChanged = true;
      changes.push({
        type: "status-changed",
        severity: page.statusCode >= 400 ? "high" : "medium",
        url: page.url,
        title: formatPageLabel(page),
        summary: `Status changed from ${before.statusCode} to ${page.statusCode}.`,
        action: "Check redirects, template routing, and deployment changes before search visibility is affected.",
        before: String(before.statusCode),
        after: String(page.statusCode),
      });
    }

    if (before.hasNoindex !== page.hasNoindex) {
      pageChanged = true;
      changes.push({
        type: "indexability-changed",
        severity: page.hasNoindex ? "high" : "medium",
        url: page.url,
        title: formatPageLabel(page),
        summary: page.hasNoindex
          ? "The page is now marked noindex."
          : "The page is now indexable again.",
        action: "Confirm the intended indexation state and update robots directives if this change was accidental.",
        before: before.hasNoindex ? "noindex" : "index",
        after: page.hasNoindex ? "noindex" : "index",
      });
    }

    if (before.canonical !== page.canonical) {
      pageChanged = true;
      changes.push({
        type: "canonical-changed",
        severity: "medium",
        url: page.url,
        title: formatPageLabel(page),
        summary: "Canonical target changed.",
        action: "Confirm the canonical still points to the preferred live version of the page.",
        before: before.canonical || "Missing",
        after: page.canonical || "Missing",
      });
    }

    if (before.title !== page.title) {
      pageChanged = true;
      changes.push({
        type: "title-updated",
        severity: "low",
        url: page.url,
        title: formatPageLabel(page),
        summary: "Title tag or visible title changed.",
        action: "Validate that the new title still matches search intent and keeps the main keyword explicit.",
        before: before.title || "Missing",
        after: page.title || "Missing",
      });
    }

    if (before.metaDescription !== page.metaDescription) {
      pageChanged = true;
      changes.push({
        type: "meta-updated",
        severity: "low",
        url: page.url,
        title: formatPageLabel(page),
        summary: "Meta description changed.",
        action: "Check that the new meta description is still compelling, concise, and aligned with the page goal.",
        before: before.metaDescription || "Missing",
        after: page.metaDescription || "Missing",
      });
    }

    const wordDelta = Math.abs(page.wordCount - before.wordCount);
    if (before.pageHash !== page.pageHash && wordDelta >= 80) {
      pageChanged = true;
      changes.push({
        type: "content-shift",
        severity: wordDelta >= 200 ? "high" : "medium",
        url: page.url,
        title: formatPageLabel(page),
        summary: `Visible content changed meaningfully (${before.wordCount} -> ${page.wordCount} words).`,
        action: "Review the updated copy, headings, internal links, and schema so the content change strengthens rather than weakens organic intent.",
        before: `${before.wordCount} words`,
        after: `${page.wordCount} words`,
      });
    }

    if (pageChanged) {
      changedPages += 1;
    }
  }

  for (const page of previous.pages) {
    if (latestMap.has(page.url)) {
      continue;
    }

    removedPages += 1;
    changes.push({
      type: "page-removed",
      severity: "high",
      url: page.url,
      title: formatPageLabel(page),
      summary: `Previously tracked page ${page.path} is no longer discoverable in the current crawl set.`,
      action: "Check whether the page was removed intentionally, redirected properly, or dropped from the sitemap by mistake.",
    });
  }

  const warningSignals =
    latest.warnings.length +
    latest.pages.filter(
      (page) =>
        page.statusCode >= 400 ||
        page.hasNoindex ||
        page.imagesMissingAlt > 0 ||
        page.wordCount < 250
    ).length;

  return {
    hasBaseline: true,
    previousSnapshotAt: previous.generatedAt,
    changes: changes.sort((a, b) => severityRank(b.severity) - severityRank(a.severity)).slice(0, 24),
    summary: {
      pagesTracked: latest.pages.length,
      newPages,
      removedPages,
      changedPages,
      warningSignals,
    },
    warnings: latest.warnings,
  };
}
