# Fynd SEO Engine Personal Studio

This repo has been simplified into a single-user SEO workspace.

It no longer depends on:

- authentication
- Prisma or a database
- team or multi-site management

It now uses one runtime environment variable:

- `OPENAI_API_KEY`

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
- `Keyword Map`
  - local keyword clustering without a keyword API
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

Use the standard Next.js settings and add only:

- `OPENAI_API_KEY`
