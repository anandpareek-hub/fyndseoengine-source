import OpenAI from "openai";

const clients = new Map<string, OpenAI>();

function getClient(apiKey?: string): OpenAI {
  const key = apiKey || process.env.OPENAI_API_KEY!;
  if (!clients.has(key)) {
    clients.set(key, new OpenAI({ apiKey: key }));
  }
  return clients.get(key)!;
}

export async function askClaude(
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    system?: string;
    apiKey?: string;
  }
): Promise<string> {
  const client = getClient(options?.apiKey);
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature ?? 0.7,
    messages: [
      {
        role: "system",
        content: options?.system || "You are an expert SEO strategist and content writer.",
      },
      { role: "user", content: prompt },
    ],
  });

  return response.choices[0]?.message?.content || "";
}

export async function askClaudeJSON<T>(
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    system?: string;
    apiKey?: string;
  }
): Promise<T> {
  const systemPrompt = (options?.system || "You are an expert SEO strategist.") +
    "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanations.";

  const client = getClient(options?.apiKey);
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature ?? 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  let text = response.choices[0]?.message?.content || "{}";

  // Clean markdown wrappers if any
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt to repair truncated JSON
    return repairAndParseJSON<T>(cleaned);
  }
}

function repairAndParseJSON<T>(text: string): T {
  let s = text.trim();

  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1");

  // Try to close unclosed strings, arrays, objects
  const openBraces = (s.match(/{/g) || []).length;
  const closeBraces = (s.match(/}/g) || []).length;
  const openBrackets = (s.match(/\[/g) || []).length;
  const closeBrackets = (s.match(/]/g) || []).length;

  // If we're inside an unterminated string, try to close it
  // Find the last quote and check if it's unclosed
  const lastQuote = s.lastIndexOf('"');
  if (lastQuote > 0) {
    const afterLast = s.slice(lastQuote + 1);
    // If after the last quote there's no closing structure, we may have a truncated string value
    if (!/[}\],:"]/.test(afterLast.trim())) {
      s = s.slice(0, lastQuote + 1);
    }
  }

  // Remove trailing incomplete key-value pairs (e.g., `"key": "unterminated`)
  s = s.replace(/,?\s*"[^"]*":\s*"[^"]*$/, "");
  s = s.replace(/,?\s*"[^"]*":\s*$/, "");
  s = s.replace(/,?\s*"[^"]*$/, "");

  // Remove trailing commas again after repairs
  s = s.replace(/,\s*$/gm, "");

  // Close unclosed brackets/braces
  for (let i = 0; i < openBrackets - closeBrackets; i++) s += "]";
  const newOpenBraces = (s.match(/{/g) || []).length;
  const newCloseBraces = (s.match(/}/g) || []).length;
  for (let i = 0; i < newOpenBraces - newCloseBraces; i++) s += "}";

  try {
    return JSON.parse(s) as T;
  } catch {
    // Last resort: try to find the largest valid JSON object
    const firstBrace = s.indexOf("{");
    if (firstBrace >= 0) {
      let depth = 0;
      let inString = false;
      let lastValidEnd = -1;
      for (let i = firstBrace; i < s.length; i++) {
        const c = s[i];
        if (inString) {
          if (c === "\\" ) { i++; continue; }
          if (c === '"') inString = false;
        } else {
          if (c === '"') inString = true;
          else if (c === "{" || c === "[") depth++;
          else if (c === "}" || c === "]") {
            depth--;
            if (depth === 0) lastValidEnd = i;
          }
        }
      }
      if (lastValidEnd > 0) {
        return JSON.parse(s.slice(firstBrace, lastValidEnd + 1)) as T;
      }
    }
    throw new Error("Failed to parse JSON even after repair: " + s.slice(0, 200));
  }
}

export async function testOpenAIConnection(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = new OpenAI({ apiKey });
    await client.models.list();
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Connection failed";
    return { success: false, error: msg };
  }
}
