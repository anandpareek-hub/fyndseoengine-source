# Fynd SEO Engine Personal Studio

This repo has been simplified into a single-user SEO workspace.

It no longer depends on:

- authentication
- Prisma or a database
- team or multi-site management

Core runtime environment variable:

- `OPENAI_API_KEY`

Optional shared-storage environment variables:

- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`

Optional search-intelligence environment variable:

- `AHREFS_API_KEY`

## What it does

The app lets you save a project profile in the browser and work across multiple tabs:

- `Strategy Studio`
  - strategy snapshots
  - content calendars
  - article briefs
  - homepage refresh drafts
  - content audits
- `Technical Audit`
  - page-level HTML audit
  - current vs to-be markup suggestions
  - quick wins and major fixes
- `Shared Workspace`
  - save or load a project by workspace key when Neo4j is configured
  - local-first fallback when graph storage is not connected
- `Keyword Map`
  - Ahrefs-backed live keyword and competitor intelligence when available
  - deterministic local fallback when Ahrefs is missing or unavailable
  - commercial, comparison, supporting, and question-style terms
- `Fix Actions`
  - prioritized implementation backlog
  - new-page opportunities and content motions
- `New Page Generator`
  - SEO page drafts with slug, metadata, CTA, schema ideas, and markdown output

Drafts and the latest audit state are stored in local browser storage for personal use and can be copied or downloaded as markdown.

## Open-source vs API usage

By default:

- technical audit uses open-source HTML parsing with `cheerio`
- keyword generation uses deterministic local logic
- Ahrefs Site Explorer can enrich keyword and competitor insight when `AHREFS_API_KEY` is present
- markdown preview uses `marked`
- slug generation uses `slugify`

Only AI-assisted features require an API key:

- strategy drafts
- fix-action planning
- new page generation

Those use:

- `OPENAI_API_KEY`

Optional future upgrades, not required for this version:

- Google PageSpeed Insights API for lab performance data
- Google Search Console for query and page performance
- SERP / keyword APIs if you want real search-volume data instead of local heuristics
- Ahrefs if you want competitor, backlink, and keyword intelligence beyond the local clustering logic

## Local development

1. Install dependencies:

```bash
npm install
```

2. Add your environment variable:

```bash
OPENAI_API_KEY=your_key_here
```

3. Start the app:

```bash
npm run dev
```

## Vercel

Use the standard Next.js settings.

Minimum env:

- `OPENAI_API_KEY`

If you want the shared team workspace on Vercel, also add:

- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`

If you want Ahrefs-backed search intelligence, add:

- `AHREFS_API_KEY`
