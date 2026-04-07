import { NextResponse } from "next/server";
import OpenAI from "openai";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PageType = "ai-tool" | "blog" | "new-page";

interface ContentRequest {
  keyword: string;
  pageUrl?: string;
  pageType: PageType;
  profile?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  OpenAI client                                                      */
/* ------------------------------------------------------------------ */

const MODEL = "gpt-4o-mini";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY. Add it before using content generation.");
  return new OpenAI({ apiKey });
}

/* ------------------------------------------------------------------ */
/*  Page fetching helper                                               */
/* ------------------------------------------------------------------ */

async function fetchPageContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FyndSEOEngine/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip scripts/styles and return a trimmed version for context
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    // Limit to ~6000 chars to stay within token budget
    return cleaned.slice(0, 6000);
  } catch {
    return "";
  }
}

/* ------------------------------------------------------------------ */
/*  Writer system prompts per page type                                */
/* ------------------------------------------------------------------ */

function writerPrompt(pageType: PageType, keyword: string, existingContent: string): string {
  const existingContext = existingContent
    ? `\n\nHere is the existing page content for reference — use it to understand tone, structure, and what already exists:\n\n${existingContent}`
    : "";

  const base = `You are an expert SEO content writer. Your task is to create structured content optimized for the keyword "${keyword}".${existingContext}\n\nIMPORTANT: Return ONLY valid JSON — no markdown fences, no commentary.`;

  if (pageType === "ai-tool") {
    return `${base}

Create content for an AI tool landing page. Output JSON with this EXACT structure:
{
  "metaTitle": "string (50-60 chars, include keyword naturally)",
  "metaDescription": "string (140-155 chars, compelling with keyword)",
  "h1": "string (clear, keyword-rich heading)",
  "heroDescription": "string (2-3 sentences describing the tool's value)",
  "ctaPrimary": "string (action-oriented button text)",
  "ctaSecondary": "string (secondary action text)",
  "howItWorks": [
    { "step": 1, "title": "string", "description": "string" },
    { "step": 2, "title": "string", "description": "string" },
    { "step": 3, "title": "string", "description": "string" }
  ],
  "features": [
    { "title": "string", "description": "string (1-2 sentences)", "icon": "string (emoji or icon name)" }
  ],
  "useCases": [
    { "title": "string", "description": "string (1-2 sentences)" }
  ],
  "tipsForBetterResults": [
    { "title": "string", "description": "string" }
  ],
  "faq": [
    { "question": "string", "answer": "string (2-4 sentences)" }
  ],
  "relatedTools": ["string"],
  "schemaMarkup": "string (JSON-LD FAQPage schema as a string)"
}

Include 4-6 features, 3-5 use cases, 3-5 tips, and 5-8 FAQ items. Make the schema markup valid JSON-LD for FAQPage.`;
  }

  if (pageType === "blog") {
    return `${base}

Create content for a blog post. Output JSON with this EXACT structure:
{
  "metaTitle": "string (50-60 chars)",
  "metaDescription": "string (140-155 chars)",
  "h1": "string",
  "introduction": "string (2-3 paragraphs, hook the reader)",
  "sections": [
    {
      "h2": "string",
      "content": "string (2-3 paragraphs)",
      "h3s": [
        { "title": "string", "content": "string (1-2 paragraphs)" }
      ]
    }
  ],
  "conclusion": "string (1-2 paragraphs, summary with CTA)",
  "faq": [
    { "question": "string", "answer": "string" }
  ],
  "internalLinks": ["string (suggested internal link anchor texts)"],
  "schemaMarkup": "string (JSON-LD Article schema as a string)"
}

Include 4-6 main sections, each with 2-3 h3 subsections. Include 4-6 FAQ items.`;
  }

  // new-page
  return `${base}

Create content for a general landing page. Output JSON with this EXACT structure:
{
  "metaTitle": "string (50-60 chars)",
  "metaDescription": "string (140-155 chars)",
  "h1": "string",
  "heroDescription": "string (2-3 sentences)",
  "sections": [
    { "h2": "string", "content": "string (2-3 paragraphs)" }
  ],
  "faq": [
    { "question": "string", "answer": "string" }
  ],
  "cta": "string (call-to-action text)",
  "internalLinks": ["string (suggested internal link anchor texts)"],
  "schemaMarkup": "string (JSON-LD WebPage schema as a string)"
}

Include 4-6 sections and 4-6 FAQ items.`;
}

/* ------------------------------------------------------------------ */
/*  Humanizer system prompt                                            */
/* ------------------------------------------------------------------ */

const HUMANIZER_SYSTEM = `You are a content humanizer. Your job is to rewrite text so it sounds like a knowledgeable human wrote it — not AI.

Rules:
- Vary sentence lengths: mix short punchy sentences with longer flowing ones
- Use a conversational but authoritative tone
- Break predictable patterns — avoid starting consecutive sentences the same way
- Use occasional contractions (you'll, it's, don't)
- Add subtle transitions that feel organic, not formulaic
- Remove filler phrases like "In today's digital landscape" or "It's worth noting"
- Avoid overused AI phrases: "leverage", "delve", "landscape", "tapestry", "game-changer", "seamlessly"
- Keep all factual accuracy and SEO keyword placement intact
- Preserve the exact JSON structure — only rewrite string values that contain prose (descriptions, content, answers, introductions, conclusions)
- Do NOT change keys, numbers, step numbers, icon values, link arrays, or schema markup
- Return ONLY valid JSON — no markdown fences, no commentary`;

/* ------------------------------------------------------------------ */
/*  Agent calls                                                        */
/* ------------------------------------------------------------------ */

async function callWriter(
  pageType: PageType,
  keyword: string,
  existingContent: string,
  profile?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const profileContext = profile
    ? `\n\nWorkspace profile context: ${JSON.stringify(profile)}`
    : "";

  const response = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: writerPrompt(pageType, keyword, existingContent) + profileContext,
      },
      {
        role: "user",
        content: `Generate structured SEO content for the keyword: "${keyword}" (page type: ${pageType})`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as Record<string, unknown>;
}

async function callHumanizer(
  content: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0.8,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: HUMANIZER_SYSTEM,
      },
      {
        role: "user",
        content: `Humanize the prose in this content JSON. Rewrite descriptions, content paragraphs, answers, and introductions to sound natural and human-written. Keep structure, keys, and non-prose values identical.\n\n${JSON.stringify(content)}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Route handler                                                      */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ContentRequest>;

    // Validate required fields
    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    if (!keyword) {
      return NextResponse.json(
        { error: "keyword is required." },
        { status: 400 }
      );
    }

    const pageType = body.pageType as PageType;
    const validPageTypes: PageType[] = ["ai-tool", "blog", "new-page"];
    if (!validPageTypes.includes(pageType)) {
      return NextResponse.json(
        { error: "pageType must be one of: ai-tool, blog, new-page." },
        { status: 400 }
      );
    }

    // Step 1: Fetch existing page content if URL provided
    let existingContent = "";
    if (body.pageUrl && typeof body.pageUrl === "string") {
      existingContent = await fetchPageContent(body.pageUrl.trim());
    }

    // Step 2: Writer Agent — generate structured content
    const writerOutput = await callWriter(
      pageType,
      keyword,
      existingContent,
      body.profile as Record<string, unknown> | undefined
    );

    // Step 3: Humanizer Agent — rewrite prose to sound natural
    const humanizedOutput = await callHumanizer(writerOutput);

    // Step 4: Return combined result
    return NextResponse.json({
      pageType,
      keyword,
      content: humanizedOutput,
      humanized: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong during content generation.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
