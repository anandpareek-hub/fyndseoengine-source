import { askClaudeJSON } from "@/lib/ai";

interface PlanGoal {
  title: string;
  description: string;
  site: {
    domain: string;
    industry: string;
    targetAudience: string;
    brandVoice: string;
  };
}

interface TopicCluster {
  name: string;
  pillarTopic: string;
  keywords: {
    keyword: string;
    searchIntent: "informational" | "navigational" | "transactional" | "commercial";
    estimatedDifficulty: "low" | "medium" | "high";
    priority: number;
  }[];
}

interface ContentTask {
  title: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  brief: string;
  cluster: string;
  contentType: "pillar" | "supporting" | "comparison" | "how-to" | "listicle" | "case-study";
  priority: number;
  scheduledDate: string;
  estimatedWordCount: number;
}

interface SEOPlan {
  strategy: {
    overview: string;
    primaryGoal: string;
    timelineWeeks: number;
    expectedOutcomes: string[];
  };
  topicClusters: TopicCluster[];
  tasks: ContentTask[];
}

export async function generatePlan(goal: PlanGoal): Promise<SEOPlan> {
  // Stage 1: Keyword research and topic clustering
  const keywordResearch = await askClaudeJSON<{
    topicClusters: TopicCluster[];
    strategyNotes: string;
  }>(
    `You are an expert SEO strategist performing keyword research for a content plan.

CONTEXT:
- Goal: "${goal.title}" — ${goal.description}
- Domain: ${goal.site.domain}
- Industry: ${goal.site.industry}
- Target Audience: ${goal.site.targetAudience}
- Brand Voice: ${goal.site.brandVoice}

TASK:
Generate a comprehensive keyword research output with 20-30 keywords organized into 4-6 topic clusters.

For each topic cluster, provide:
- "name": A descriptive cluster name
- "pillarTopic": The main pillar page topic for this cluster
- "keywords": Array of 4-7 keywords, each with:
  - "keyword": The exact search query people use
  - "searchIntent": One of "informational", "navigational", "transactional", "commercial"
  - "estimatedDifficulty": "low", "medium", or "high" based on how competitive the keyword is
  - "priority": 1-10 score (10 = highest priority)

Focus on:
1. Long-tail keywords with clear search intent that match the target audience
2. Mix of difficulty levels — include some quick wins (low difficulty) and high-value targets
3. Keywords that form natural content hierarchies (pillar → cluster → supporting)
4. Questions people ask (People Also Ask style queries)
5. Commercial and transactional keywords where appropriate for the industry

Also include "strategyNotes" with a brief paragraph about the overall keyword strategy rationale.

Return valid JSON with keys: "topicClusters" (array) and "strategyNotes" (string).`,
    {
      maxTokens: 4096,
      temperature: 0.6,
      system:
        "You are a senior SEO strategist with 15+ years of experience in keyword research, content strategy, and organic growth. You understand search intent deeply and create strategies that drive measurable results. Respond ONLY with valid JSON.",
    }
  );

  // Stage 2: Content calendar with titles, briefs, priorities, dates
  const contentCalendar = await askClaudeJSON<{
    strategy: {
      overview: string;
      primaryGoal: string;
      timelineWeeks: number;
      expectedOutcomes: string[];
    };
    tasks: ContentTask[];
  }>(
    `You are an expert SEO content strategist creating a detailed content calendar.

CONTEXT:
- Goal: "${goal.title}" — ${goal.description}
- Domain: ${goal.site.domain}
- Industry: ${goal.site.industry}
- Target Audience: ${goal.site.targetAudience}
- Brand Voice: ${goal.site.brandVoice}

TOPIC CLUSTERS & KEYWORDS:
${JSON.stringify(keywordResearch.topicClusters, null, 2)}

STRATEGY NOTES:
${keywordResearch.strategyNotes}

TASK:
Create a content calendar with one article per keyword (or combine closely related keywords). For each article:

- "title": A compelling, click-worthy article title optimized for the target keyword
- "targetKeyword": The primary keyword this article targets
- "secondaryKeywords": 2-4 related keywords to weave into the content
- "brief": A 2-3 sentence content brief describing what the article should cover, the angle, and unique value proposition. Be specific about what sections to include.
- "cluster": The topic cluster name this belongs to
- "contentType": One of "pillar", "supporting", "comparison", "how-to", "listicle", "case-study"
- "priority": 1-10 (10 = publish first). Prioritize pillar content and quick-win keywords.
- "scheduledDate": ISO date string. Start from today. Space articles 2-3 days apart. Publish pillar articles before their supporting content.
- "estimatedWordCount": Realistic word count (pillar: 2500-4000, supporting: 1200-2000, how-to: 1500-2500)

Also provide:
- "strategy.overview": 2-3 sentence summary of the content strategy
- "strategy.primaryGoal": The main measurable goal
- "strategy.timelineWeeks": How many weeks this plan covers
- "strategy.expectedOutcomes": Array of 3-5 expected outcomes

Return valid JSON with keys: "strategy" (object) and "tasks" (array).`,
    {
      maxTokens: 8192,
      temperature: 0.5,
      system:
        "You are a senior content strategist who creates actionable content calendars. You understand content hierarchy, internal linking strategy, and how to sequence content for maximum SEO impact. Respond ONLY with valid JSON.",
    }
  );

  return {
    strategy: contentCalendar.strategy,
    topicClusters: keywordResearch.topicClusters,
    tasks: contentCalendar.tasks,
  };
}
