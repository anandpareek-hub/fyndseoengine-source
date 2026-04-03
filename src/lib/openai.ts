import OpenAI from "openai";

export type DraftKind =
  | "strategy-snapshot"
  | "content-calendar"
  | "article-brief"
  | "homepage-refresh"
  | "content-audit";

export type DraftRequest = {
  kind: DraftKind;
  projectName: string;
  websiteUrl: string;
  audience: string;
  offer: string;
  differentiators: string;
  goals: string;
  voice: string;
  notes: string;
  focusKeyword: string;
  constraints: string;
};

const MODEL = "gpt-4o-mini";

let client: OpenAI | null = null;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add it before generating drafts.");
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
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

function buildPrompt(input: DraftRequest) {
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

export async function generateDraft(input: DraftRequest) {
  const response = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0.75,
    max_tokens: 2200,
    messages: [
      {
        role: "system",
        content:
          "You are a senior SEO strategist and editorial lead. You create decisive, high-signal deliverables for lean teams. Avoid generic filler and make the output directly actionable.",
      },
      {
        role: "user",
        content: buildPrompt(input),
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return content;
}
