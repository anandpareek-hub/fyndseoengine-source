# Fynd SEO Engine Personal Studio

This repo has been simplified into a single-user SEO drafting workspace.

It no longer depends on:

- authentication
- Prisma or a database
- team or multi-site management

It now uses one runtime environment variable:

- `OPENAI_API_KEY`

## What it does

The app lets you save a project profile in the browser and generate:

- strategy snapshots
- content calendars
- article briefs
- homepage refresh drafts
- content audits

Drafts are stored in local browser storage for personal use and can be copied or downloaded as markdown.

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
