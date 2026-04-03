/**
 * Serper.dev API client
 * Docs: https://serper.dev/
 * Auth: X-API-KEY header
 */

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperResponse {
  organic: {
    title: string;
    link: string;
    snippet: string;
    position: number;
  }[];
  peopleAlsoAsk?: {
    question: string;
    snippet: string;
    link: string;
  }[];
  relatedSearches?: {
    query: string;
  }[];
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
    num: number;
  };
  knowledgeGraph?: {
    title: string;
    type: string;
    description: string;
  };
}

export interface SerpResult {
  keyword: string;
  position: number | null;
  url: string | null;
  title: string | null;
  topResults: { position: number; title: string; url: string; snippet: string }[];
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  serpFeatures: string[];
}

async function serperRequest(apiKey: string, body: Record<string, unknown>): Promise<SerperResponse> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<SerperResponse>;
}

/**
 * Search Google and get SERP results for a keyword
 */
export async function searchGoogle(
  apiKey: string,
  keyword: string,
  options?: {
    country?: string; // gl param, e.g. "us", "ae"
    language?: string; // hl param, e.g. "en", "ar"
    numResults?: number;
  }
): Promise<SerpResult> {
  const data = await serperRequest(apiKey, {
    q: keyword,
    gl: options?.country || "us",
    hl: options?.language || "en",
    num: options?.numResults || 100,
  });

  const serpFeatures: string[] = [];
  if (data.knowledgeGraph) serpFeatures.push("knowledge_graph");
  if (data.peopleAlsoAsk && data.peopleAlsoAsk.length > 0) serpFeatures.push("people_also_ask");
  if (data.relatedSearches && data.relatedSearches.length > 0) serpFeatures.push("related_searches");

  return {
    keyword,
    position: null, // Will be filled by findDomainPosition
    url: null,
    title: null,
    topResults: (data.organic || []).slice(0, 10).map((r) => ({
      position: r.position,
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    })),
    peopleAlsoAsk: (data.peopleAlsoAsk || []).map((p) => p.question),
    relatedSearches: (data.relatedSearches || []).map((r) => r.query),
    serpFeatures,
  };
}

/**
 * Check where a specific domain ranks for a keyword
 */
export async function checkRanking(
  apiKey: string,
  keyword: string,
  targetDomain: string,
  options?: {
    country?: string;
    language?: string;
  }
): Promise<SerpResult> {
  const result = await searchGoogle(apiKey, keyword, {
    country: options?.country,
    language: options?.language,
    numResults: 100,
  });

  // Find the target domain in results
  const match = result.topResults.find(
    (r) => r.url.includes(targetDomain)
  );

  if (match) {
    result.position = match.position;
    result.url = match.url;
    result.title = match.title;
  }

  return result;
}

/**
 * Bulk rank check for multiple keywords
 */
export async function bulkCheckRankings(
  apiKey: string,
  keywords: string[],
  targetDomain: string,
  options?: {
    country?: string;
    language?: string;
  }
): Promise<SerpResult[]> {
  const results: SerpResult[] = [];
  for (const keyword of keywords) {
    const result = await checkRanking(apiKey, keyword, targetDomain, options);
    results.push(result);
  }
  return results;
}

/**
 * Get People Also Ask questions for a keyword
 */
export async function getPeopleAlsoAsk(
  apiKey: string,
  keyword: string,
  options?: { country?: string; language?: string }
): Promise<string[]> {
  const result = await searchGoogle(apiKey, keyword, options);
  return result.peopleAlsoAsk;
}

/**
 * Get competitor analysis for a keyword (top 10 ranking pages)
 */
export async function getTopCompetitors(
  apiKey: string,
  keyword: string,
  options?: { country?: string; language?: string }
): Promise<{ position: number; title: string; url: string; domain: string; snippet: string }[]> {
  const result = await searchGoogle(apiKey, keyword, {
    ...options,
    numResults: 10,
  });

  return result.topResults.map((r) => ({
    ...r,
    domain: new URL(r.url).hostname.replace("www.", ""),
  }));
}

/**
 * Test Serper.dev connection
 */
export async function testSerperConnection(
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: "test", num: 1 }),
    });
    if (res.ok) {
      return { success: true };
    }
    return { success: false, error: "Invalid Serper API key" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Connection failed";
    return { success: false, error: msg };
  }
}

/**
 * Get Google autocomplete suggestions for a keyword
 */
export async function getAutocomplete(
  apiKey: string,
  keyword: string,
  options?: { country?: string; language?: string }
): Promise<string[]> {
  const res = await fetch("https://google.serper.dev/autocomplete", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: keyword,
      gl: options?.country || "us",
      hl: options?.language || "en",
    }),
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return (data.suggestions || []).map((s: any) => s.value || s);
}
