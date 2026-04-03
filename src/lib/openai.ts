import OpenAI from "openai";
import slugify from "slugify";
import type {
  AuditActionPlan,
  DraftRequest,
  DraftKind,
  GeneratedPageDraft,
  Severity,
  TechnicalAuditResult,
  WorkspaceProfile,
} from "@/lib/studio-types";

type JsonResult<T> = T;

type NewPageDraftRequest = {
  profile: WorkspaceProfile;
  pageTitle: string;
  targetKeyword: string;
  pageGoal: string;
  pageType: string;
  notes: string;
  audit?: TechnicalAuditResult | null;
  actionPlan?: AuditActionPlan | null;
};

const MODEL = "gpt-4o-mini";

let client: OpenAI | null = null;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add it before using AI features.");
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}

function normalizeSeverity(value: string | undefined): Severity {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return "medium";
}

function normalizeEffort(value: string | undefined) {
  if (value === "small" || value === "medium" || value === "large") {
    return value;
  }

  return "medium" as const;
}

function kindLabel(kind: DraftKind) {
  switch (kind) {
    case "strategy-snapshot":
      return "SEO strategy snapshot";
    case "content-calendar":
      return "content calendar";
    case "article-brief":
      return "article brief";
    case "homepage-refresh":
      return "homepage refresh";
    case "content-audit":
      return "content audit";
  }
}

function sectionGuide(kind: DraftKind) {
  switch (kind) {
    case "strategy-snapshot":
      return [
        "1. Executive summary",
        "2. Positioning and audience insight",
        "3. Search opportunity map",
        "4. Priority keyword themes",
        "5. 30-day execution plan",
        "6. Metrics to watch",
      ].join("\n");
    case "content-calendar":
      return [
        "1. Publishing angle",
        "2. 12 content ideas in a table with: title, primary keyword, intent, funnel stage, CTA",
        "3. Sequencing recommendation",
        "4. Repurposing ideas",
      ].join("\n");
    case "article-brief":
      return [
        "1. Reader promise",
        "2. Search intent breakdown",
        "3. Recommended title options",
        "4. Detailed outline",
        "5. Internal links and proof points to gather",
        "6. CTA recommendation",
      ].join("\n");
    case "homepage-refresh":
      return [
        "1. Positioning critique",
        "2. Rewritten hero copy",
        "3. Suggested homepage structure",
        "4. SEO fixes for headings, metadata, and internal links",
        "5. Test ideas",
      ].join("\n");
    case "content-audit":
      return [
        "1. What is likely working",
        "2. Biggest gaps and risks",
        "3. Quick-win page ideas",
        "4. Refresh opportunities",
        "5. Recommended weekly operating rhythm",
      ].join("\n");
  }
}

function buildStrategyPrompt(input: DraftRequest) {
  return `
Create a ${kindLabel(input.kind)} for this personal project.

Project name: ${input.projectName}
Website URL: ${input.websiteUrl}
Audience: ${input.audience}
Offer: ${input.offer}
Differentiators: ${input.differentiators}
Goals: ${input.goals}
Voice: ${input.voice}
Focus keyword: ${input.focusKeyword || "Not specified"}
Constraints: ${input.constraints || "None provided"}
Additional notes: ${input.notes || "None provided"}

Output requirements:
- Respond in polished GitHub-flavored markdown.
- Be specific, practical, and candid.
- Use tables only when they genuinely improve scanning.
- Assume this is a single operator or small personal team shipping fast.
- Prioritize decisions that can be executed in the next 30 days.
- If the brief is missing something important, make a reasonable assumption and label it clearly.

Required sections:
${sectionGuide(input.kind)}
  `.trim();
}

async function completeMarkdown(system: string, prompt: string, maxTokens = 2200) {
  const response = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0.75,
    max_tokens: maxTokens,
    messages: [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return content;
}

async function completeJSON<T>(system: string, prompt: string, maxTokens = 3200): Promise<JsonResult<T>> {
  const response = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0.45,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `${system}\n\nRespond only with valid JSON.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim() || "{}";
  return repairAndParseJSON<T>(content);
}

function repairAndParseJSON<T>(text: string): T {
  let candidate = text.trim();

  if (candidate.startsWith("```")) {
    candidate = candidate.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  candidate = candidate.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(candidate) as T;
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as T;
    }

    throw new Error("Could not parse JSON response from OpenAI.");
  }
}

function buildFallbackActionPlan(audit: TechnicalAuditResult): AuditActionPlan {
  return {
    headline: `Focus on the clearest technical and content blockers first for ${audit.title}.`,
    quickWins: audit.quickWins.slice(0, 3).map((item, index) => ({
      title: `Quick win ${index + 1}`,
      impact: "medium",
      effort: "small",
      why: item,
      steps: [
        "Update the page template or CMS field responsible for this issue.",
        "Re-test the live page after publishing the change.",
      ],
      doneWhen: "The updated page source and the live page both reflect the fix.",
    })),
    strategicFixes: audit.majorFixes.slice(0, 3).map((item, index) => ({
      title: `Strategic fix ${index + 1}`,
      impact: "high",
      effort: "medium",
      why: item,
      steps: [
        "Define the target page or template that needs the change.",
        "Ship the implementation and make sure internal links support it.",
        "Review indexing and crawl signals after launch.",
      ],
      doneWhen: "The structural change is live and linked from relevant entry pages.",
    })),
    newPages: [
      {
        title: `${audit.title} comparison page`,
        targetKeyword: `${audit.title.toLowerCase()} comparison`,
        priority: "medium",
        reason: "Comparison pages often capture evaluation-stage demand and support internal linking.",
        pageType: "comparison page",
        slug: slugify(`${audit.title} comparison page`, { lower: true, strict: true }),
      },
      {
        title: `${audit.title} use-case page`,
        targetKeyword: `${audit.title.toLowerCase()} use cases`,
        priority: "medium",
        reason: "Use-case pages turn broad product messaging into more specific search intent clusters.",
        pageType: "use-case page",
        slug: slugify(`${audit.title} use case page`, { lower: true, strict: true }),
      },
    ],
    contentMotions: [
      "Refresh the primary page metadata and heading hierarchy first.",
      "Build a supporting page cluster around use cases and comparisons.",
      "Add proof-driven copy blocks and internal links as pages expand.",
    ],
  };
}

export async function generateDraft(input: DraftRequest) {
  return completeMarkdown(
    "You are a senior SEO strategist and editorial lead. You create decisive, high-signal deliverables for lean teams. Avoid generic filler and make the output directly actionable.",
    buildStrategyPrompt(input)
  );
}

export async function generateFixActionPlan(
  profile: WorkspaceProfile,
  audit: TechnicalAuditResult
): Promise<AuditActionPlan> {
  const fallback = buildFallbackActionPlan(audit);

  try {
    const raw = await completeJSON<AuditActionPlan>(
      "You are a senior technical SEO lead creating an operator-ready action plan from a completed audit.",
      `
Project profile:
${JSON.stringify(profile, null, 2)}

Audit result:
${JSON.stringify(audit, null, 2)}

Return JSON with this shape:
{
  "headline": "string",
  "quickWins": [
    {
      "title": "string",
      "impact": "low|medium|high",
      "effort": "small|medium|large",
      "why": "string",
      "steps": ["string"],
      "doneWhen": "string"
    }
  ],
  "strategicFixes": [
    {
      "title": "string",
      "impact": "low|medium|high",
      "effort": "small|medium|large",
      "why": "string",
      "steps": ["string"],
      "doneWhen": "string"
    }
  ],
  "newPages": [
    {
      "title": "string",
      "targetKeyword": "string",
      "priority": "low|medium|high",
      "reason": "string",
      "pageType": "string"
    }
  ],
  "contentMotions": ["string"]
}

Rules:
- Tie every recommendation back to the audit evidence.
- Keep quick wins realistically shippable in under a week.
- Use strategic fixes for larger structural changes.
- Suggest 2 to 4 new pages only when they logically support the audited page.
- Do not recommend tools or APIs the project does not already use.
      `.trim(),
      2600
    );

    return {
      headline: raw.headline || fallback.headline,
      quickWins: (raw.quickWins || fallback.quickWins).slice(0, 4).map((item) => ({
        title: item.title,
        impact: normalizeSeverity(item.impact),
        effort: normalizeEffort(item.effort),
        why: item.why,
        steps: item.steps || [],
        doneWhen: item.doneWhen,
      })),
      strategicFixes: (raw.strategicFixes || fallback.strategicFixes).slice(0, 4).map((item) => ({
        title: item.title,
        impact: normalizeSeverity(item.impact),
        effort: normalizeEffort(item.effort),
        why: item.why,
        steps: item.steps || [],
        doneWhen: item.doneWhen,
      })),
      newPages: (raw.newPages || fallback.newPages).slice(0, 4).map((item) => ({
        title: item.title,
        targetKeyword: item.targetKeyword,
        priority: normalizeSeverity(item.priority),
        reason: item.reason,
        pageType: item.pageType || "landing page",
        slug: slugify(item.title || item.targetKeyword || "new-page", { lower: true, strict: true }),
      })),
      contentMotions:
        raw.contentMotions && raw.contentMotions.length > 0
          ? raw.contentMotions.slice(0, 5)
          : fallback.contentMotions,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing OPENAI_API_KEY")) {
      throw error;
    }

    return fallback;
  }
}

export async function generateNewPageDraft(
  input: NewPageDraftRequest
): Promise<GeneratedPageDraft> {
  const title = input.pageTitle.trim();
  const targetKeyword = input.targetKeyword.trim();

  if (!title || !targetKeyword) {
    throw new Error("Page title and target keyword are required.");
  }

  const result = await completeJSON<Omit<GeneratedPageDraft, "slug" | "createdAt">>(
    "You are a senior SEO content strategist, landing page writer, and QA editor. You produce copy-paste-ready SEO pages that rank and convert without robotic filler.",
    `
Create a new SEO page draft for this personal project.

Project profile:
${JSON.stringify(input.profile, null, 2)}

Latest audit context:
${JSON.stringify(input.audit || null, null, 2)}

Latest fix-action context:
${JSON.stringify(input.actionPlan || null, null, 2)}

Requested page:
${JSON.stringify(
  {
    pageTitle: input.pageTitle,
    targetKeyword: input.targetKeyword,
    pageGoal: input.pageGoal,
    pageType: input.pageType,
    notes: input.notes,
  },
  null,
  2
)}

Return JSON with this exact shape:
{
  "title": "string",
  "pageType": "string",
  "targetKeyword": "string",
  "intent": "string",
  "summary": "string",
  "metaTitle": "string",
  "metaDescription": "string",
  "cta": "string",
  "internalLinks": ["string"],
  "schemaOpportunities": ["string"],
  "conversionNotes": ["string"],
  "qaSummary": "string",
  "markdown": "string"
}

Rules:
- Follow this landing page pattern: SEO title, meta description, H1, hero support line, CTA suggestions, how it works, benefits, feature details, use cases, tips for better results, FAQ, internal links, schema opportunities, conversion notes.
- The markdown must contain final publishable prose, not strategist notes.
- Write in a natural, commercially aware voice.
- Avoid filler such as "unlock the power", "seamlessly", "next-level", or "revolutionary".
- Tie the page back to the project offer and the audit context where relevant.
- Keep the CTA realistic for a solo or small-team project.
    `.trim(),
    3400
  );

  return {
    ...result,
    title: result.title || title,
    pageType: result.pageType || input.pageType || "landing page",
    targetKeyword: result.targetKeyword || targetKeyword,
    slug: slugify(result.title || title, { lower: true, strict: true }),
    createdAt: new Date().toISOString(),
  };
}
