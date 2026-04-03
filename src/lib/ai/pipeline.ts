import { researchKeyword } from "@/lib/ai/serp-research";
import { generateArticle } from "./writer";
import { checkArticle } from "./checker";
import { qaScoreArticle, QAResult } from "./qa";
import { getSitemapUrls, getInterlinkUrls } from "@/lib/sitemap";
import { getProductsForArticle, ProductData } from "@/lib/product-scraper";
async function getKnowledgeContext(siteId: string): Promise<string> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const assets = await prisma.knowledgeAsset.findMany({
      where: { siteId, status: "ready" },
      select: { fileName: true, extractedText: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    if (assets.length === 0) return "";
    
    const context = assets
      .map((a: { fileName: string; extractedText: string }) => {
        const text = a.extractedText.slice(0, 3000);
        return `--- ${a.fileName} ---\n${text}`;
      })
      .join("\n\n");
    
    return `\n\n## Brand Knowledge Base\nUse the following reference documents when writing. Incorporate relevant facts, terminology, and brand voice:\n\n${context}\n`;
  } catch {
    return "";
  }
}


interface TaskInput {
  title: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  brief: string;
  cluster: string;
}

interface SiteContext {
  name?: string;
  description?: string;
  domain: string;
  brandVoice: string;
  targetAudience: string;
  industry: string;
  siteId?: string;
}

interface PipelineResult {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  content: string;
  contentMarkdown: string;
  sections: { heading: string; anchor: string }[];
  faqItems: { question: string; answer: string }[];
  keywords: string[];
  wordCount: number;
  qaScore: number;
  qaPassed: boolean;
  qaResult: QAResult;
  pipelineLog: PipelineStep[];
  attempts: number;
}

interface PipelineStep {
  agent: "maker" | "checker" | "qa";
  timestamp: string;
  duration: number;
  result: string; // summary
}

const MAX_ATTEMPTS = 3;
const QA_THRESHOLD = 65;

export async function runContentPipeline(
  task: TaskInput,
  site: SiteContext
): Promise<PipelineResult> {
  const pipelineLog: PipelineStep[] = [];
  let attempts = 0;

  // Fetch real sitemap URLs for interlinking (skip product/collection scraping for general blog content)
  let interlinkUrls: string[] = [];
  let productUrls: string[] = [];
  let collectionUrls: string[] = [];
  let scrapedProducts: ProductData[] = [];
  if (site.siteId) {
    try {
      const sitemapUrls = await getSitemapUrls(site.siteId, site.domain);
      // If sitemapUrls lack category field, extract URLs directly
      if (sitemapUrls.length > 0 && !sitemapUrls[0].category) {
        interlinkUrls = sitemapUrls.slice(0, 50).map((u: any) => u.url || u);
      } else {
        interlinkUrls = getInterlinkUrls(sitemapUrls, 50);
      }
      // Skip product/collection URL filtering and product scraping for general blog content
      console.log(`[pipeline] Loaded ${interlinkUrls.length} interlink URLs for ${site.domain} (general blog mode, skipping product scraping)`);
    } catch (err) {
      console.warn(`[pipeline] Could not load sitemap URLs for ${site.domain}:`, err);
    }
  }
  let currentContent = {
    title: "",
    slug: "",
    metaTitle: "",
    metaDescription: "",
    content: "",
    contentMarkdown: "",
    sections: [] as { heading: string; anchor: string }[],
    faqItems: [] as { question: string; answer: string }[],
    keywords: [] as string[],
    wordCount: 0,
  };
  let lastQA: QAResult | null = null;
  let revisionContext = "";

  while (attempts < MAX_ATTEMPTS) {
    attempts++;

    // === STEP 1: MAKER (Writer) ===
    const makerStart = Date.now();
    
    // Fetch knowledge base context for brand-aware writing
    let knowledgeContext = "";
    if (site.siteId && attempts === 1) {
      knowledgeContext = await getKnowledgeContext(site.siteId);
    }

    // SERP research - analyze top Google results for the keyword
    let serpResearch = "";
    try {
      const openaiKey = process.env.OPENAI_API_KEY || "";
      if (openaiKey) {
        console.log(`[pipeline] Researching SERP for "${task.targetKeyword}"...`);
        serpResearch = await researchKeyword(task.targetKeyword, openaiKey, site.domain);
        if (serpResearch) {
          console.log(`[pipeline] SERP research complete for "${task.targetKeyword}"`);
        }
      }
    } catch (err) {
      console.log(`[pipeline] SERP research failed (non-critical):`, err);
    }
    
    const writerPromptAddition = revisionContext
      ? `\n\nIMPORTANT REVISION CONTEXT FROM QA (attempt ${attempts}):\n${revisionContext}\nYou MUST address ALL of these issues in this revision. Do not repeat the same mistakes.`
      : "";

    const article = await generateArticle(
      {
        ...task,
        brief: task.brief + knowledgeContext + serpResearch + writerPromptAddition, // knowledge injected on all attempts
      },
      { ...site, interlinkUrls, productUrls, collectionUrls, scrapedProducts }
    );

    currentContent = { ...article };
    pipelineLog.push({
      agent: "maker",
      timestamp: new Date().toISOString(),
      duration: Date.now() - makerStart,
      result: `Generated article: "${article.title}" (${article.wordCount} words)${attempts > 1 ? ` [revision attempt ${attempts}]` : ""}`,
    });

    // === STEP 2: CHECKER (Editor) ===
    const checkerStart = Date.now();
    const checked = await checkArticle(
      {
        title: currentContent.title,
        content: currentContent.content,
        metaTitle: currentContent.metaTitle,
        metaDescription: currentContent.metaDescription,
        targetKeyword: task.targetKeyword,
        secondaryKeywords: task.secondaryKeywords,
      },
      { brandVoice: site.brandVoice, industry: site.industry }
    );

    // Apply checker's revisions
    currentContent.title = checked.revisedTitle || currentContent.title;
    currentContent.metaTitle = checked.revisedMetaTitle || currentContent.metaTitle;
    currentContent.metaDescription = checked.revisedMetaDescription || currentContent.metaDescription;
    if (checked.revisedContent) {
      currentContent.content = checked.revisedContent;
      // Recalculate word count after checker edits
      const checkedText = checked.revisedContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      currentContent.wordCount = checkedText.split(/\s+/).filter(Boolean).length;
    }

    pipelineLog.push({
      agent: "checker",
      timestamp: new Date().toISOString(),
      duration: Date.now() - checkerStart,
      result: `Applied ${checked.changes.length} editorial fixes, flagged ${checked.factCheckFlags.length} fact-check items`,
    });

    // === STEP 3: QA (Scorer) ===
    const qaStart = Date.now();
    const qaResult = await qaScoreArticle(
      {
        title: currentContent.title,
        slug: currentContent.slug,
        metaTitle: currentContent.metaTitle,
        metaDescription: currentContent.metaDescription,
        content: currentContent.content,
        targetKeyword: task.targetKeyword,
        secondaryKeywords: task.secondaryKeywords,
        wordCount: currentContent.wordCount,
      },
      { domain: site.domain, industry: site.industry, brandVoice: site.brandVoice }
    );

    lastQA = qaResult;
    pipelineLog.push({
      agent: "qa",
      timestamp: new Date().toISOString(),
      duration: Date.now() - qaStart,
      result: `QA Score: ${qaResult.overallScore}/100 (${qaResult.passed ? "PASSED" : "FAILED"}) — Patterns found: ${qaResult.aiPatterns.length}`,
    });

    // Check if QA passed
    if (qaResult.overallScore >= QA_THRESHOLD) {
      return {
        ...currentContent,
        qaScore: qaResult.overallScore,
        qaPassed: true,
        qaResult,
        pipelineLog,
        attempts,
      };
    }

    // QA failed — prepare revision context for next attempt
    const failedCriteria = qaResult.criteria
      .filter((c) => !c.passed)
      .map((c) => `- ${c.name}: ${c.score}/100 — ${c.feedback}`)
      .join("\n");

    revisionContext = `QA Score: ${qaResult.overallScore}/100 (needs ${QA_THRESHOLD}+)

FAILED CRITERIA:
${failedCriteria}

AI PATTERNS DETECTED (MUST FIX):
${qaResult.aiPatterns.map((p) => `- ${p}`).join("\n")}

SPECIFIC REVISION INSTRUCTIONS:
${qaResult.revisionInstructions}`;
  }

  // Max attempts reached — return with failed QA
  return {
    ...currentContent,
    qaScore: lastQA?.overallScore ?? 0,
    qaPassed: false,
    qaResult: lastQA!,
    pipelineLog,
    attempts,
  };
}
