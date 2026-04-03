import type {
  KeywordCompetitor,
  KeywordMetric,
  KeywordSuggestion,
} from "@/lib/studio-types";

type AhrefsKeywordRecord = {
  keyword?: string;
  volume?: number | null;
  sum_traffic?: number | null;
  keyword_difficulty?: number | null;
  best_position?: number | null;
  best_position_url?: string | null;
  is_transactional?: boolean;
  is_commercial?: boolean;
  is_informational?: boolean;
};

type AhrefsCompetitorRecord = {
  competitor_domain?: string | null;
  domain_rating?: number | null;
  keywords_common?: number | null;
  traffic?: number | null;
  share?: number | null;
};

type AhrefsKeywordResponse = {
  keywords?: AhrefsKeywordRecord[];
  error?: string;
};

type AhrefsCompetitorResponse = {
  competitors?: AhrefsCompetitorRecord[];
  error?: string;
};

export type AhrefsKeywordIntel = {
  headline: string;
  providerNote: string;
  siteMetrics: KeywordMetric[];
  liveSuggestions: KeywordSuggestion[];
  quickWins: string[];
  competitors: KeywordCompetitor[];
};

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function ensureUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function extractTargetDomain(value: string) {
  try {
    return new URL(ensureUrl(value)).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function formatMetric(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function detectIntent(record: AhrefsKeywordRecord): KeywordSuggestion["intent"] {
  const keyword = (record.keyword || "").toLowerCase();

  if (record.is_transactional) {
    return "transactional";
  }

  if (record.is_commercial) {
    return keyword.includes("vs") || keyword.includes("alternative")
      ? "comparison"
      : "commercial";
  }

  if (record.is_informational) {
    return "informational";
  }

  if (keyword.includes("vs") || keyword.includes("alternative") || keyword.includes("compare")) {
    return "comparison";
  }

  return "commercial";
}

function computeScore(record: AhrefsKeywordRecord) {
  const position = typeof record.best_position === "number" ? record.best_position : 60;
  const volume = Math.max(1, record.volume || 1);
  const traffic = Math.max(0, record.sum_traffic || 0);
  const difficulty = Math.max(0, record.keyword_difficulty || 0);
  const positionScore = Math.max(0, 36 - Math.min(position, 18) * 1.5);
  const volumeScore = Math.min(26, Math.round(Math.log10(volume + 1) * 11));
  const trafficScore = Math.min(24, Math.round(Math.log10(traffic + 1) * 9));
  const difficultyPenalty = Math.min(16, Math.round(difficulty / 6));

  return Math.max(55, Math.min(99, 56 + positionScore + volumeScore + trafficScore - difficultyPenalty));
}

async function requestAhrefs<T>(path: string, params: Record<string, string>) {
  const apiKey = process.env.AHREFS_API_KEY;

  if (!apiKey) {
    throw new Error("AHREFS_API_KEY is not configured.");
  }

  const url = new URL(`https://api.ahrefs.com/v3/${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });

  if (!response.ok) {
    throw new Error(data.error || `Ahrefs request failed with ${response.status}.`);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

export async function getAhrefsKeywordIntel(input: {
  websiteUrl: string;
  seedTerms: string[];
}): Promise<AhrefsKeywordIntel> {
  const target = extractTargetDomain(input.websiteUrl);

  if (!target) {
    throw new Error("Add a valid website URL to unlock Ahrefs-backed keyword intelligence.");
  }

  const date = new Date().toISOString().slice(0, 10);
  const commonParams = {
    country: "us",
    date,
    mode: "subdomains",
    output: "json",
    target,
  };

  const [keywordResult, competitorResult] = await Promise.all([
    requestAhrefs<AhrefsKeywordResponse>("site-explorer/organic-keywords", {
      ...commonParams,
      limit: "18",
      order_by: "sum_traffic:desc",
      select:
        "keyword,volume,sum_traffic,keyword_difficulty,best_position,best_position_url,is_transactional,is_commercial,is_informational",
    }),
    requestAhrefs<AhrefsCompetitorResponse>("site-explorer/organic-competitors", {
      ...commonParams,
      limit: "6",
      order_by: "keywords_common:desc",
      select: "competitor_domain,domain_rating,keywords_common,traffic,share",
    }),
  ]);

  const liveSuggestions = (keywordResult.keywords || [])
    .filter((item) => compact(item.keyword || "").length > 2)
    .map((item) => ({
      keyword: compact(item.keyword || ""),
      intent: detectIntent(item),
      source: "ahrefs",
      why:
        typeof item.best_position === "number"
          ? `Already visible in Ahrefs at position ${item.best_position}. This is a realistic keyword to strengthen with on-page and internal-link work.`
          : "Pulled from Ahrefs organic keyword data for this site.",
      score: computeScore(item),
      volume: item.volume ?? null,
      traffic: item.sum_traffic ?? null,
      difficulty: item.keyword_difficulty ?? null,
      position: item.best_position ?? null,
      rankingUrl: item.best_position_url ?? null,
    }))
    .sort((a, b) => b.score - a.score);

  const quickWins = liveSuggestions
    .filter((item) => {
      const position = item.position ?? 100;
      return position >= 4 && position <= 20;
    })
    .map((item) => item.keyword)
    .slice(0, 6);

  const competitors = (competitorResult.competitors || [])
    .filter((item) => compact(item.competitor_domain || "").length > 0)
    .map((item) => ({
      domain: compact(item.competitor_domain || ""),
      domainRating: typeof item.domain_rating === "number" ? Number(item.domain_rating.toFixed(1)) : null,
      sharedKeywords: item.keywords_common || 0,
      traffic: item.traffic ?? null,
      share: typeof item.share === "number" ? Number(item.share.toFixed(1)) : null,
    }))
    .slice(0, 4);

  if (!liveSuggestions.length && !competitors.length) {
    throw new Error("Ahrefs returned no usable keyword or competitor data for this domain.");
  }

  const bestLive = liveSuggestions[0] || null;
  const siteMetrics: KeywordMetric[] = [
    {
      label: "Live keywords sampled",
      value: String(liveSuggestions.length),
      detail: "Ahrefs organic keywords returned for this domain snapshot.",
    },
    {
      label: "Quick-win ranks",
      value: String(quickWins.length),
      detail: "Keywords sitting between positions 4 and 20.",
    },
    {
      label: "Top live keyword",
      value: bestLive ? (bestLive.position ? `#${bestLive.position}` : bestLive.keyword) : "n/a",
      detail: bestLive
        ? `${bestLive.keyword} with volume ${formatMetric(bestLive.volume)} and traffic ${formatMetric(bestLive.traffic)}.`
        : "Ahrefs did not return a strong live keyword sample.",
    },
    {
      label: "Organic competitors",
      value: String(competitors.length),
      detail: "Top overlap domains returned from Ahrefs organic competitors.",
    },
  ];

  const seedTail =
    input.seedTerms.length > 0
      ? ` Seed themes considered: ${input.seedTerms.slice(0, 4).join(", ")}.`
      : "";

  return {
    headline: `Live Ahrefs intelligence merged with the local strategy model for ${target}.`,
    providerNote:
      `Using Ahrefs Site Explorer organic keywords and organic competitors for ${target}.${seedTail} If Ahrefs errors, the app automatically falls back to the local keyword model.`,
    siteMetrics,
    liveSuggestions,
    quickWins,
    competitors,
  };
}
