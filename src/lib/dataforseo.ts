/**
 * DataForSEO API client
 * Docs: https://docs.dataforseo.com/v3/
 * Auth: HTTP Basic (login:password)
 */

interface DataForSEOCreds {
  login: string;
  password: string;
}

function authHeader(creds: DataForSEOCreds): string {
  return "Basic " + Buffer.from(`${creds.login}:${creds.password}`).toString("base64");
}

async function dfRequest<T>(creds: DataForSEOCreds, endpoint: string, body: unknown[]): Promise<T> {
  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(creds),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DataForSEO API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// -- Types --

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  cpc: number;
  competition: number;
  competitionLevel: string;
  monthlySearches: { month: number; year: number; volume: number }[];
}

export interface KeywordSuggestion {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  cpc: number;
  searchIntent: string;
  competitionLevel: string;
}

export interface CompetitorDomain {
  domain: string;
  avgPosition: number;
  serpCount: number;
  intersections: number;
  competitorRelevance: number;
}

export interface SerpPosition {
  keyword: string;
  position: number | null;
  url: string | null;
  title: string | null;
  serpFeatures: string[];
}

// -- API Methods --

/**
 * Get search volume for up to 1000 keywords (via Google Ads data)
 */
export async function getSearchVolume(
  creds: DataForSEOCreds,
  keywords: string[],
  location: number = 2840, // US
  language: string = "en"
): Promise<KeywordData[]> {
  const data = await dfRequest<{ tasks: { result: { keyword: string; search_volume: number; cpc: number; competition: number; competition_level: string; monthly_searches: { month: number; year: number; search_volume: number }[] }[] }[] }>(
    creds,
    "keywords_data/google_ads/search_volume/live",
    [{ keywords, location_code: location, language_code: language }]
  );

  const results = data.tasks?.[0]?.result || [];
  return results.map((r) => ({
    keyword: r.keyword,
    searchVolume: r.search_volume || 0,
    cpc: r.cpc || 0,
    competition: r.competition || 0,
    competitionLevel: r.competition_level || "unknown",
    monthlySearches: (r.monthly_searches || []).map((m) => ({
      month: m.month,
      year: m.year,
      volume: m.search_volume,
    })),
  }));
}

/**
 * Get keyword suggestions from seed keywords (via Google Ads)
 */
export async function getKeywordSuggestions(
  creds: DataForSEOCreds,
  seedKeywords: string[],
  location: number = 2840,
  language: string = "en",
  limit: number = 50
): Promise<KeywordSuggestion[]> {
  const data = await dfRequest<any>(
    creds,
    "dataforseo_labs/google/keyword_suggestions/live",
    [{ keyword: seedKeywords[0], location_code: location, language_code: language, limit }]
  );

  // Result can be nested as result[0].items or directly as result array
  const resultObj = data.tasks?.[0]?.result?.[0];
  const items = resultObj?.items || data.tasks?.[0]?.result || [];
  return items
    .filter((r: any) => r?.keyword)
    .map((r: any) => ({
      keyword: r.keyword,
      searchVolume: r.keyword_info?.search_volume || 0,
      keywordDifficulty: r.keyword_properties?.keyword_difficulty || 0,
      cpc: r.keyword_info?.cpc || 0,
      searchIntent: r.search_intent_info?.main_intent || "informational",
      competitionLevel: r.keyword_info?.competition_level || "unknown",
    }));
}

/**
 * Get keyword suggestions for multiple seeds in parallel
 * Returns deduplicated results across all seeds
 */
export async function getKeywordSuggestionsMulti(
  creds: DataForSEOCreds,
  seeds: string[],
  location: number = 2840,
  language: string = "en",
  limitPerSeed: number = 70
): Promise<KeywordSuggestion[]> {
  const results = await Promise.allSettled(
    seeds.map(seed =>
      getKeywordSuggestions(creds, [seed], location, language, limitPerSeed)
        .catch(e => { console.error(`[dataforseo] Keyword suggestions for "${seed}":`, e.message); return []; })
    )
  );

  const allKeywords: KeywordSuggestion[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    const items = result.status === "fulfilled" ? result.value : [];
    for (const item of items) {
      if (!item?.keyword) continue;
      const key = item.keyword.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        allKeywords.push(item);
      }
    }
  }

  return allKeywords.sort((a, b) => b.searchVolume - a.searchVolume);
}

/**
 * Get keyword ideas for multiple seeds in parallel
 */
export async function getKeywordIdeasMulti(
  creds: DataForSEOCreds,
  seeds: string[],
  location: number = 2840,
  language: string = "en"
): Promise<KeywordSuggestion[]> {
  const results = await Promise.allSettled(
    seeds.map(seed =>
      getKeywordIdeas(creds, seed, location, language)
        .catch(e => { console.error(`[dataforseo] Keyword ideas for "${seed}":`, e.message); return []; })
    )
  );

  const allKeywords: KeywordSuggestion[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    const items = result.status === "fulfilled" ? result.value : [];
    for (const item of items) {
      if (!item?.keyword) continue;
      const key = item.keyword.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        allKeywords.push(item);
      }
    }
  }

  return allKeywords.sort((a, b) => b.searchVolume - a.searchVolume);
}

/**
 * Get keyword ideas (related keywords with metrics)
 */
export async function getKeywordIdeas(
  creds: DataForSEOCreds,
  keyword: string,
  location: number = 2840,
  language: string = "en"
): Promise<KeywordSuggestion[]> {
  const data = await dfRequest<any>(
    creds,
    "dataforseo_labs/google/related_keywords/live",
    [{ keyword, location_code: location, language_code: language, limit: 30 }]
  );

  const resultObj = data.tasks?.[0]?.result?.[0];
  const items = resultObj?.items || data.tasks?.[0]?.result || [];
  return items
    .filter((r: any) => r?.keyword)
    .map((r: any) => ({
      keyword: r.keyword,
      searchVolume: r.keyword_info?.search_volume || 0,
      keywordDifficulty: r.keyword_properties?.keyword_difficulty || 0,
      cpc: r.keyword_info?.cpc || 0,
      searchIntent: r.search_intent_info?.main_intent || "informational",
      competitionLevel: r.keyword_info?.competition_level || "unknown",
    }));
}

/**
 * Get competitor domains for a target domain
 */
export async function getCompetitorDomains(
  creds: DataForSEOCreds,
  targetDomain: string,
  location: number = 2840,
  language: string = "en"
): Promise<CompetitorDomain[]> {
  const data = await dfRequest<{ tasks: { result: { items: { domain: string; avg_position: number; se_results_count: number; intersections: number; competitor_relevance: number }[] }[] }[] }>(
    creds,
    "dataforseo_labs/google/competitors_domain/live",
    [{ target: targetDomain, location_code: location, language_code: language, limit: 20 }]
  );

  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items
    .filter((r) => r.domain && r.domain !== targetDomain && !targetDomain.includes(r.domain) && !r.domain.includes(targetDomain))
    .map((r) => ({
      domain: r.domain,
      avgPosition: r.avg_position || 0,
      serpCount: r.se_results_count || 0,
      intersections: r.intersections || 0,
      competitorRelevance: r.competitor_relevance || 0,
    }));
}

/**
 * Check SERP position for a keyword + domain
 */
export async function checkSerpPosition(
  creds: DataForSEOCreds,
  keyword: string,
  targetDomain: string,
  location: number = 2840,
  language: string = "en"
): Promise<SerpPosition> {
  const data = await dfRequest<{ tasks: { result: { items: { type: string; rank_group: number; url: string; title: string; se_type: string }[] }[] }[] }>(
    creds,
    "serp/google/organic/live/regular",
    [{ keyword, location_code: location, language_code: language, depth: 100 }]
  );

  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  const match = items.find(
    (item) => item.url && item.url.includes(targetDomain)
  );

  const serpFeatures = [...new Set(items.map((i) => i.type).filter((t) => t !== "organic"))];

  return {
    keyword,
    position: match ? match.rank_group : null,
    url: match?.url || null,
    title: match?.title || null,
    serpFeatures,
  };
}

/**
 * Bulk SERP position check for multiple keywords
 */
export async function bulkCheckSerpPositions(
  creds: DataForSEOCreds,
  keywords: string[],
  targetDomain: string,
  location: number = 2840,
  language: string = "en"
): Promise<SerpPosition[]> {
  const results: SerpPosition[] = [];
  // DataForSEO allows batching, but for simplicity we do sequential calls
  // (standard queue is cheap at $0.0006/query)
  for (const keyword of keywords) {
    const result = await checkSerpPosition(creds, keyword, targetDomain, location, language);
    results.push(result);
  }
  return results;
}

/**
 * Test DataForSEO connection
 */
export async function testDataForSEOConnection(
  creds: DataForSEOCreds
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
      method: "GET",
      headers: { Authorization: authHeader(creds) },
    });
    if (res.ok) {
      return { success: true };
    }
    return { success: false, error: "Invalid DataForSEO credentials" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Connection failed";
    return { success: false, error: msg };
  }
}

// -- New Types for SEO Audit --

export interface DomainOverview {
  organicCount: number;
  paidCount: number;
  organicTraffic: number;
  organicCost: number;
  rank: number;
}

export interface RankedKeyword {
  keyword: string;
  position: number;
  previousPosition: number | null;
  searchVolume: number;
  url: string;
  trafficEstimate: number;
  keywordDifficulty: number;
  searchIntent: string;
  change: "new" | "up" | "down" | "stable" | "lost";
}

export interface RelevantPage {
  url: string;
  metrics: {
    organicCount: number;
    organicTraffic: number;
    organicCost: number;
  };
}

export interface DomainIntersectionItem {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  competitorPosition: number;
  yourPosition: number | null;
  searchIntent: string;
}

export interface BacklinksSummary {
  totalBacklinks: number;
  referringDomains: number;
  referringIps: number;
  rank: number;
  brokenBacklinks: number;
  spamScore: number;
  dofollow: number;
  nofollow: number;
}

export interface BacklinkAnchor {
  anchor: string;
  backlinks: number;
  referringDomains: number;
  firstSeen: string;
}

export interface TopBacklink {
  url: string;
  sourceUrl: string;
  sourceDomain: string;
  anchor: string;
  rank: number;
  isDofollow: boolean;
  firstSeen: string;
}

export interface LighthouseResult {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  fcpMs: number;
  lcpMs: number;
  clsScore: number;
  tbtMs: number;
  speedIndex: number;
  ttfbMs: number;
  inpMs: number | null;
  cruxOrigin: string | null;
  hasCruxData: boolean;
}

/**
 * Get domain rank overview (organic traffic, keyword counts, rank)
 */
export async function getDomainOverview(
  creds: DataForSEOCreds,
  domain: string,
  location: number = 2840,
  language: string = "en"
): Promise<DomainOverview> {
  const data = await dfRequest<any>(
    creds,
    "dataforseo_labs/google/domain_rank_overview/live",
    [{ target: domain, location_code: location, language_code: language }]
  );

  const r = data.tasks?.[0]?.result?.[0] || {};
  return {
    organicCount: r.metrics?.organic?.count || 0,
    paidCount: r.metrics?.paid?.count || 0,
    organicTraffic: r.metrics?.organic?.etv || 0,
    organicCost: r.metrics?.organic?.estimated_paid_traffic_cost || 0,
    rank: r.metrics?.organic?.pos_1 + r.metrics?.organic?.pos_2_3 + r.metrics?.organic?.pos_4_10 || 0,
  };
}

/**
 * Get keywords a domain ranks for with positions and metrics
 */
export async function getRankedKeywords(
  creds: DataForSEOCreds,
  domain: string,
  location: number = 2840,
  language: string = "en",
  limit: number = 100
): Promise<RankedKeyword[]> {
  const data = await dfRequest<any>(
    creds,
    "dataforseo_labs/google/ranked_keywords/live",
    [{
      target: domain,
      location_code: location,
      language_code: language,
      limit,
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
    }]
  );

  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map((item: any) => {
    const kd = item.keyword_data || {};
    const ki = kd.keyword_info || {};
    const rk = item.ranked_serp_element || {};

    let change: "new" | "up" | "down" | "stable" | "lost" = "stable";
    if (rk.is_new) change = "new";
    else if (rk.is_lost) change = "lost";
    else if (rk.position_difference > 0) change = "up";
    else if (rk.position_difference < 0) change = "down";

    return {
      keyword: kd.keyword || "",
      position: rk.serp_item?.rank_group || 0,
      previousPosition: rk.serp_item?.rank_group != null && rk.position_difference != null
        ? rk.serp_item.rank_group - rk.position_difference
        : null,
      searchVolume: ki.search_volume || 0,
      url: rk.serp_item?.url || "",
      trafficEstimate: rk.serp_item?.etv || 0,
      keywordDifficulty: kd.keyword_properties?.keyword_difficulty || 0,
      searchIntent: kd.search_intent_info?.main_intent || "informational",
      change,
    };
  });
}

/**
 * Get top performing pages for a domain
 */
export async function getRelevantPages(
  creds: DataForSEOCreds,
  domain: string,
  location: number = 2840,
  language: string = "en",
  limit: number = 20
): Promise<RelevantPage[]> {
  const data = await dfRequest<any>(
    creds,
    "dataforseo_labs/google/relevant_pages/live",
    [{ target: domain, location_code: location, language_code: language, limit }]
  );

  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map((item: any) => ({
    url: item.page_address || "",
    metrics: {
      organicCount: item.metrics?.organic?.count || 0,
      organicTraffic: item.metrics?.organic?.etv || 0,
      organicCost: item.metrics?.organic?.estimated_paid_traffic_cost || 0,
    },
  }));
}

/**
 * Find content gaps: keywords competitors rank for that you don't
 */
export async function getDomainIntersection(
  creds: DataForSEOCreds,
  yourDomain: string,
  competitorDomain: string,
  location: number = 2840,
  language: string = "en",
  limit: number = 50
): Promise<DomainIntersectionItem[]> {
  const data = await dfRequest<any>(
    creds,
    "dataforseo_labs/google/domain_intersection/live",
    [{
      target1: competitorDomain,
      target2: yourDomain,
      location_code: location,
      language_code: language,
      limit,
      exclude_intersection: true,
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
    }]
  );

  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map((item: any) => {
    const kd = item.keyword_data || {};
    const ki = kd.keyword_info || {};
    return {
      keyword: kd.keyword || "",
      searchVolume: ki.search_volume || 0,
      keywordDifficulty: kd.keyword_properties?.keyword_difficulty || 0,
      competitorPosition: item.intersection_result?.[competitorDomain]?.rank_group || 0,
      yourPosition: item.intersection_result?.[yourDomain]?.rank_group || null,
      searchIntent: kd.search_intent_info?.main_intent || "informational",
    };
  });
}

/**
 * Get bulk traffic estimation for multiple domains
 */
export async function getBulkTrafficEstimation(
  creds: DataForSEOCreds,
  domains: string[],
  location: number = 2840,
  language: string = "en"
): Promise<{ domain: string; organicTraffic: number; organicKeywords: number; organicCost: number }[]> {
  const data = await dfRequest<any>(
    creds,
    "dataforseo_labs/google/bulk_traffic_estimation/live",
    [{ targets: domains, location_code: location, language_code: language }]
  );

  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map((item: any) => ({
    domain: item.target || "",
    organicTraffic: item.metrics?.organic?.etv || 0,
    organicKeywords: item.metrics?.organic?.count || 0,
    organicCost: item.metrics?.organic?.estimated_paid_traffic_cost || 0,
  }));
}

/**
 * Get backlinks summary for a domain
 */
export async function getBacklinksSummary(
  creds: DataForSEOCreds,
  domain: string
): Promise<BacklinksSummary> {
  const data = await dfRequest<any>(
    creds,
    "backlinks/summary/live",
    [{ target: domain }]
  );

  const r = data.tasks?.[0]?.result?.[0] || {};
  return {
    totalBacklinks: r.backlinks || 0,
    referringDomains: r.referring_domains || 0,
    referringIps: r.referring_ips || 0,
    rank: r.rank || 0,
    brokenBacklinks: r.broken_backlinks || 0,
    spamScore: r.backlinks_spam_score || 0,
    dofollow: r.referring_links_types?.anchor || 0,
    nofollow: r.referring_links_attributes?.nofollow || 0,
  };
}

/**
 * Get anchor text distribution
 */
export async function getBacklinkAnchors(
  creds: DataForSEOCreds,
  domain: string,
  limit: number = 20
): Promise<BacklinkAnchor[]> {
  const data = await dfRequest<any>(
    creds,
    "backlinks/anchors/live",
    [{ target: domain, limit, order_by: ["backlinks,desc"] }]
  );

  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map((item: any) => ({
    anchor: item.anchor || "",
    backlinks: item.backlinks || 0,
    referringDomains: item.referring_domains || 0,
    firstSeen: item.first_seen || "",
  }));
}

/**
 * Get top backlinks pointing to a domain
 */
export async function getTopBacklinks(
  creds: DataForSEOCreds,
  domain: string,
  limit: number = 20
): Promise<TopBacklink[]> {
  const data = await dfRequest<any>(
    creds,
    "backlinks/backlinks/live",
    [{ target: domain, limit, order_by: ["rank,desc"], mode: "as_is" }]
  );

  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  return items.map((item: any) => ({
    url: item.url_to || "",
    sourceUrl: item.url_from || "",
    sourceDomain: item.domain_from || "",
    anchor: item.anchor || "",
    rank: item.rank || 0,
    isDofollow: item.dofollow ?? true,
    firstSeen: item.first_seen || "",
  }));
}

/**
 * Run Core Web Vitals & Lighthouse audit via Google's official PageSpeed Insights API
 * Returns both real-user CrUX data and Lighthouse lab scores
 * Docs: https://developers.google.com/speed/docs/insights/v5/get-started
 */
export async function runLighthouse(
  _creds: DataForSEOCreds,
  url: string
): Promise<LighthouseResult> {
  const apiKey = process.env.GOOGLE_API_KEY || "";
  const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  apiUrl.searchParams.set("url", url);
  apiUrl.searchParams.set("strategy", "mobile");
  apiUrl.searchParams.append("category", "performance");
  apiUrl.searchParams.append("category", "accessibility");
  apiUrl.searchParams.append("category", "best-practices");
  apiUrl.searchParams.append("category", "seo");
  if (apiKey) apiUrl.searchParams.set("key", apiKey);

  const res = await fetch(apiUrl.toString(), { signal: AbortSignal.timeout(60000) });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`PageSpeed Insights API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const categories = data.lighthouseResult?.categories || {};
  const audits = data.lighthouseResult?.audits || {};

  // CrUX real-user field data (when available)
  const crux = data.loadingExperience?.metrics || {};
  const cruxLcp = crux.LARGEST_CONTENTFUL_PAINT_MS?.percentile;
  const cruxCls = crux.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
  const cruxInp = crux.INTERACTION_TO_NEXT_PAINT?.percentile;
  const cruxFcp = crux.FIRST_CONTENTFUL_PAINT_MS?.percentile;
  const cruxTtfb = crux.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile;

  // Prefer CrUX real-user data, fall back to Lighthouse lab data
  return {
    performance: Math.round((categories.performance?.score || 0) * 100),
    accessibility: Math.round((categories.accessibility?.score || 0) * 100),
    bestPractices: Math.round((categories["best-practices"]?.score || 0) * 100),
    seo: Math.round((categories.seo?.score || 0) * 100),
    fcpMs: cruxFcp ?? audits["first-contentful-paint"]?.numericValue ?? 0,
    lcpMs: cruxLcp ?? audits["largest-contentful-paint"]?.numericValue ?? 0,
    clsScore: cruxCls != null ? cruxCls / 100 : audits["cumulative-layout-shift"]?.numericValue ?? 0,
    tbtMs: audits["total-blocking-time"]?.numericValue ?? 0,
    speedIndex: audits["speed-index"]?.numericValue ?? 0,
    ttfbMs: cruxTtfb ?? audits["server-response-time"]?.numericValue ?? 0,
    // Additional CrUX fields
    inpMs: cruxInp ?? null,
    cruxOrigin: data.loadingExperience?.overall_category || null,
    hasCruxData: !!cruxLcp,
  };
}
