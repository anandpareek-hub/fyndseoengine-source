import { prisma } from "@/lib/prisma";
import {
  getDomainOverview,
  getRankedKeywords,
  getRelevantPages,
  getCompetitorDomains,
  getDomainIntersection,
  getBulkTrafficEstimation,
  getKeywordSuggestions,
  getBacklinksSummary,
  getBacklinkAnchors,
  getTopBacklinks,
  runLighthouse,
} from "@/lib/dataforseo";
import {
  searchGoogle,
  getAutocomplete,
} from "@/lib/serper";
import { askClaudeJSON } from "@/lib/ai";
import { resolveGeo } from "@/lib/geo";

type DFSCreds = { login: string; password: string };

export async function runSeoAudit(siteId: string): Promise<string> {
  // 1. Fetch site from DB, get API credentials
  const site = await prisma.site.findUniqueOrThrow({
    where: { id: siteId },
  });

  const dfsCreds: DFSCreds | null = site.dataForSeoLogin && site.dataForSeoPassword
    ? { login: site.dataForSeoLogin, password: site.dataForSeoPassword }
    : null;
  const serperKey = site.serperApiKey || null;
  const domain = site.domain.replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "");

  // Resolve geo targeting: targetRegions → domain TLD → default US
  const geo = resolveGeo(site.domain, site.targetRegions);
  const loc = geo.locationCode;
  const lang = geo.languageCode;
  const gl = geo.countryCode;
  console.log(`[audit] Geo target: ${geo.label} (location=${loc}, lang=${lang}, gl=${gl}) for ${domain}`);

  // Create audit record
  const audit = await prisma.seoAudit.create({
    data: {
      siteId,
      status: "running",
      phase: "starting",
    },
  });

  try {
    // ═══════════════════════════════════════════
    // PHASE 1: Domain Intelligence
    // ═══════════════════════════════════════════
    console.log(`[audit] Phase 1: Domain Intelligence for ${domain}`);
    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: { phase: "domain_intel" },
    });

    let domainOverview = null;
    let rankedKeywords: any[] = [];
    let quickWins: any[] = [];
    let topPages: any[] = [];

    if (dfsCreds) {
      try {
        const [overview, ranked, pages] = await Promise.all([
          getDomainOverview(dfsCreds, domain, loc, lang).catch(() => null),
          getRankedKeywords(dfsCreds, domain, loc, lang, 100).catch(() => []),
          getRelevantPages(dfsCreds, domain, loc, lang, 20).catch(() => []),
        ]);

        domainOverview = overview;
        rankedKeywords = ranked;
        topPages = pages;

        // Quick wins: keywords at positions 4-20 with decent search volume
        quickWins = rankedKeywords
          .filter((k) => k.position >= 4 && k.position <= 20 && k.searchVolume >= 100)
          .sort((a, b) => {
            // Score: higher volume + closer to top = better opportunity
            const scoreA = a.searchVolume * (1 / a.position);
            const scoreB = b.searchVolume * (1 / b.position);
            return scoreB - scoreA;
          })
          .slice(0, 20);
      } catch (e) {
        console.error("[audit] Phase 1 error:", e);
      }
    }

    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: {
        domainOverview: domainOverview as any,
        rankedKeywords: rankedKeywords.slice(0, 50) as any,
        quickWins: quickWins as any,
        topPages: topPages as any,
      },
    });

    // ═══════════════════════════════════════════
    // PHASE 2: Competitor Analysis
    console.log(`[audit] Phase 2: Competitor Analysis`);
    // ═══════════════════════════════════════════
    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: { phase: "competitors" },
    });

    let competitors: any[] = [];
    let contentGaps: any[] = [];
    let competitorTraffic: any[] = [];

    if (dfsCreds) {
      try {
        // Get competitor domains from API
        let apiCompetitors: any[] = await getCompetitorDomains(dfsCreds, domain, loc, lang).catch(() => []);

        // Merge with user-configured competitors from settings
        const userCompetitors = (site.competitors || []).filter(Boolean);
        const apiDomains = new Set(apiCompetitors.map((c) => c.domain));
        for (const uc of userCompetitors) {
          const cleanUc = uc.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
          if (!apiDomains.has(cleanUc)) {
            apiCompetitors.unshift({
              domain: cleanUc,
              avgPosition: 0,
              serpCount: 0,
              intersections: 0,
              competitorRelevance: 1,
            });
          }
        }
        competitors = apiCompetitors.slice(0, 10);

        if (competitors.length > 0) {
          // Get traffic comparison for top 5 competitors
          const topCompDomains = competitors.slice(0, 5).map((c) => c.domain);
          competitorTraffic = await getBulkTrafficEstimation(
            dfsCreds,
            [domain, ...topCompDomains],
            loc,
            lang
          ).catch(() => []);

          // Content gap: keywords top competitor ranks for that we don't
          const topCompetitor = competitors[0]?.domain;
          if (topCompetitor) {
            contentGaps = await getDomainIntersection(
              dfsCreds,
              domain,
              topCompetitor,
              loc,
              lang,
              50
            ).catch(() => []);
          }
        }
      } catch (e) {
        console.error("[audit] Phase 2 error:", e);
      }
    }

    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: {
        competitors: competitors as any,
        contentGaps: contentGaps as any,
        competitorTraffic: competitorTraffic as any,
      },
    });

    // ═══════════════════════════════════════════
    // PHASE 3: Keyword Research
    console.log(`[audit] Phase 3: Keyword Research`);
    // ═══════════════════════════════════════════
    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: { phase: "keywords" },
    });

    let keywordSuggestions: any[] = [];
    let peopleAlsoAsk: string[] = [];
    let autocompleteSuggestions: string[] = [];
    let relatedSearches: string[] = [];

    // Use existing scan data keywords as seeds, or top ranked keywords, or industry
    const scanData = site.scanData as Record<string, any> | null;
    const seedKeywords = [
      ...(scanData?.suggestedKeywords || []).slice(0, 3),
      ...(site.topicsOfInterest || []).slice(0, 2),
    ].filter(Boolean);

    const mainSeed = seedKeywords[0] || site.industry || domain;

    if (dfsCreds && mainSeed) {
      try {
        keywordSuggestions = await getKeywordSuggestions(
          dfsCreds,
          [mainSeed],
          loc,
          lang
        ).catch(() => []);
      } catch (e) {
        console.error("[audit] Phase 3 DFS error:", e);
      }
    }

    if (serperKey && mainSeed) {
      try {
        // Get PAA, related searches from SERP (geo-targeted)
        const serpResult = await searchGoogle(serperKey, mainSeed, { country: gl, language: lang, numResults: 10 }).catch(() => null);
        if (serpResult) {
          peopleAlsoAsk = serpResult.peopleAlsoAsk || [];
          relatedSearches = serpResult.relatedSearches || [];
        }

        // Get autocomplete for main seed + 2 more
        const autoPromises = [mainSeed, ...seedKeywords.slice(1, 3)].map((kw) =>
          getAutocomplete(serperKey, kw, { country: gl, language: lang }).catch(() => [])
        );
        const autoResults = await Promise.all(autoPromises);
        autocompleteSuggestions = [...new Set(autoResults.flat())].slice(0, 30);
      } catch (e) {
        console.error("[audit] Phase 3 Serper error:", e);
      }
    }

    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: {
        keywordSuggestions: keywordSuggestions as any,
        peopleAlsoAsk: peopleAlsoAsk as any,
        autocompleteSuggestions: autocompleteSuggestions as any,
        relatedSearches: relatedSearches as any,
      },
    });

    // ═══════════════════════════════════════════
    // PHASE 4: SERP Analysis
    console.log(`[audit] Phase 4: SERP Analysis`);
    // ═══════════════════════════════════════════
    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: { phase: "serp" },
    });

    let serpAnalysis: any[] = [];

    if (serperKey) {
      try {
        // Analyze SERPs for top 5 quick-win keywords or seed keywords
        const targetKws = quickWins.length > 0
          ? quickWins.slice(0, 5).map((k) => k.keyword)
          : seedKeywords.slice(0, 5);

        const serpPromises = targetKws.map(async (kw) => {
          const result = await searchGoogle(serperKey, kw, { country: gl, language: lang, numResults: 10 }).catch(() => null);
          if (!result) return null;
          return {
            keyword: kw,
            topResults: result.topResults.slice(0, 5),
            serpFeatures: result.serpFeatures,
            hasFeaturedSnippet: result.topResults.some((r: any) => r.position === 0),
            hasKnowledgeGraph: result.serpFeatures.includes("knowledge_graph"),
            hasPeopleAlsoAsk: result.serpFeatures.includes("people_also_ask"),
            domainPosition: result.topResults.find((r) =>
              r.url.includes(domain)
            )?.position || null,
          };
        });

        serpAnalysis = (await Promise.all(serpPromises)).filter(Boolean);
      } catch (e) {
        console.error("[audit] Phase 4 error:", e);
      }
    }

    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: { serpAnalysis: serpAnalysis as any },
    });

    // ═══════════════════════════════════════════
    // PHASE 5: Technical Audit (Lighthouse)
    console.log(`[audit] Phase 5: Technical Audit`);
    // ═══════════════════════════════════════════
    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: { phase: "technical" },
    });

    let lighthouseScores = null;
    let technicalAudit = null;

    // Core Web Vitals via Google's official PageSpeed Insights API (no DataForSEO needed)
    try {
      const siteUrl = site.domain.startsWith("http") ? site.domain : `https://${site.domain}`;
      lighthouseScores = await runLighthouse({ login: "", password: "" }, siteUrl).catch(() => null);

        if (lighthouseScores) {
          // Create a structured technical audit summary
          const issues: { severity: string; issue: string; recommendation: string }[] = [];

          if (lighthouseScores.performance < 50) {
            issues.push({ severity: "critical", issue: "Very poor page performance", recommendation: "Optimize images, reduce JavaScript, enable caching" });
          } else if (lighthouseScores.performance < 80) {
            issues.push({ severity: "warning", issue: "Page performance needs improvement", recommendation: "Review render-blocking resources and image sizes" });
          }

          if (lighthouseScores.lcpMs > 4000) {
            issues.push({ severity: "critical", issue: `Slow LCP: ${(lighthouseScores.lcpMs / 1000).toFixed(1)}s`, recommendation: "Optimize largest contentful paint element" });
          } else if (lighthouseScores.lcpMs > 2500) {
            issues.push({ severity: "warning", issue: `LCP needs improvement: ${(lighthouseScores.lcpMs / 1000).toFixed(1)}s`, recommendation: "Target LCP under 2.5s" });
          }

          if (lighthouseScores.clsScore > 0.25) {
            issues.push({ severity: "critical", issue: `High layout shift (CLS: ${lighthouseScores.clsScore.toFixed(3)})`, recommendation: "Set explicit dimensions on images/ads, avoid dynamic content injection" });
          } else if (lighthouseScores.clsScore > 0.1) {
            issues.push({ severity: "warning", issue: `CLS needs improvement: ${lighthouseScores.clsScore.toFixed(3)}`, recommendation: "Target CLS under 0.1" });
          }

          if (lighthouseScores.tbtMs > 600) {
            issues.push({ severity: "critical", issue: `High blocking time: ${Math.round(lighthouseScores.tbtMs)}ms`, recommendation: "Reduce JavaScript execution time" });
          } else if (lighthouseScores.tbtMs > 300) {
            issues.push({ severity: "warning", issue: `TBT needs improvement: ${Math.round(lighthouseScores.tbtMs)}ms`, recommendation: "Target TBT under 300ms" });
          }

          if (lighthouseScores.inpMs != null) {
            if (lighthouseScores.inpMs > 500) {
              issues.push({ severity: "critical", issue: `Poor INP: ${Math.round(lighthouseScores.inpMs)}ms`, recommendation: "Reduce interaction latency — optimize event handlers, break up long tasks" });
            } else if (lighthouseScores.inpMs > 200) {
              issues.push({ severity: "warning", issue: `INP needs improvement: ${Math.round(lighthouseScores.inpMs)}ms`, recommendation: "Target INP under 200ms for good responsiveness" });
            }
          }

          if (lighthouseScores.seo < 80) {
            issues.push({ severity: "warning", issue: `SEO score below threshold: ${lighthouseScores.seo}/100`, recommendation: "Fix meta tags, heading hierarchy, and crawlability issues" });
          }

          if (lighthouseScores.accessibility < 80) {
            issues.push({ severity: "warning", issue: `Accessibility score: ${lighthouseScores.accessibility}/100`, recommendation: "Add alt text, improve contrast, ensure keyboard navigation" });
          }

          if (lighthouseScores.ttfbMs > 1500) {
            issues.push({ severity: "warning", issue: `Slow server response: ${lighthouseScores.ttfbMs}ms TTFB`, recommendation: "Optimize server, use CDN, enable caching" });
          }

          technicalAudit = { issues, totalIssues: issues.length, criticalCount: issues.filter(i => i.severity === "critical").length, warningCount: issues.filter(i => i.severity === "warning").length };
        }
    } catch (e) {
      console.error("[audit] Phase 5 error:", e);
    }

    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: {
        lighthouseScores: lighthouseScores as any,
        technicalAudit: technicalAudit as any,
      },
    });

    // ═══════════════════════════════════════════
    // PHASE 6: Backlink Profile
    console.log(`[audit] Phase 6: Backlink Profile`);
    // ═══════════════════════════════════════════
    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: { phase: "backlinks" },
    });

    let backlinkSummary = null;
    let anchorDistribution: any[] = [];
    let topBacklinks: any[] = [];

    if (dfsCreds) {
      try {
        [backlinkSummary, anchorDistribution, topBacklinks] = await Promise.all([
          getBacklinksSummary(dfsCreds, domain).catch(() => null),
          getBacklinkAnchors(dfsCreds, domain, 20).catch(() => []),
          getTopBacklinks(dfsCreds, domain, 20).catch(() => []),
        ]);
      } catch (e) {
        console.error("[audit] Phase 6 error:", e);
      }
    }

    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: {
        backlinkSummary: backlinkSummary as any,
        anchorDistribution: anchorDistribution as any,
        topBacklinks: topBacklinks as any,
      },
    });

    // ═══════════════════════════════════════════
    // AI SYNTHESIS
    console.log(`[audit] Phase 7: AI Synthesis`);
    // ═══════════════════════════════════════════
    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: { phase: "synthesizing" },
    });

    // Calculate health score — only use data we actually have
    let healthScore = 50; // base
    if (lighthouseScores) {
      const hasTrafficData = domainOverview && domainOverview.organicTraffic > 0;
      const hasBacklinkData = backlinkSummary && backlinkSummary.referringDomains > 0;
      const hasKeywordData = rankedKeywords.length > 0;

      // Weight distribution depends on what data is available
      let totalWeight = 0;
      let weightedScore = 0;

      // Lighthouse scores (always available) — 50% base
      weightedScore += lighthouseScores.performance * 0.15;
      weightedScore += lighthouseScores.seo * 0.25;
      weightedScore += lighthouseScores.accessibility * 0.1;
      totalWeight += 0.5;

      if (hasTrafficData && domainOverview) {
        weightedScore += Math.min(domainOverview.organicTraffic / 100, 20);
        totalWeight += 0.2;
      }
      if (hasBacklinkData && backlinkSummary) {
        weightedScore += Math.min(backlinkSummary.referringDomains / 50, 15);
        totalWeight += 0.15;
      }
      if (hasKeywordData) {
        weightedScore += Math.min(rankedKeywords.length / 5, 15);
        totalWeight += 0.15;
      }

      // Normalize: if we only have lighthouse data, scale up to 100
      healthScore = Math.round(totalWeight > 0 ? weightedScore / totalWeight : weightedScore);
      healthScore = Math.min(100, Math.max(0, healthScore));
    }

    // Generate expert SEO strategy with AI
    let executiveSummary = "";
    let quickWinActions: any[] = [];
    let contentStrategy: any = null;
    let customerSearchBehavior: any = null;
    let siteArchitecture: any = null;
    let topicalMap: any = null;
    let blogCalendar: any = null;
    let competitivePlaybook: any = null;
    let technicalRoadmap: any = null;
    let linkBuildingPlan: any = null;

    try {
      const aiPrompt = `You are a senior SEO consultant with 15 years of experience managing SEO for major brands. You've been hired to audit ${domain} and deliver a comprehensive, actionable SEO strategy. Think like a real SEO expert — every recommendation must be specific, data-backed, and immediately actionable.

BUSINESS CONTEXT:
- Domain: ${domain}
- Business: ${site.name || domain}
- Industry: ${site.industry || "Unknown"}
- Business Model: ${(site as any).businessModel || "E-commerce"}
- Target Market: ${geo.label} (${geo.countryCode.toUpperCase()})
- SEO Goal: ${site.primarySeoGoal || site.seoGoalType || "Grow organic traffic and sales"}
- Target Audience: ${site.targetAudience || "Not specified"}
- Brand Voice: ${site.brandVoice || "Professional"}
- Content Tone: ${(site as any).contentTone || "Professional"}
- Topics of Interest: ${(site.topicsOfInterest || []).join(", ") || "Not specified"}
- Monthly Article Budget: ${(site as any).monthlyArticleTarget || 8} articles/month

AUDIT DATA:
- Domain Overview: ${domainOverview && (domainOverview.organicTraffic > 0 || domainOverview.organicCount > 0) ? JSON.stringify(domainOverview) : "Data not available for this domain (regional/new domain — do NOT claim zero traffic, just say data is unavailable)"}
- Ranked Keywords (${rankedKeywords.length} total). Top 15: ${JSON.stringify(rankedKeywords.slice(0, 15).map(k => ({ keyword: k.keyword, pos: k.position, vol: k.searchVolume, kd: k.keywordDifficulty, intent: k.searchIntent, url: k.url })))}
- Quick Win Keywords (pos 4-20, vol 100+): ${quickWins.length} found. All: ${JSON.stringify(quickWins.slice(0, 20).map(k => ({ keyword: k.keyword, pos: k.position, vol: k.searchVolume, kd: k.keywordDifficulty, intent: k.searchIntent, url: k.url })))}
- Top Pages: ${JSON.stringify(topPages.slice(0, 10).map(p => ({ url: p.url, keywords: p.metrics?.organicCount, traffic: p.metrics?.organicTraffic })))}
- Competitors (${competitors.length}): ${JSON.stringify(competitors.slice(0, 8).map(c => ({ domain: c.domain, avgPos: c.avgPosition, intersections: c.intersections, relevance: c.competitorRelevance })))}
- Content Gaps (${contentGaps.length} keywords competitors rank for, you don't): ${JSON.stringify(contentGaps.slice(0, 25).map(g => ({ keyword: g.keyword, vol: g.searchVolume, kd: g.keywordDifficulty, compPos: g.competitorPosition })))}
- Keyword Suggestions (${keywordSuggestions.length}): ${JSON.stringify(keywordSuggestions.slice(0, 25).map(k => ({ keyword: k.keyword, vol: k.searchVolume, kd: k.keywordDifficulty, intent: k.searchIntent })))}
- People Also Ask: ${JSON.stringify(peopleAlsoAsk)}
- Autocomplete: ${JSON.stringify(autocompleteSuggestions.slice(0, 30))}
- Related Searches: ${JSON.stringify(relatedSearches)}
- SERP Analysis: ${JSON.stringify(serpAnalysis)}
- Lighthouse: ${JSON.stringify(lighthouseScores || "Not available")}
- Technical Issues: ${JSON.stringify(technicalAudit?.issues || [])}
- Backlinks: ${backlinkSummary && (backlinkSummary.totalBacklinks > 0 || backlinkSummary.referringDomains > 0) ? JSON.stringify(backlinkSummary) : "Data not available for this domain (do NOT claim zero backlinks, just say data is unavailable)"}
- Top Backlinks: ${JSON.stringify(topBacklinks.slice(0, 10))}
- Competitor Traffic: ${JSON.stringify(competitorTraffic)}

INSTRUCTIONS — Think step by step:
1. FIRST: Analyze ALL ranked keywords and search data to identify distinct customer segments — who are the real humans searching these terms? What are their demographics, motivations, and buying stage?
2. Group keywords by search intent (informational, commercial, transactional, navigational) AND by customer persona
3. Identify topical clusters from keyword data and group them into content pillars
4. For every blog/article suggestion, always specify the TARGET KEYWORD with its search volume and difficulty
5. Study competitors and find specific content they rank for that this site should create
6. Cross-reference PAA questions and autocomplete to find long-tail blog opportunities
7. Recommend NEW pages/sections the site should build (not just blog posts — think landing pages, category pages, comparison pages, resource hubs)
8. Create a realistic 90-day blog calendar with specific titles, keywords, and briefs
9. Prioritize low-difficulty, high-volume keywords for quick wins
10. Be SPECIFIC — no generic advice like "improve content". Name exact keywords, exact pages, exact topics.

Return JSON with this structure:
{
  "executiveSummary": "5 paragraphs: (1) Current state with specific numbers, (2) Biggest opportunities with estimated traffic potential, (3) Competitive positioning — where you stand vs competitors, (4) Technical health summary with specific issues, (5) 90-day outlook with expected results if recommendations are followed",

  "quickWinActions": [
    { "action": "specific action", "impact": "high/medium/low", "effort": "low/medium/high", "category": "content/technical/backlinks/keywords", "details": "exact steps", "expectedResult": "what will happen", "targetKeyword": "keyword if applicable" }
  ],

  "contentStrategy": {
    "pillarTopics": ["3-5 main content pillars"],
    "quickWinContent": [
      { "title": "Exact Article Title", "targetKeyword": "keyword", "volume": 1200, "difficulty": 25, "rationale": "why this article matters" }
    ],
    "gapContent": [
      { "title": "Exact Article Title", "targetKeyword": "keyword", "volume": 900, "difficulty": 30, "rationale": "competitor X ranks #3 for this" }
    ],
    "monthlyPlan": "detailed 2-3 paragraph monthly content plan"
  },

  "customerSearchBehavior": {
    "summary": "2-3 paragraph analysis of who is searching for this brand and what they want — demographics, motivations, buying stage",
    "intentBreakdown": {
      "informational": { "percentage": 40, "description": "what info seekers want", "exampleKeywords": ["kw1","kw2","kw3"] },
      "commercial": { "percentage": 30, "description": "what comparison shoppers search", "exampleKeywords": ["kw1","kw2","kw3"] },
      "transactional": { "percentage": 25, "description": "what ready-to-buy customers search", "exampleKeywords": ["kw1","kw2","kw3"] },
      "navigational": { "percentage": 5, "description": "brand/site navigation searches", "exampleKeywords": ["kw1","kw2"] }
    },
    "customerSegments": [
      {
        "name": "Segment Name (e.g. Price-Conscious Luxury Shoppers)",
        "description": "1-2 sentence profile of this customer type",
        "size": "large/medium/small",
        "buyingStage": "awareness/consideration/decision",
        "topSearchTerms": [
          { "keyword": "search term", "volume": 1200, "intent": "commercial" }
        ],
        "contentNeeds": "what content would serve this segment",
        "conversionPotential": "high/medium/low"
      }
    ],
    "searchPatterns": [
      { "pattern": "Pattern name (e.g. Brand + Product Type)", "examples": ["hugo boss suits","hugo boss perfume"], "volume": 5000, "insight": "what this tells us about the customer" }
    ],
    "seasonalTrends": [
      { "period": "Q4 / Ramadan / Summer", "trendingSearches": ["keyword1","keyword2"], "insight": "why this matters" }
    ],
    "contentGapsBySegment": [
      { "segment": "Segment Name", "missingContent": "what content is missing for this segment", "suggestedTopics": ["topic1","topic2"], "estimatedTraffic": 3000 }
    ]
  },

  "siteArchitecture": {
    "currentGaps": ["specific missing page types"],
    "recommendedPages": [
      { "pageType": "landing-page/pillar-page/resource-page/comparison-page/category-page", "title": "Page Title", "slug": "/suggested-url", "targetKeywords": ["kw1","kw2"], "estimatedTraffic": 2400, "rationale": "why this page is needed", "priority": "high/medium/low" }
    ]
  },

  "topicalMap": {
    "clusters": [
      {
        "pillarTopic": "Main Topic",
        "pillarPageTitle": "Ultimate Guide Title",
        "pillarKeyword": "main keyword",
        "searchVolume": 8100,
        "supportingArticles": [
          { "title": "Article Title", "targetKeyword": "long-tail", "searchVolume": 720, "difficulty": 28, "intent": "informational", "wordCount": 2000, "angle": "unique angle" }
        ],
        "estimatedClusterTraffic": 15000
      }
    ],
    "totalEstimatedTraffic": 45000
  },

  "blogCalendar": {
    "weeks": [
      {
        "weekNumber": 1,
        "theme": "Week Theme",
        "articles": [
          { "title": "Blog Post Title", "targetKeyword": "keyword", "secondaryKeywords": ["kw2","kw3"], "searchVolume": 1200, "difficulty": 25, "intent": "informational", "wordCount": 2000, "contentType": "how-to/listicle/comparison/guide/case-study", "brief": "2-3 sentence content brief", "priority": "must-write/should-write/nice-to-have" }
        ]
      }
    ],
    "publishingCadence": "X articles per week",
    "totalArticles": 24,
    "estimatedTrafficGain": "X-Y monthly organic visits within 6 months"
  },

  "competitivePlaybook": {
    "competitors": [
      {
        "domain": "competitor.com",
        "theirStrength": "what they do well",
        "theirWeakness": "where they are vulnerable",
        "stealableKeywords": [
          { "keyword": "kw", "theirPosition": 8, "volume": 900, "difficulty": 22, "attackStrategy": "how to outrank them" }
        ],
        "contentToOutperform": [
          { "theirUrl": "/their-page", "theirTitle": "Their Page Title", "ourAngle": "how to create a better version" }
        ]
      }
    ]
  },

  "technicalRoadmap": {
    "immediate": [{ "issue": "description", "impact": "traffic impact estimate", "fix": "exact steps", "timeEstimate": "2 hours" }],
    "shortTerm": [{ "issue": "description", "impact": "impact", "fix": "steps", "timeEstimate": "1 week" }],
    "longTerm": [{ "issue": "description", "impact": "impact", "fix": "steps", "timeEstimate": "1 month" }],
    "estimatedTrafficUnlock": "fixing these could recover ~X visits/month"
  },

  "linkBuildingPlan": {
    "currentProfile": "1-2 sentence backlink health summary",
    "targetDomains": [
      { "domain": "target-site.com", "approach": "guest-post/resource-link/broken-link/digital-pr", "rationale": "why target this site" }
    ],
    "linkableAssets": ["content ideas that naturally attract links"],
    "monthlyLinkTarget": 10
  }
}

IMPORTANT: Be thorough. The customerSearchBehavior section is CRITICAL — analyze every ranked keyword to understand the real humans behind these searches. Generate at least 4 distinct customer segments with specific search terms. Generate at least 3 topical clusters with 4-5 supporting articles each. Generate at least 8 weeks of blog calendar. Every article must have a real target keyword with search volume. No generic filler.

CRITICAL: NEVER include years (2023, 2024, 2025, 2026, etc.) in article titles, keywords, or content suggestions. Years make content feel dated quickly. Use evergreen titles like "The Best Suits for Men" not "The Best Suits for Men in 2023".`;

      const aiResult = await askClaudeJSON(aiPrompt, {
        maxTokens: 12000,
        temperature: 0.3,
        apiKey: site.openaiApiKey || undefined,
      }) as any;

      executiveSummary = aiResult.executiveSummary || "";
      quickWinActions = aiResult.quickWinActions || [];
      contentStrategy = aiResult.contentStrategy || null;
      customerSearchBehavior = aiResult.customerSearchBehavior || null;
      siteArchitecture = aiResult.siteArchitecture || null;
      topicalMap = aiResult.topicalMap || null;
      blogCalendar = aiResult.blogCalendar || null;
      competitivePlaybook = aiResult.competitivePlaybook || null;
      technicalRoadmap = aiResult.technicalRoadmap || null;
      linkBuildingPlan = aiResult.linkBuildingPlan || null;
    } catch (e) {
      console.error("[audit] AI synthesis error:", e);
      executiveSummary = `SEO audit completed for ${domain}. Found ${rankedKeywords.length} ranked keywords, ${quickWins.length} quick-win opportunities, and ${contentGaps.length} content gaps. ${technicalAudit?.criticalCount || 0} critical technical issues detected.`;
    }

    // Final update
    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: {
        status: "completed",
        phase: "completed",
        healthScore,
        executiveSummary,
        quickWinActions: quickWinActions as any,
        contentStrategy: contentStrategy as any,
        customerSearchBehavior: customerSearchBehavior as any,
        siteArchitecture: siteArchitecture as any,
        topicalMap: topicalMap as any,
        blogCalendar: blogCalendar as any,
        competitivePlaybook: competitivePlaybook as any,
        technicalRoadmap: technicalRoadmap as any,
        linkBuildingPlan: linkBuildingPlan as any,
        completedAt: new Date(),
      },
    });

    console.log(`[audit] Completed! Health score: ${healthScore}, Keywords: ${rankedKeywords.length}, Quick wins: ${quickWins.length}, Competitors: ${competitors.length}`);
    return audit.id;
  } catch (error) {
    console.error("[audit] Fatal error:", error);
    await prisma.seoAudit.update({
      where: { id: audit.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return audit.id;
  }
}
