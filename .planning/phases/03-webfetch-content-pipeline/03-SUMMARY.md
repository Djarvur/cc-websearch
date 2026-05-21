---
phase: "03-webfetch-content-pipeline"
plans: 2
tags: [http, fetch, redirects, url-normalization, input-validation, readability, turndown, jsdom, perplexity, summarization, content-extraction, gfm]
requires: [01-plugin-foundation-and-primary-search]
provides:
  - HTTP fetch pipeline with URL normalization (HTTP->HTTPS) and manual redirect handling
  - Content-Type whitelist (text/html, application/xhtml) for response filtering
  - Readability + Turndown content extraction with null fallback to raw Turndown
  - 100KB truncation with marker before Perplexity summarization
  - Perplexity summarization with disable_search:true
  - Full WebFetch pipeline: fetch -> extract -> summarize/raw
affects: [05-ddg-only-with-citations]
tech-stack:
  added: ['@mozilla/readability@0.6.0', 'jsdom@29.1.1', 'turndown@7.2.4', 'turndown-plugin-gfm@1.0.2']
  patterns:
    - native-fetch-redirect-manual
    - zod-strict-object-schema
    - iife-main-pattern
    - readability-turndown-pipeline
    - perplexity-summarize-disable-search
    - content-truncation-100kb
key-files:
  created:
    - src/lib/fetch.ts
    - src/lib/content.ts
    - test/fetch.test.ts
    - test/webfetch.test.ts
    - test/content.test.ts
  modified:
    - src/lib/input.ts
    - src/lib/perplexity.ts
    - src/webfetch.ts
    - skills/webfetch/SKILL.md
    - scripts/webfetch.js
    - test/skills.test.ts
key-decisions:
  - "Readability extracts article.content; h1 title is stripped from content (moved to article.title)"
  - "Turndown configured with ATX headings, fenced code blocks, GFM plugin for tables"
  - "100KB truncation with marker suffix before sending to Perplexity"
  - "Content-Type whitelist only allows text/html and application/xhtml"
  - "HTTP URLs auto-upgraded to HTTPS in normalizeUrl"
  - "10-hop redirect cap prevents infinite loops"
requirements-completed: [FTEC-01, FTEC-02, FTEC-03, FTEC-04, FTEC-05]
duration: 13min
completed: "2026-05-20"
---

# Phase 03: WebFetch Content Pipeline Summary

**HTTP fetch pipeline with redirect handling, Readability + Turndown content extraction with null fallback, Perplexity summarization with disable_search:true, and 144 passing tests**

## Performance

- **Duration:** 13 min (2 plans)
- **Completed:** 2026-05-20
- **Total plans executed:** 2

## Accomplishments

- Built HTTP fetch pipeline (src/lib/fetch.ts) with URL normalization (HTTP->HTTPS), manual redirect handling (same-host follow, cross-host block), Content-Type whitelist, and 10-hop redirect cap
- Created Readability + Turndown content extraction pipeline (src/lib/content.ts) with null fallback to raw Turndown on non-article HTML, 100KB truncation with marker, and GFM table support
- Added Perplexity summarization with disable_search:true, system=userPrompt/user=content message structure, and retry handling
- Wired full WebFetch pipeline end-to-end: fetch -> extractMarkdown -> summarize (with API key) or raw markdown (without API key)
- Grew test suite from 115 to 144 passing tests across 13 test files

## Key Decisions

- Readability strips h1 from article.content (moves to article.title) -- content test assertions adjusted to match this documented behavior
- Turndown configured with ATX heading style (not setext), fenced code blocks (not indented), and GFM plugin for pipe-based table format
- 100KB truncation with "[... content truncated ...]" marker suffix before Perplexity call
- No API key path writes raw markdown directly to stdout without summarization
- Cross-host redirects produce CrossHostRedirectError message on stdout (not stderr) per D-10

## Next Phase Readiness

- WebFetch content pipeline complete
- Phase 4 (Config File and Logging) can proceed independently -- no blocking dependencies
- Phase 5 (DDG-Only) will later remove Perplexity summarization side
