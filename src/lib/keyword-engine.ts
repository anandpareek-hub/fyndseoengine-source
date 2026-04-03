import type {
  AuditActionPlan,
  GeneratedPageDraft,
  KeywordCluster,
  KeywordReport,
  KeywordSuggestion,
  TechnicalAuditResult,
  WorkspaceProfile,
} from "@/lib/studio-types";

type KeywordEngineInput = {
  profile: WorkspaceProfile;
  audit?: TechnicalAuditResult | null;
  actionPlan?: AuditActionPlan | null;
  pageDraft?: GeneratedPageDraft | null;
  seed?: string;
};

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "how",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "with",
  "your",
]);

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhrase(value: string) {
  return compact(
    value
      .toLowerCase()
      .replace(/[|/]/g, " ")
      .replace(/[^\w\s-]/g, " ")
  );
}

function splitPhrases(value: string) {
  return value
    .split(/[\n,.;:()]+/)
    .map((item) => compact(item))
    .filter((item) => item.length > 2);
}

function tokenize(value: string) {
  return normalizePhrase(value)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function topTerms(values: string[], limit = 8) {
  const counts = new Map<string, number>();

  for (const value of values) {
    for (const token of tokenize(value)) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

function phraseCandidates(values: string[], limit = 12) {
  return unique(
    values
      .flatMap(splitPhrases)
      .map(compact)
      .filter((phrase) => phrase.split(/\s+/).length >= 2 && phrase.length <= 80)
  ).slice(0, limit);
}

function makeSuggestion(
  keyword: string,
  intent: KeywordSuggestion["intent"],
  source: string,
  why: string,
  score: number
): KeywordSuggestion {
  return {
    keyword: compact(keyword),
    intent,
    source,
    why,
    score,
  };
}

function audienceQualifier(audience: string) {
  const parts = splitPhrases(audience);
  const first = parts[0];

  if (!first) {
    return "";
  }

  const shortened = first.split(/\s+/).slice(0, 4).join(" ");
  return shortened ? `for ${shortened}` : "";
}

function buildCluster(
  label: string,
  description: string,
  suggestions: KeywordSuggestion[]
): KeywordCluster {
  return {
    label,
    description,
    suggestions: uniqueByKeyword(suggestions).slice(0, 8),
  };
}

function uniqueByKeyword(values: KeywordSuggestion[]) {
  const seen = new Set<string>();

  return values.filter((item) => {
    const key = normalizePhrase(item.keyword);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function generateKeywordReport(input: KeywordEngineInput): KeywordReport {
  const candidateSources = [
    input.seed || "",
    input.profile.projectName,
    input.profile.offer,
    input.profile.audience,
    input.profile.differentiators,
    input.profile.goals,
    input.audit?.title || "",
    input.audit?.snapshot.titleTag || "",
    input.audit?.snapshot.metaDescription || "",
    ...(input.audit?.snapshot.h1s || []),
    ...(input.audit?.snapshot.h2s || []),
    ...(input.actionPlan?.newPages.map((item) => item.targetKeyword) || []),
    input.pageDraft?.title || "",
    input.pageDraft?.targetKeyword || "",
  ].filter(Boolean);

  const phrases = phraseCandidates(candidateSources, 18);
  const terms = topTerms(candidateSources, 10);
  const audience = audienceQualifier(input.profile.audience);
  const core = phrases[0] || input.audit?.title || input.profile.offer || input.profile.projectName;
  const fallbackTerm = terms[0] || "seo";

  const commercial = buildCluster(
    "Money keywords",
    "Commercial terms built from your offer, strongest page theme, and action-plan ideas.",
    uniqueByKeyword([
      makeSuggestion(`${core}`, "commercial", "profile", "Strongest direct phrase pulled from the project and audit context.", 98),
      makeSuggestion(`${core} pricing`, "commercial", "heuristic", "Pricing modifiers catch decision-stage searches.", 92),
      makeSuggestion(`${core} services`, "commercial", "heuristic", "Service modifiers work well for offer-led pages.", 90),
      makeSuggestion(`${core} tool`, "transactional", "heuristic", "Tool-oriented searches often signal product intent.", 88),
      makeSuggestion(`${core} ${audience}`.trim(), "commercial", "heuristic", "Audience qualifiers help find tighter-fit traffic.", 87),
      makeSuggestion(`${fallbackTerm} software`, "commercial", "heuristic", "Software terms surface commercial comparisons.", 82),
      makeSuggestion(`${fallbackTerm} examples`, "commercial", "heuristic", "Examples often bridge research and action.", 78),
      makeSuggestion(`${fallbackTerm} templates`, "commercial", "heuristic", "Template language is high-intent for practical workflows.", 76),
    ])
  );

  const informational = buildCluster(
    "Supporting content",
    "Educational and problem-aware terms to support internal linking and build topical depth.",
    uniqueByKeyword([
      makeSuggestion(`how to ${fallbackTerm}`, "informational", "heuristic", "How-to keywords create useful mid-funnel support pages.", 91),
      makeSuggestion(`what is ${fallbackTerm}`, "informational", "heuristic", "Definition-style pages help capture broad educational demand.", 86),
      makeSuggestion(`${fallbackTerm} checklist`, "informational", "heuristic", "Checklist content performs well for operational search intent.", 83),
      makeSuggestion(`${fallbackTerm} best practices`, "informational", "heuristic", "Best-practice guides support authority and internal links.", 81),
      makeSuggestion(`${fallbackTerm} mistakes`, "informational", "heuristic", "Problem framing often converts into useful content refreshes.", 79),
      makeSuggestion(`${fallbackTerm} guide ${audience}`.trim(), "informational", "heuristic", "Audience-specific guides turn broad traffic into qualified readers.", 77),
      makeSuggestion(`${fallbackTerm} faq`, "informational", "heuristic", "FAQ terms map well to schema and snippet-ready pages.", 74),
      makeSuggestion(`${fallbackTerm} workflow`, "informational", "heuristic", "Workflow content can bridge education and product consideration.", 73),
    ])
  );

  const comparisons = buildCluster(
    "Comparisons and alternatives",
    "Bottom-funnel terms for users evaluating options or choosing an implementation path.",
    uniqueByKeyword([
      makeSuggestion(`${core} vs alternatives`, "comparison", "heuristic", "Comparison pages capture evaluation-stage traffic.", 90),
      makeSuggestion(`${core} alternatives`, "comparison", "heuristic", "Alternative keywords are strong commercial research terms.", 88),
      makeSuggestion(`best ${fallbackTerm} tools`, "comparison", "heuristic", "List-style evaluations are usually high intent.", 84),
      makeSuggestion(`${fallbackTerm} vs manual`, "comparison", "heuristic", "Decision framing can capture product-ready searchers.", 79),
      makeSuggestion(`${fallbackTerm} comparison`, "comparison", "heuristic", "Comparison modifiers pair well with money pages.", 78),
      makeSuggestion(`${fallbackTerm} review`, "comparison", "heuristic", "Review queries often reflect serious buying research.", 75),
    ])
  );

  const questions = buildCluster(
    "Questions worth answering",
    "FAQ-style and snippet-friendly queries based on the audit and offer context.",
    uniqueByKeyword([
      makeSuggestion(`how does ${fallbackTerm} work`, "informational", "heuristic", "Great candidate for FAQs and explanation blocks.", 84),
      makeSuggestion(`why use ${fallbackTerm}`, "informational", "heuristic", "Pairs well with benefits and conversion sections.", 80),
      makeSuggestion(`when should you use ${fallbackTerm}`, "informational", "heuristic", "Useful for handling objections and qualification.", 77),
      makeSuggestion(`is ${fallbackTerm} worth it`, "comparison", "heuristic", "Decision-stage question with commercial undertones.", 76),
      makeSuggestion(`what problems does ${fallbackTerm} solve`, "informational", "heuristic", "Maps neatly to use-case content.", 74),
      makeSuggestion(`how to choose ${fallbackTerm}`, "comparison", "heuristic", "Strong for comparison guides and checklists.", 73),
    ])
  );

  const quickWins = unique([
    commercial.suggestions[0]?.keyword,
    comparisons.suggestions[0]?.keyword,
    informational.suggestions[0]?.keyword,
    input.actionPlan?.newPages[0]?.targetKeyword || "",
  ]).filter(Boolean);

  return {
    headline: `Keyword ideas built from your project profile${input.audit ? ", latest audit" : ""}${input.actionPlan ? ", and action plan" : ""}.`,
    seedTerms: unique([...phrases.slice(0, 8), ...terms.slice(0, 6)]).slice(0, 10),
    quickWins,
    clusters: [commercial, comparisons, informational, questions],
    provider: "local-fallback",
    providerLabel: "Local keyword model",
    providerNote:
      "This map was generated from the project profile, audit context, action plan, and current page draft. It stays available even if external search APIs are unavailable.",
    siteMetrics: [],
    competitors: [],
  };
}
