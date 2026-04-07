import type {
  AuditIssue,
  AuditMetrics,
  AuditSnapshot,
  HtmlEvidence,
  Severity,
  TechnicalAuditResult,
} from "@/lib/studio-types";
import { fetchHtmlPage, inspectInfra, inspectPageHtml, normalizeAuditUrl } from "@/lib/site-crawler";

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
  evidence.push({ label, current: current || "Missing", solution, why });
}

function perfScore(value: number, good: number, poor: number) {
  if (value <= good) return 100;
  if (value >= poor) return 0;
  return Math.round(100 * (poor - value) / (poor - good));
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

  /* Derive a page topic for schema examples */
  const pageTopic = inspection.h1s[0] || inspection.title || finalUrlObject.pathname.replace(/[/-]/g, " ").trim() || "Page Topic";
  const brandName = finalUrlObject.hostname.replace(/^www\./, "").split(".")[0];
  const brandCapitalized = brandName.charAt(0).toUpperCase() + brandName.slice(1);

  /* ─── Status code ─── */

  if (fetched.statusCode >= 400) {
    pushIssue(insights, "technicalSeo", {
      title: "Page did not return a healthy status code",
      severity: "high",
      evidence: `The fetched URL returned HTTP ${fetched.statusCode}. Search engines and users may not reach the intended page reliably.`,
      action: "Fix the response status, redirect chain, or deployment issue before investing in on-page SEO work.",
    });
    pushEvidence(htmlEvidence, "Status code",
      `HTTP/${fetched.statusCode} — Server returned an error response`,
      `HTTP/200 — Page should return a successful status code\n\nCheck your server configuration, routing rules, or deployment pipeline to ensure this URL resolves correctly.`,
      "A non-200 status code prevents search engines from indexing the page and users from accessing it."
    );
  }

  /* ─── Title tag ─── */

  if (!inspection.title) {
    pushIssue(insights, "technicalSeo", {
      title: "Missing title tag",
      severity: "high",
      evidence: "The page has no <title> tag, so search engines do not have a strong primary headline for the result.",
      action: "Add a unique title tag that leads with the main keyword and ends with the brand name.",
    });
    pushEvidence(htmlEvidence, "Title tag",
      `<!-- No <title> tag found in <head> -->`,
      `<title>${pageTopic} | ${brandCapitalized}</title>\n\n<!-- Place inside <head>. Keep between 45-60 characters.\n     Lead with primary keyword, end with brand. -->`,
      "The title tag is the single highest-impact on-page SEO element. It directly affects CTR in search results and is a confirmed ranking signal."
    );
  } else if (metrics.titleLength < 35 || metrics.titleLength > 65) {
    pushIssue(insights, "technicalSeo", {
      title: "Title tag length is outside the ideal range",
      severity: "medium",
      evidence: `The current title is ${metrics.titleLength} characters long (ideal: 45-60). ${metrics.titleLength > 65 ? "It will be truncated in Google search results." : "It may appear too vague to generate strong click-through."}`,
      action: "Rewrite the title to 45-60 characters. Lead with the primary keyword, include a benefit, end with brand.",
    });
    pushEvidence(htmlEvidence, "Title tag",
      `<title>${inspection.title}</title>\n\n<!-- Current length: ${metrics.titleLength} characters\n     ${metrics.titleLength > 65 ? "⚠ Will be truncated in SERPs after ~60 chars" : "⚠ Too short — may not convey enough intent"} -->`,
      `<title>${inspection.title.length > 60 ? inspection.title.slice(0, 55) + " | " + brandCapitalized : inspection.title + " - " + brandCapitalized}</title>\n\n<!-- Target: 45-60 characters\n     Formula: [Primary Keyword] - [Benefit/Context] | [Brand]\n     Example: "Free AI Video Generator - Create HD Videos | ${brandCapitalized}" -->`,
      "Google displays roughly 50-60 characters of the title in SERPs. Titles outside this range either get truncated (losing your message) or look too thin to earn clicks."
    );
  }

  /* ─── Meta description ─── */

  if (!inspection.metaDescription) {
    pushIssue(insights, "contentQuality", {
      title: "Missing meta description",
      severity: "medium",
      evidence: "The page has no meta description. Google will auto-generate a snippet from page content, which often reads poorly and misses your key selling points.",
      action: "Write a 140-155 character description with the primary keyword, a clear benefit, and a call-to-action verb.",
    });
    pushEvidence(htmlEvidence, "Meta description",
      `<!-- No meta description found in <head> -->`,
      `<meta name="description" content="${pageTopic} — ${brandCapitalized} helps you get results fast. Try it free, no signup required.">\n\n<!-- Place inside <head>. Target: 140-155 characters.\n     Include: primary keyword + benefit + CTA verb\n     Example: "Create stunning AI videos from text in seconds. Free online tool, no login needed. Try ${brandCapitalized}'s video generator now." -->`,
      "While meta descriptions are not a direct ranking factor, they significantly impact CTR. Pages without them rely on Google's auto-generated snippets which often miss the page's value proposition."
    );
  } else if (metrics.metaDescriptionLength < 110 || metrics.metaDescriptionLength > 165) {
    pushIssue(insights, "contentQuality", {
      title: "Meta description needs tightening",
      severity: "low",
      evidence: `The current description is ${metrics.metaDescriptionLength} characters (ideal: 140-155). ${metrics.metaDescriptionLength > 165 ? "Google will truncate it mid-sentence." : "It may not use enough space to communicate value."}`,
      action: "Rewrite to 140-155 characters: include the primary keyword, a benefit statement, and an action verb.",
    });
    pushEvidence(htmlEvidence, "Meta description",
      `<meta name="description" content="${inspection.metaDescription}">\n\n<!-- Current length: ${metrics.metaDescriptionLength} characters\n     ${metrics.metaDescriptionLength > 165 ? "⚠ Will be truncated" : "⚠ Underutilized space"} -->`,
      `<meta name="description" content="${inspection.metaDescription.length > 155 ? inspection.metaDescription.slice(0, 152) + "..." : inspection.metaDescription}">\n\n<!-- Target: 140-155 characters\n     Structure: [What it does] + [Key benefit] + [CTA]\n     Tip: Front-load the primary keyword in the first 70 chars -->`,
      "Google displays roughly 155-160 characters in desktop SERPs. Descriptions outside this range either get truncated or waste valuable space to convince searchers to click."
    );
  }

  /* ─── Canonical ─── */

  if (!inspection.canonical) {
    pushIssue(insights, "technicalSeo", {
      title: "Canonical tag is missing",
      severity: "medium",
      evidence: "The page does not declare a canonical URL. Without it, search engines may split ranking signals across duplicate or similar URLs (with/without trailing slash, query parameters, etc.).",
      action: "Add a self-referencing canonical link tag pointing to the preferred URL.",
    });
    pushEvidence(htmlEvidence, "Canonical",
      `<!-- No canonical tag found in <head> -->`,
      `<link rel="canonical" href="${finalUrl}" />\n\n<!-- Place inside <head>, before any other link tags.\n     Rules:\n     1. Always self-reference the current preferred URL\n     2. Use absolute URLs (not relative)\n     3. Use the same protocol (https) consistently\n     4. Choose with or without trailing slash and stick to it -->`,
      "Without a canonical tag, Google must guess which URL version to index. This can dilute ranking signals across duplicate URLs, especially on sites with query parameters, pagination, or mixed www/non-www versions."
    );
  }

  /* ─── Noindex ─── */

  if (inspection.hasNoindex) {
    pushIssue(insights, "technicalSeo", {
      title: "Page is marked noindex",
      severity: "high",
      evidence: `The robots meta contains "${inspection.robotsMeta}". This directive blocks the page from appearing in any search engine index.`,
      action: "Remove the noindex directive if this page should be discoverable in search.",
    });
    pushEvidence(htmlEvidence, "Robots meta",
      `<meta name="robots" content="${inspection.robotsMeta}">\n\n<!-- ⚠ This page is BLOCKED from search engine indexing -->`,
      `<meta name="robots" content="index, follow">\n\n<!-- This allows search engines to:\n     - index: Include the page in search results\n     - follow: Crawl links found on this page\n     \n     Only use noindex for pages like:\n     - Thank you / confirmation pages\n     - Internal search result pages\n     - Staging/preview environments -->`,
      "The noindex directive is one of the strongest signals to search engines. It completely removes the page from search results regardless of other optimization efforts."
    );
  }

  /* ─── Language attribute ─── */

  if (!inspection.hasLang) {
    pushIssue(insights, "technicalSeo", {
      title: "HTML language attribute is missing",
      severity: "low",
      evidence: "The <html> element has no lang attribute. Screen readers cannot determine the page language, and search engines get a weaker language targeting signal.",
      action: "Add a lang attribute matching the page's primary language.",
    });
    pushEvidence(htmlEvidence, "Language attribute",
      `<html>\n  <!-- No lang attribute specified -->`,
      `<html lang="en">\n\n<!-- Common values:\n     lang="en"    — English\n     lang="en-US" — American English\n     lang="es"    — Spanish\n     lang="de"    — German\n     lang="fr"    — French\n     \n     For multi-language sites, also add hreflang tags:\n     <link rel="alternate" hreflang="es" href="https://example.com/es/" /> -->`,
      "The lang attribute helps search engines serve the right version of your page to users searching in that language. It's also critical for accessibility — screen readers use it to select the correct pronunciation rules."
    );
  }

  /* ─── Viewport ─── */

  if (!inspection.hasViewport) {
    pushIssue(insights, "technicalSeo", {
      title: "Viewport meta tag is missing",
      severity: "medium",
      evidence: "The page does not declare a viewport meta tag. Mobile browsers will render the page at desktop width and scale it down, leading to tiny unreadable text and failed Core Web Vitals.",
      action: "Add the standard responsive viewport meta tag.",
    });
    pushEvidence(htmlEvidence, "Viewport",
      `<!-- No viewport meta tag found in <head> -->`,
      `<meta name="viewport" content="width=device-width, initial-scale=1">\n\n<!-- Place inside <head>.\n     This is REQUIRED for mobile-first indexing.\n     Without it:\n     - Google may not consider the page mobile-friendly\n     - CLS and LCP scores will be penalized\n     - Users see a zoomed-out desktop layout on mobile -->`,
      "Google uses mobile-first indexing by default. Without a viewport tag, the page fails Google's mobile-friendly test and may rank lower in mobile search results."
    );
  }

  /* ─── H1 ─── */

  if (inspection.h1s.length === 0) {
    pushIssue(insights, "contentQuality", {
      title: "The page has no H1",
      severity: "high",
      evidence: "Search engines and users do not get a clear top-level topic heading. The H1 is the most important on-page heading for establishing page topic relevance.",
      action: "Add one visible H1 that matches the main intent of the page without duplicating the title word-for-word.",
    });
    pushEvidence(htmlEvidence, "H1 heading",
      `<!-- No <h1> tag found on the page -->\n\n<!-- The heading hierarchy starts at H2 or lower,\n     which weakens the page's topical signal -->`,
      `<h1>${pageTopic}</h1>\n\n<!-- Rules for a strong H1:\n     1. Exactly ONE H1 per page\n     2. Include the primary keyword naturally\n     3. Don't duplicate the <title> word-for-word\n     4. Place it above the fold in the visible content\n     5. Keep it under 70 characters -->`,
      "The H1 is the primary heading signal that tells both users and search engines what the page is about. Pages without an H1 lose a significant topical relevance signal."
    );
  } else if (inspection.h1s.length > 1) {
    pushIssue(insights, "contentQuality", {
      title: "Multiple H1s dilute the page hierarchy",
      severity: "medium",
      evidence: `The page contains ${inspection.h1s.length} H1 tags: ${inspection.h1s.map((h) => `"${h}"`).join(", ")}. Multiple H1s blur which topic the page primarily targets.`,
      action: "Keep the most relevant H1 and convert the rest into H2 or H3 headings.",
    });
    pushEvidence(htmlEvidence, "H1 heading",
      `<!-- ${inspection.h1s.length} H1 tags found: -->\n${inspection.h1s.map((h) => `<h1>${h}</h1>`).join("\n")}`,
      `<!-- Keep only the primary H1: -->\n<h1>${inspection.h1s[0]}</h1>\n\n<!-- Convert others to H2: -->\n${inspection.h1s.slice(1).map((h) => `<h2>${h}</h2>`).join("\n")}\n\n<!-- Correct heading hierarchy:\n     H1 → Main page topic (only one)\n     H2 → Major sections\n     H3 → Subsections within H2 -->`,
      "While Google says multiple H1s are technically fine, best practice is one H1 per page. Multiple H1s make it harder for search engines to determine the primary topic and can confuse the content hierarchy."
    );
  }

  /* ─── Subheadings ─── */

  if (inspection.h2s.length === 0) {
    pushIssue(insights, "contentQuality", {
      title: "Subheading structure is thin",
      severity: "low",
      evidence: "The page has no H2 sections. Without subheadings, the page is harder to scan, and search engines miss subtopic signals that could help the page rank for related queries.",
      action: "Break the page into clear H2 sections covering key subtopics.",
    });
    pushEvidence(htmlEvidence, "Heading structure",
      `<!-- No <h2> tags found -->\n<!-- Page content appears as a single unstructured block -->`,
      `<h1>${pageTopic}</h1>\n\n<h2>How It Works</h2>\n<p>Step-by-step explanation...</p>\n\n<h2>Key Features</h2>\n<p>Feature details...</p>\n\n<h2>Use Cases</h2>\n<p>Real-world applications...</p>\n\n<h2>Frequently Asked Questions</h2>\n<p>Common Q&A pairs...</p>\n\n<!-- Add 4-8 H2 sections that cover:\n     - How it works / Getting started\n     - Features / Benefits\n     - Use cases / Examples\n     - Pricing / Comparison\n     - FAQ (enables FAQ schema) -->`,
      "H2 headings create topical clusters that help search engines understand what subtopics the page covers. Pages with well-structured headings can rank for long-tail queries related to each section."
    );
  }

  /* ─── Content depth ─── */

  if (inspection.wordCount < 250) {
    pushIssue(insights, "contentQuality", {
      title: "Page content is very thin",
      severity: "high",
      evidence: `The page has about ${inspection.wordCount} words of visible copy. For competitive queries, this is far below the typical top-ranking page (800-2000+ words). Thin content signals low expertise to search engines.`,
      action: "Expand with practical sections: how-it-works, features, use cases, comparisons, FAQ, and proof points.",
    });
    pushEvidence(htmlEvidence, "Content depth",
      `<!-- Current visible content: ~${inspection.wordCount} words -->\n<!-- This is considered "thin content" by search engines -->\n\n<!-- Typical word counts for top-ranking pages:\n     Tool pages: 800-1500 words\n     Blog posts: 1500-3000 words\n     Landing pages: 500-1200 words -->`,
      `<!-- Recommended content structure to reach 800+ words: -->\n\n<h2>How It Works</h2>\n<p>3-step process explanation (~100 words)</p>\n\n<h2>Key Features</h2>\n<p>4-6 features with descriptions (~200 words)</p>\n\n<h2>Use Cases</h2>\n<p>3-5 practical applications (~150 words)</p>\n\n<h2>Tips for Better Results</h2>\n<p>3-4 actionable tips (~100 words)</p>\n\n<h2>Frequently Asked Questions</h2>\n<p>5-8 Q&A pairs (~250 words)</p>\n\n<!-- Total target: 800-1200 words of helpful, specific content -->`,
      "Google's Helpful Content system penalizes thin pages that don't provide enough value. Pages with fewer than 300 words rarely rank for competitive queries because they can't demonstrate sufficient expertise."
    );
  } else if (inspection.wordCount < 500) {
    pushIssue(insights, "contentQuality", {
      title: "Page could use more semantic depth",
      severity: "medium",
      evidence: `The page has roughly ${inspection.wordCount} words. While not critically thin, top-ranking competitors for similar queries typically have 800-1500+ words of helpful content.`,
      action: "Add supporting sections: use cases, comparisons, tips, and an expanded FAQ.",
    });
  }

  /* ─── Images missing alt ─── */

  if (inspection.imagesMissingAlt > 0) {
    pushIssue(insights, "technicalSeo", {
      title: "Some images are missing alt text",
      severity: inspection.imagesMissingAlt > 3 ? "medium" : "low",
      evidence: `${inspection.imagesMissingAlt} of ${inspection.images} image${inspection.images === 1 ? "" : "s"} have no alt attribute. This weakens accessibility (screen readers skip these images) and misses image search ranking opportunities.`,
      action: "Add descriptive alt text to meaningful images. Use empty alt=\"\" only for purely decorative images.",
    });
    pushEvidence(htmlEvidence, "Image alt text",
      `<!-- ${inspection.imagesMissingAlt} images missing alt text -->\n<img src="image.jpg">\n<img src="photo.png">\n\n<!-- These images are invisible to:\n     - Screen readers (accessibility violation)\n     - Google Image Search (missed traffic)\n     - Pinterest/social crawlers -->`,
      `<!-- Add descriptive alt text to each meaningful image: -->\n<img src="image.jpg" alt="${pageTopic} - example result">\n<img src="photo.png" alt="Before and after comparison of ${pageTopic.toLowerCase()}">\n\n<!-- Alt text best practices:\n     ✓ Describe what the image shows\n     ✓ Include keywords naturally (don't stuff)\n     ✓ Keep under 125 characters\n     ✓ Use alt="" for decorative images only\n     ✗ Don't start with "Image of..." or "Picture of..."\n     ✗ Don't repeat the same alt on every image -->`,
      "Images with good alt text can drive significant traffic from Google Image Search. Alt text is also a legal requirement under WCAG 2.1 accessibility guidelines and can affect your page's Core Web Vitals accessibility score."
    );
  }

  /* ─── Internal links ─── */

  if (inspection.internalLinks < 3) {
    pushIssue(insights, "technicalSeo", {
      title: "Internal linking is too sparse",
      severity: "medium",
      evidence: `Only ${inspection.internalLinks} internal link${inspection.internalLinks === 1 ? "" : "s"} detected. Weak internal linking limits crawl depth, reduces link equity distribution, and misses opportunities to establish topical clusters.`,
      action: "Add 5-10 contextual internal links to related pages, tools, guides, and categories.",
    });
    pushEvidence(htmlEvidence, "Internal links",
      `<!-- Only ${inspection.internalLinks} internal links found on the page -->\n\n<!-- Low internal linking causes:\n     - Orphaned pages that search engines can't discover\n     - Poor distribution of page authority\n     - Missed topical cluster signals -->`,
      `<!-- Add contextual internal links throughout the content: -->\n\n<p>Learn more about <a href="/tools/image-upscaler">AI image upscaling</a> or try our <a href="/tools/background-remover">background remover</a>.</p>\n\n<!-- Add a "Related Tools" or "You might also like" section: -->\n<section>\n  <h2>Related Tools</h2>\n  <ul>\n    <li><a href="/tools/tool-1">Related Tool 1</a></li>\n    <li><a href="/tools/tool-2">Related Tool 2</a></li>\n    <li><a href="/blog/guide">Complete Guide</a></li>\n  </ul>\n</section>\n\n<!-- Target: 5-10 internal links per page\n     - Use descriptive anchor text (not "click here")\n     - Link to related tools, guides, and categories\n     - Place links within body content, not just nav -->`,
      "Internal links are one of the most powerful SEO levers you control. They help Google discover and understand the relationship between pages, distribute authority, and establish topical relevance clusters."
    );
  }

  /* ─── Structured data / Schema ─── */

  if (!inspection.hasSchema) {
    pushIssue(insights, "technicalSeo", {
      title: "Structured data is missing",
      severity: "low",
      evidence: `No JSON-LD structured data detected on the page. Without schema markup, the page is ineligible for rich results (FAQ dropdowns, how-to steps, star ratings, etc.) in search.`,
      action: "Add JSON-LD schema matching the page type. For tool pages, use WebApplication + FAQPage. For articles, use Article schema.",
    });

    const faqExample = inspection.h2s.length > 0
      ? inspection.h2s.slice(0, 3).map((h2) => `    {\n      "@type": "Question",\n      "name": "${h2}?",\n      "acceptedAnswer": {\n        "@type": "Answer",\n        "text": "Detailed answer about ${h2.toLowerCase()}..."\n      }\n    }`).join(",\n")
      : `    {\n      "@type": "Question",\n      "name": "How does ${pageTopic.toLowerCase()} work?",\n      "acceptedAnswer": {\n        "@type": "Answer",\n        "text": "Detailed explanation of how ${pageTopic.toLowerCase()} works..."\n      }\n    },\n    {\n      "@type": "Question",\n      "name": "Is ${pageTopic.toLowerCase()} free to use?",\n      "acceptedAnswer": {\n        "@type": "Answer",\n        "text": "Yes, you can use ${pageTopic.toLowerCase()} for free with..."\n      }\n    }`;

    pushEvidence(htmlEvidence, "Structured data",
      `<!-- No <script type="application/ld+json"> found -->\n\n<!-- Without structured data, this page cannot get:\n     - FAQ rich results (expandable Q&A in SERPs)\n     - How-To rich results\n     - Product/Rating stars\n     - Breadcrumb trails\n     - Sitelinks searchbox -->`,
      `<!-- Add this JSON-LD to <head> or end of <body>: -->\n\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebApplication",\n  "name": "${pageTopic}",\n  "url": "${finalUrl}",\n  "description": "${inspection.metaDescription || pageTopic + " - Free online tool"}",\n  "applicationCategory": "MultimediaApplication",\n  "operatingSystem": "Web",\n  "offers": {\n    "@type": "Offer",\n    "price": "0",\n    "priceCurrency": "USD"\n  },\n  "provider": {\n    "@type": "Organization",\n    "name": "${brandCapitalized}",\n    "url": "${origin}"\n  }\n}\n</script>\n\n<!-- Also add FAQPage schema for FAQ sections: -->\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [\n${faqExample}\n  ]\n}\n</script>\n\n<!-- Validate at: https://search.google.com/test/rich-results -->`,
      "Structured data enables rich results in Google Search — FAQ dropdowns, star ratings, how-to steps, and more. Pages with rich results see 20-30% higher CTR. FAQPage schema is the easiest to implement and can appear within days."
    );
  }

  /* ─── Open Graph ─── */

  if (!inspection.hasOpenGraph) {
    pushIssue(insights, "contentQuality", {
      title: "Social preview metadata is incomplete",
      severity: "low",
      evidence: "Open Graph title and/or description tags were not both detected. When shared on LinkedIn, Facebook, Slack, or messaging apps, the page will show a generic or broken preview.",
      action: "Add complete Open Graph tags for consistent social sharing previews.",
    });
    pushEvidence(htmlEvidence, "Open Graph tags",
      `<!-- Missing or incomplete Open Graph tags -->\n${inspection.ogTitle ? `<meta property="og:title" content="${inspection.ogTitle}">` : "<!-- og:title: MISSING -->"}\n${inspection.ogDescription ? `<meta property="og:description" content="${inspection.ogDescription}">` : "<!-- og:description: MISSING -->"}`,
      `<meta property="og:type" content="website">\n<meta property="og:title" content="${inspection.title || pageTopic}">\n<meta property="og:description" content="${inspection.metaDescription || pageTopic + " - Free online tool by " + brandCapitalized}">\n<meta property="og:url" content="${finalUrl}">\n<meta property="og:image" content="${origin}/og-image.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:site_name" content="${brandCapitalized}">\n\n<!-- Best practices:\n     - og:image should be 1200x630px\n     - og:title can differ from <title> (optimize for social)\n     - Test at: https://developers.facebook.com/tools/debug/ -->`,
      "Open Graph tags control how your page appears when shared on social media. A good social preview with a compelling image and title can drive significant referral traffic. Links without OG tags often show broken or generic previews."
    );
  }

  /* ─── Twitter card ─── */

  if (!inspection.hasTwitterCard) {
    pushIssue(insights, "contentQuality", {
      title: "Twitter card metadata is missing",
      severity: "low",
      evidence: "No twitter:card tag was detected. Twitter (X) and other platforms that read Twitter card tags will fall back to Open Graph or show a plain text link.",
      action: "Add Twitter card tags for consistent previews on X/Twitter.",
    });
    pushEvidence(htmlEvidence, "Twitter card",
      `<!-- No twitter:card meta tag found -->`,
      `<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${inspection.title || pageTopic}">\n<meta name="twitter:description" content="${inspection.metaDescription || pageTopic + " - Free online tool"}">\n<meta name="twitter:image" content="${origin}/twitter-card.png">\n\n<!-- Card types:\n     summary             — Small square image + text\n     summary_large_image — Large banner image (recommended)\n     \n     Test at: https://cards-dev.twitter.com/validator -->`,
      "Twitter card tags ensure your content looks professional when shared on X/Twitter. The summary_large_image card type shows a prominent image preview that drives 40% more engagement than plain text links."
    );
  }

  /* ─── robots.txt ─── */

  if (!infra.hasRobotsTxt) {
    pushIssue(insights, "technicalSeo", {
      title: "robots.txt is missing or inaccessible",
      severity: "medium",
      evidence: `No valid robots.txt was found at ${origin}/robots.txt. Without it, search engines may crawl inefficiently, wasting crawl budget on low-value pages.`,
      action: "Create a robots.txt file that allows important pages and blocks low-value paths.",
    });
    pushEvidence(htmlEvidence, "robots.txt",
      `<!-- ${origin}/robots.txt returned an error or was not found -->`,
      `# robots.txt — place at site root\n# ${origin}/robots.txt\n\nUser-agent: *\nAllow: /\n\n# Block low-value paths\nDisallow: /api/\nDisallow: /admin/\nDisallow: /_next/\nDisallow: /search?\n\n# Point to sitemap\nSitemap: ${origin}/sitemap.xml\n\n# Tips:\n# - Don't block CSS/JS (Google needs them to render)\n# - Don't block images you want in Image Search\n# - Test at: Google Search Console → robots.txt Tester`,
      "robots.txt tells search engines which parts of your site to crawl. Without one, crawlers may waste time on API endpoints, admin pages, or duplicate content instead of focusing on your important pages."
    );
  }

  /* ─── Sitemap ─── */

  if (!infra.hasSitemap) {
    pushIssue(insights, "technicalSeo", {
      title: "XML sitemap is missing or hard to discover",
      severity: "medium",
      evidence: `No working sitemap.xml was found. Large or dynamically generated sites especially need sitemaps to ensure search engines discover all important pages.`,
      action: "Generate a sitemap.xml and reference it from robots.txt.",
    });
    pushEvidence(htmlEvidence, "Sitemap",
      `<!-- ${origin}/sitemap.xml was not found or returned an error -->`,
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${finalUrl}</loc>\n    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n  <!-- Add all important public pages -->\n</urlset>\n\n<!-- Place at: ${origin}/sitemap.xml\n     Then add to robots.txt:\n     Sitemap: ${origin}/sitemap.xml\n     \n     Also submit in Google Search Console:\n     Sitemaps → Add a new sitemap -->`,
      "XML sitemaps help search engines discover pages faster, especially new or deeply nested pages. Google recommends sitemaps for sites with 500+ pages, dynamically generated content, or pages with few external links pointing to them."
    );
  }

  /* ─── Performance: detailed breakdown ─── */

  const domScore = perfScore(inspection.domNodes, 800, 2500);
  const scriptScore = perfScore(inspection.scripts, 10, 30);
  const imageScore = perfScore(inspection.images, 15, 50);
  const stylesheetScore = perfScore(inspection.stylesheets, 3, 10);
  const overallPerfScore = Math.round((domScore + scriptScore + imageScore + stylesheetScore) / 4);

  // DOM size
  if (inspection.domNodes > 800) {
    const domSeverity: Severity = inspection.domNodes > 2000 ? "high" : inspection.domNodes > 1200 ? "medium" : "low";
    pushIssue(insights, "pagePerformance", {
      title: "DOM size is large",
      severity: domSeverity,
      evidence: `The page has ${inspection.domNodes} DOM nodes (recommended: <800, warning: >1200, critical: >2000). A large DOM increases memory usage, slows style calculations, and degrades Interaction to Next Paint (INP).`,
      action: "Reduce DOM depth by flattening nested wrappers, using virtual scrolling for long lists, and removing hidden elements.",
    });
    pushEvidence(htmlEvidence, "DOM size",
      `<!-- Current DOM: ${inspection.domNodes} nodes -->\n<!-- Score: ${domScore}/100 -->\n\n<!-- Benchmarks:\n     ✓ Good: <800 nodes\n     ⚠ Warning: 800-1500 nodes\n     ✗ Poor: >1500 nodes\n     ✗ Critical: >2000 nodes\n\n     Impact: Every DOM node adds to:\n     - Memory consumption\n     - Style recalculation time\n     - Layout thrashing\n     - JavaScript query performance -->`,
      `<!-- Reduce DOM nodes to under 800: -->\n\n<!-- 1. Remove unnecessary wrapper divs -->\n<!-- Before: -->\n<div class="wrapper">\n  <div class="container">\n    <div class="inner">\n      <p>Content</p>\n    </div>\n  </div>\n</div>\n\n<!-- After: -->\n<div class="container">\n  <p>Content</p>\n</div>\n\n<!-- 2. Lazy-render off-screen content -->\n<!-- 3. Use CSS Grid/Flexbox instead of nested divs -->\n<!-- 4. Remove hidden elements (display:none still adds to DOM) -->\n<!-- 5. Virtualize long lists (react-window, etc.) -->`,
      "Google's Lighthouse flags pages with >1400 DOM nodes. Excessive DOM size is one of the top causes of poor INP (Interaction to Next Paint), which is a Core Web Vital directly affecting rankings."
    );
  }

  // Script count
  if (inspection.scripts > 10) {
    const scriptSeverity: Severity = inspection.scripts > 25 ? "high" : inspection.scripts > 18 ? "medium" : "low";
    pushIssue(insights, "pagePerformance", {
      title: "Too many JavaScript files",
      severity: scriptSeverity,
      evidence: `The page loads ${inspection.scripts} script files (recommended: <10, warning: >15). Each script can block rendering, increase Total Blocking Time (TBT), and degrade First Contentful Paint (FCP).`,
      action: "Audit scripts: remove unused ones, defer non-critical scripts, and bundle where possible.",
    });
    pushEvidence(htmlEvidence, "JavaScript files",
      `<!-- ${inspection.scripts} script tags detected -->\n<!-- Score: ${scriptScore}/100 -->\n\n<!-- Benchmarks:\n     ✓ Good: <10 scripts\n     ⚠ Warning: 10-20 scripts  \n     ✗ Poor: >20 scripts\n\n     Each script causes:\n     - Network request overhead\n     - Parse + compile time\n     - Potential render-blocking\n     - Increased TBT (Total Blocking Time) -->`,
      `<!-- Optimization strategies: -->\n\n<!-- 1. Defer non-critical scripts -->\n<script src="analytics.js" defer></script>\n\n<!-- 2. Async for independent scripts -->\n<script src="widget.js" async></script>\n\n<!-- 3. Remove unused scripts -->\n<!-- Run: chrome://inspect → Coverage tab -->\n\n<!-- 4. Bundle multiple small scripts -->\n<!-- Use a bundler (webpack/vite) to combine files -->\n\n<!-- 5. Lazy-load below-fold scripts -->\n<script>\n  // Load chat widget only when user scrolls down\n  const observer = new IntersectionObserver(() => {\n    import('./chat-widget.js');\n  });\n  observer.observe(document.querySelector('#footer'));\n</script>`,
      "Every JavaScript file adds network latency and CPU processing time. Unoptimized scripts are the #1 cause of poor Total Blocking Time (TBT) and Largest Contentful Paint (LCP), both of which are Core Web Vitals."
    );
  }

  // Image count
  if (inspection.images > 15) {
    const imgSeverity: Severity = inspection.images > 40 ? "medium" : "low";
    pushIssue(insights, "pagePerformance", {
      title: "High image count on page",
      severity: imgSeverity,
      evidence: `The page contains ${inspection.images} images (recommended: <15 above-fold). Unoptimized images are the largest contributor to page weight and slow Largest Contentful Paint (LCP).`,
      action: "Lazy-load images below the fold, use modern formats (WebP/AVIF), and add explicit width/height to prevent layout shift.",
    });
    pushEvidence(htmlEvidence, "Image optimization",
      `<!-- ${inspection.images} images detected -->\n<!-- Score: ${imageScore}/100 -->\n\n<!-- Benchmarks:\n     ✓ Good: <15 images\n     ⚠ Warning: 15-30 images\n     ✗ Poor: >30 images\n\n     Images typically account for 50-80% of page weight -->`,
      `<!-- 1. Lazy-load below-fold images -->\n<img src="photo.webp" loading="lazy" alt="Description">\n\n<!-- 2. Use modern formats -->\n<picture>\n  <source srcset="photo.avif" type="image/avif">\n  <source srcset="photo.webp" type="image/webp">\n  <img src="photo.jpg" alt="Description">\n</picture>\n\n<!-- 3. Always set dimensions (prevents CLS) -->\n<img src="photo.webp" width="800" height="600" alt="...">\n\n<!-- 4. Use responsive images -->\n<img srcset="small.webp 400w, medium.webp 800w, large.webp 1200w"\n     sizes="(max-width: 600px) 400px, 800px"\n     src="medium.webp" alt="...">`,
      "Images account for the majority of page bytes on most websites. Unoptimized images are the most common cause of poor LCP (Largest Contentful Paint). Using WebP/AVIF can reduce image size by 25-50% compared to JPEG/PNG."
    );
  }

  // Stylesheet count
  if (inspection.stylesheets > 3) {
    pushIssue(insights, "pagePerformance", {
      title: "Multiple render-blocking stylesheets",
      severity: inspection.stylesheets > 7 ? "medium" : "low",
      evidence: `The page references ${inspection.stylesheets} stylesheet files (recommended: <3). CSS is render-blocking by default — the browser cannot paint anything until all stylesheets are downloaded and parsed.`,
      action: "Inline critical CSS, defer non-critical styles, and reduce stylesheet fragmentation.",
    });
    pushEvidence(htmlEvidence, "Stylesheets",
      `<!-- ${inspection.stylesheets} stylesheet files detected -->\n<!-- Score: ${stylesheetScore}/100 -->\n\n<!-- Each stylesheet blocks rendering:\n     Browser download → Parse CSS → Build CSSOM → First Paint\n     More stylesheets = longer render-blocking chain -->`,
      `<!-- 1. Inline critical above-fold CSS -->\n<style>\n  /* Critical CSS for above-fold content */\n  .hero { display: flex; }\n  .nav { position: sticky; }\n</style>\n\n<!-- 2. Defer non-critical CSS -->\n<link rel="preload" href="styles.css" as="style"\n      onload="this.onload=null;this.rel='stylesheet'">\n<noscript><link rel="stylesheet" href="styles.css"></noscript>\n\n<!-- 3. Combine stylesheets -->\n<!-- Instead of 5 small CSS files, bundle into 1-2 files -->\n\n<!-- 4. Remove unused CSS -->\n<!-- Run Chrome DevTools → Coverage tab to find unused rules -->`,
      "Render-blocking CSS is the second most common cause of slow FCP (First Contentful Paint). Each external stylesheet requires a network round-trip before the browser can show anything to the user."
    );
  }

  /* ─── Calculate final score ─── */

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
