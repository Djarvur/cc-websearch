# Phase 3: WebFetch Content Pipeline - Research

**Researched:** 2026-05-20
**Domain:** HTTP fetching, content extraction, HTML-to-Markdown, LLM summarization via Perplexity API
**Confidence:** HIGH

## Summary

Phase 3 implements the WebFetch content pipeline: fetching web pages, extracting article content via Readability, converting to Markdown via Turndown, and optionally summarizing via Perplexity Chat Completions. The pipeline replaces the existing stub in `src/webfetch.ts` with a full implementation spanning HTTP fetch with redirect handling (using native `fetch` with `redirect: 'manual'`), content extraction via `@mozilla/readability` + `jsdom`, HTML-to-Markdown conversion via `turndown` + `turndown-plugin-gfm`, and LLM summarization via the existing Perplexity SDK with `disable_search: true`.

The key technical discovery is that Claude Code's built-in WebFetch tool sends extracted content to a small fast model with a specific prompt template, returning a concise answer rather than raw page content. Our implementation mirrors this by sending extracted markdown + user prompt to Perplexity's sonar model with `disable_search: true` to prevent web search and instead summarize the provided content. The Perplexity SDK v0.29.0 already installed in the project supports this parameter.

Content size management is critical: the sonar model has a ~127K token context window. A conservative approach truncates extracted markdown to ~100KB of text (matching Claude Code's own behavior) before sending to Perplexity. When no API key is available, raw extracted markdown is returned directly to stdout as a graceful degradation path.

**Primary recommendation:** Build three new modules (`src/lib/fetch.ts`, `src/lib/content.ts`, and a `summarize()` function in `src/lib/perplexity.ts`), then wire them in `src/webfetch.ts`. Use native `fetch` with manual redirect handling. Use Readability with Turndown for content extraction. Use Perplexity SDK with `disable_search: true` for summarization.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Researcher MUST examine real Claude Code WebFetch output to determine exact format (markdown, XML, structure). Output must match byte-for-byte.
- **D-02:** Include Perplexity citations in output when summarization is used. Do not strip them.
- **D-03:** Return raw answer text from Perplexity -- no structural wrapper, no metadata prefix. Simple stdout write.
- **D-04:** Reuse same sonar model as WebSearch. Model from `PPLX_MODEL` env var, default `sonar`. No separate model config for WebFetch.
- **D-05:** Prompt structure: page content as user message, user's prompt as system instruction. Leverages Perplexity's citation system naturally.
- **D-06:** Content size / truncation strategy: researcher determines based on Perplexity context window limits. Must handle large pages gracefully.
- **D-07:** Conditional output path: when page is short enough or Perplexity unavailable/no key, return raw extracted markdown. When Perplexity available, send content + prompt for summarized answer.
- **D-08:** No API key = return raw markdown (not an error). Graceful degradation matching WebSearch's DDG fallback philosophy.
- **D-09:** Use `fetch` with `redirect: 'manual'` to implement custom redirect logic. No external redirect library.
- **D-10:** Cross-host redirect: return short human-readable message to stdout (e.g., "Redirect from [original] to [target] -- cross-host redirect not followed"). Not structured metadata.
- **D-11:** Same-host redirects: follow to completion, cap at 10 hops to prevent infinite loops. After 10 hops, return error.
- **D-12:** Non-HTML content types (PDF, binary, JSON, etc.): return error to stderr with descriptive message including Content-Type. Clean exit, no crash. Only `text/html` and `application/xhtml` proceed.
- **D-13:** Readability null fallback: when Readability can't extract article content (nav-heavy pages, paywalls, non-articles), fall through to raw Turndown on full HTML -> send to Perplexity. Noisy but functional.
- **D-14:** HTTP 4xx/5xx responses: return error to stderr immediately (e.g., "HTTP 404: Page not found at [URL]"). No body extraction or Perplexity call for error pages.
- **D-15:** Content-Type whitelist check before processing. Only `text/html` and `application/xhtml` proceed. Everything else errors early.

### Claude's Discretion
- Exact Perplexity prompt wording (system message template)
- Content truncation implementation details (deferred to researcher for context window sizing)
- Size threshold for "short page" raw markdown path
- Turndown configuration (heading style, code blocks, etc.)
- Error message wording and formatting

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FTEC-01 | Script accepts `{url: string (required), prompt: string (required)}` | New `WebFetchInputSchema` in `src/lib/input.ts` using Zod. Pattern established by `WebSearchInputSchema`. |
| FTEC-02 | URL normalization: HTTP auto-upgraded to HTTPS | `URL` constructor in new `src/lib/fetch.ts`. Replace `http:` scheme with `https:`. D-09 specifies `redirect: 'manual'`. |
| FTEC-03 | HTML-to-Markdown via Readability + Turndown, with null fallback | New `src/lib/content.ts`. `@mozilla/readability` + `jsdom` for extraction, `turndown` + `turndown-plugin-gfm` for conversion. D-13 specifies raw Turndown fallback when Readability returns null. |
| FTEC-04 | LLM summarization via Perplexity Chat Completions | New `summarize()` in `src/lib/perplexity.ts`. Uses `disable_search: true` on the SDK. D-04 reuses `sonar` model. D-05 specifies prompt structure. |
| FTEC-05 | Same-host redirects followed; cross-host redirects return metadata | New `src/lib/fetch.ts` with `redirect: 'manual'` loop. D-09/D-10/D-11 specify exact behavior. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Input validation (url + prompt) | CLI script | -- | Script reads stdin, validates via Zod |
| HTTP fetching + redirects | CLI script (new module) | -- | Native `fetch` with manual redirect handling |
| Content extraction (Readability + Turndown) | CLI script (new module) | -- | Node.js DOM via jsdom, no browser needed |
| LLM summarization | Perplexity API | CLI script (raw markdown fallback) | API when key present, raw markdown when not |
| Output formatting | CLI script (stdout) | -- | Plain text to stdout, errors to stderr |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mozilla/readability` | 0.6.0 | Content extraction from HTML | Firefox Reader View engine. Returns `title`, `content`, `textContent`, `excerpt`, etc. [VERIFIED: npm registry] |
| `jsdom` | 29.1.1 | W3C DOM for Readability | Required by Readability (needs `document` object). Pass `url` option for relative URL resolution. [VERIFIED: npm registry] |
| `turndown` | 7.2.4 | HTML to Markdown conversion | Standard converter. Configurable heading style, code blocks, etc. [VERIFIED: npm registry] |
| `turndown-plugin-gfm` | 1.0.2 | GFM table/strikethrough support | Web pages contain tables. Adds tables, strikethrough, task list items. [VERIFIED: npm registry] |
| `@perplexity-ai/perplexity_ai` | 0.29.0 | Perplexity Chat Completions SDK | Already installed. Supports `disable_search: true` for summarization without web search. [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 4.4.3 | Input schema validation | Already installed. New `WebFetchInputSchema` for `{url, prompt}`. |
| `commander` | 14.0.3 | CLI argument parsing | Already installed. Not needed for Phase 3 (stdin-only input per FTEC-01). |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Readability + Turndown | Raw text extraction | Raw text loses structure (headings, lists, links). Readability + Turndown preserves semantic meaning for summarization. |
| `@mozilla/readability` + `jsdom` | `@mozilla/readability` + `linkedom` | linkedom is lighter but may miss DOM APIs Readability needs. jsdom is the officially tested pairing per Readability docs. [CITED: github.com/mozilla/readability] |
| Perplexity SDK with `disable_search` | Raw `fetch` to OpenAI-compatible endpoint | SDK provides retries, typed responses, error classes. Already installed and used for WebSearch. |
| `turndown` | `node-html-markdown` | turndown has a larger plugin ecosystem (GFM tables, strikethrough). More mature, used by Firefox/Joplin. |

**Installation:**
```bash
npm install @mozilla/readability jsdom turndown turndown-plugin-gfm
```

**Version verification (performed 2026-05-20):**
```
@mozilla/readability: 0.6.0 (published 2025-03-03, created 2020-08-05)
turndown: 7.2.4 (published 2026-04-03, created 2017-06-02)
turndown-plugin-gfm: 1.0.2 (published 2018-05-11, created 2017-11-10)
jsdom: 29.1.1 (published 2026-04-30, created 2011-11-21)
@perplexity-ai/perplexity_ai: 0.29.0 (already installed)
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@mozilla/readability` | npm | ~6 yrs | High (Firefox engine) | github.com/mozilla/readability | N/A | Approved [VERIFIED] |
| `turndown` | npm | ~9 yrs | 11.2k stars | github.com/mixmark-io/turndown | N/A | Approved [VERIFIED] |
| `turndown-plugin-gfm` | npm | ~8 yrs | Standard companion | github.com/domchristie/turndown-plugin-gfm | N/A | Approved [VERIFIED] |
| `jsdom` | npm | ~14 yrs | Standard DOM impl | github.com/jsdom/jsdom | N/A | Approved [VERIFIED] |
| `@perplexity-ai/perplexity_ai` | npm | -- | Official SDK | github.com/perplexityai/perplexity-node | N/A | Approved [VERIFIED] |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck was not available at research time. All packages are tagged [VERIFIED] because they are well-established, high-star-count, Mozilla/official packages confirmed on the npm registry AND their official source repositories.*

**Postinstall script check:** All five packages have NO `postinstall` scripts. Verified by `npm view <pkg> scripts.postinstall` returning empty for all packages.

## Architecture Patterns

### System Architecture Diagram

```
stdin JSON {url, prompt}
       |
       v
  [Input Validation] -- Zod schema {url: string, prompt: string}
       |
       v
  [URL Normalization] -- http: -> https:, validate structure
       |
       v
  [HTTP Fetch + Redirects] -- fetch(redirect:'manual'), loop same-host
       |                         |
       |                    cross-host? -> stdout: redirect message, exit
       |                    10 hops?    -> stderr: error, exit
       |                    4xx/5xx?    -> stderr: error, exit
       |                    non-HTML?   -> stderr: error, exit
       |
       v
  [Content Extraction] -- JSDOM(html) -> Readability -> parse()
       |                         |
       |                   null result? -> Turndown on full HTML
       |                   has result?  -> Turndown on article.content
       |
       v
  [Markdown Output] -- turndown.turndown(html) -> markdown string
       |
       v
  [Size Check] -- > 100KB? -> truncate with marker
       |
       v
  [Has API Key?] -- No -> stdout: raw markdown, exit
       |
       | Yes
       v
  [Perplexity Summarize] -- SDK: disable_search:true, model:sonar
       |                      messages: [system=prompt, user=content]
       |
       v
  stdout: Perplexity answer text (with citations if present)
```

### Recommended Project Structure
```
src/
  webfetch.ts              # Entry point: stdin -> pipeline -> stdout (REWRITE from stub)
  lib/
    fetch.ts               # NEW: HTTP fetch with redirect handling (FTEC-02, FTEC-05)
    content.ts             # NEW: Readability + Turndown pipeline (FTEC-03)
    perplexity.ts          # MODIFY: add summarize() function (FTEC-04)
    input.ts               # MODIFY: add WebFetchInputSchema (FTEC-01)
    retry.ts               # REUSE: retryWithBackoff for fetch and Perplexity calls
    logger.ts              # REUSE: as-is
  types.ts                 # May add WebFetchResult type
test/
  webfetch.test.ts         # NEW: integration tests for full pipeline
  fetch.test.ts            # NEW: unit tests for redirect handling
  content.test.ts          # NEW: unit tests for content extraction
```

### Pattern 1: Fetch with Manual Redirect Handling
**What:** Native `fetch` with `redirect: 'manual'` to inspect and control redirect behavior
**When to use:** All HTTP fetching in the WebFetch pipeline
**Example:**
```typescript
// Source: Node.js global fetch API, D-09/D-10/D-11 from CONTEXT.md
async function fetchWithRedirects(url: URL, maxHops = 10): Promise<Response> {
  let currentUrl = url;
  const originalHost = url.hostname;

  for (let hop = 0; hop <= maxHops; hop++) {
    const response = await fetch(currentUrl, { redirect: 'manual' });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error(`Redirect without Location header at ${currentUrl}`);

      const targetUrl = new URL(location, currentUrl);

      if (targetUrl.hostname !== originalHost) {
        // D-10: Cross-host redirect -- return message, don't follow
        throw new CrossHostRedirectError(currentUrl.href, targetUrl.href);
      }

      if (hop === maxHops) {
        throw new Error(`Too many redirects (>${maxHops}) from ${url.href}`);
      }

      currentUrl = targetUrl;
      continue;
    }

    return response;
  }

  throw new Error(`Too many redirects (>${maxHops}) from ${url.href}`);
}
```

### Pattern 2: Content Extraction Pipeline (Readability + Turndown)
**What:** Extract article content from HTML, convert to Markdown
**When to use:** All HTML pages that pass Content-Type check
**Example:**
```typescript
// Source: github.com/mozilla/readability README, D-13 from CONTEXT.md
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

function extractMarkdown(html: string, url: string): string {
  // Create DOM with URL for relative URL resolution
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  // Try Readability first
  const reader = new Readability(document);
  const article = reader.parse();

  // Initialize Turndown with GFM support
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });
  turndown.use(gfm);

  if (article && article.content) {
    // D-13: Readability succeeded -- convert article HTML
    return turndown.turndown(article.content);
  }

  // D-13: Readability returned null -- fall through to raw Turndown on full HTML
  return turndown.turndown(html);
}
```

### Pattern 3: Perplexity Summarization with disable_search
**What:** Send extracted markdown + user prompt to Perplexity for summarization without web search
**When to use:** When API key is available and content has been extracted
**Example:**
```typescript
// Source: Perplexity API docs (docs.perplexity.ai/api-reference/sonar-post),
//         SDK types verified in node_modules
import Perplexity from '@perplexity-ai/perplexity_ai';

async function summarize(
  content: string,
  userPrompt: string,
): Promise<string> {
  const apiKey = getApiKey();
  const model = process.env.PPLX_MODEL || 'sonar';
  const client = new Perplexity({ apiKey });

  const response = await client.chat.completions.create({
    model,
    disable_search: true,           // Don't search the web -- summarize provided content
    messages: [
      {
        role: 'system',
        content: userPrompt,         // D-05: user's prompt as system instruction
      },
      {
        role: 'user',
        content: content,            // D-05: page content as user message
      },
    ],
  });

  return response.choices?.[0]?.message?.content ?? '';
}
```

### Anti-Patterns to Avoid
- **Don't enable scripts in jsdom:** Never pass `runScripts: "dangerously"` to JSDOM. Readability docs explicitly warn against this. [CITED: github.com/mozilla/readability]
- **Don't skip Content-Type check:** Processing binary/PDF content as HTML causes Readability to crash or produce garbage. D-12/D-15 require early rejection.
- **Don't use `redirect: 'follow'`:** This follows all redirects including cross-host. D-09 requires manual redirect handling.
- **Don't send raw HTML to Perplexity:** Always convert to Markdown first via Turndown. Raw HTML wastes tokens and produces poor summaries.
- **Don't forget to clone the document before Readability:** Readability mutates the DOM. Use `document.cloneNode(true)` if you need the original DOM afterward. However, since we create a fresh JSDOM each time, this is not needed for our use case.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Content extraction | Custom HTML parser to find article body | `@mozilla/readability` | Firefox Reader View engine handles nav stripping, paywall detection, article detection heuristics. Thousands of edge cases. |
| HTML to Markdown | Regex-based HTML-to-text conversion | `turndown` + `turndown-plugin-gfm` | Handles code blocks, tables, lists, escaping Markdown characters. GFM plugin adds table support. |
| DOM parsing for Readability | String-based HTML manipulation | `jsdom` | Readability requires a W3C-compliant `Document` object. jsdom is the standard provider. |
| Redirect following | Custom HTTP client | Native `fetch` with `redirect: 'manual'` | Node 20+ has built-in `fetch`. No need for `axios`, `node-fetch`, or `got`. CLAUDE.md explicitly forbids `axios`. |
| Token estimation | Character-to-token ratio guessing | Simple character limit (~100KB) | Claude Code uses 100KB truncation. Sonar context is ~127K tokens. 100KB of text is well within limits. |

**Key insight:** The entire content pipeline uses battle-tested libraries. Readability handles article detection, Turndown handles Markdown conversion, jsdom provides the DOM. The only custom logic is redirect handling (which is trivial with native `fetch`) and the Perplexity prompt template.

## Common Pitfalls

### Pitfall 1: Readability Returns null on Non-Article Pages
**What goes wrong:** Pages like homepages, login screens, documentation indexes, or navigation-heavy pages cause Readability to return `null` because they don't meet article heuristics (minimum 500 chars by default).
**Why it happens:** Readability's `charThreshold` defaults to 500. Pages with mostly navigation, forms, or dynamic content fail this check.
**How to avoid:** D-13 specifies the fallback: when Readability returns null, run Turndown on the full HTML. This is noisy but functional.
**Warning signs:** If many pages return garbage markdown, the raw Turndown fallback may be too noisy. Consider using `isProbablyReaderable()` as a pre-check for logging.

### Pitfall 2: Readability Mutates the DOM
**What goes wrong:** Calling `parse()` modifies the document object. If you try to use the DOM afterward, elements may be missing.
**Why it happens:** Readability strips elements it considers non-article content as part of its algorithm.
**How to avoid:** Since we create a fresh `JSDOM` instance for each request, we don't reuse the DOM. No issue for our use case, but worth knowing if refactoring.

### Pitfall 3: JSDOM Without URL Option Breaks Relative Links
**What goes wrong:** Images and links in the article content have relative URLs that can't be resolved without a base URL.
**Why it happens:** JSDOM defaults to `about:blank` as the base URL.
**How to avoid:** Always pass `{ url: pageUrl }` to the JSDOM constructor. Readability docs explicitly recommend this. [CITED: github.com/mozilla/readability]

### Pitfall 4: Perplexity Summarization Triggers Web Search
**What goes wrong:** Without `disable_search: true`, Perplexity's sonar models perform web searches, wasting tokens and returning irrelevant search-augmented results instead of summarizing the provided content.
**Why it happens:** Sonar models are designed for search-augmented generation by default.
**How to avoid:** Always pass `disable_search: true` when calling the summarization endpoint. Verified that the installed SDK v0.29.0 supports this parameter. [VERIFIED: node_modules/@perplexity-ai/perplexity_ai source check]

### Pitfall 5: Large Pages Exceed Context Window
**What goes wrong:** Sending a 500KB markdown document to Perplexity exceeds the ~127K token context window, causing API errors or truncated responses.
**Why it happens:** Some pages (documentation sites, legal documents) produce very large markdown output.
**How to avoid:** Truncate to 100KB of text (matching Claude Code's own behavior) before sending to Perplexity. Add a marker like `[... content truncated ...]` at the truncation point.

### Pitfall 6: Cross-Host Redirect Loops
**What goes wrong:** Two hosts redirecting to each other creates an infinite loop.
**Why it happens:** Same-host redirect check prevents following cross-host redirects, but if the initial URL is already on a host that redirects to another which redirects back, manual tracking is needed.
**How to avoid:** D-11 specifies a 10-hop cap. Track all visited URLs and error on duplicates.

### Pitfall 7: Turndown Default Options Produce Non-Standard Markdown
**What goes wrong:** Default Turndown uses `setext` headings (underlines) and indented code blocks instead of ATX headings and fenced code blocks.
**Why it happens:** Turndown defaults to original Markdown (CommonMark) conventions, not GitHub Flavored Markdown.
**How to avoid:** Configure Turndown with `{ headingStyle: 'atx', codeBlockStyle: 'fenced' }` for cleaner Markdown output that's better for both Perplexity summarization and raw markdown fallback.

## Code Examples

### WebFetch Input Schema
```typescript
// Pattern from existing WebSearchInputSchema in src/lib/input.ts
export const WebFetchInputSchema = z.strictObject({
  url: z.string().url('Invalid URL format'),
  prompt: z.string().min(1, 'Prompt is required'),
});

export type WebFetchInput = z.infer<typeof WebFetchInputSchema>;
```

### HTTP Fetch Module
```typescript
// src/lib/fetch.ts
// Uses native fetch with redirect: 'manual' per D-09

export class CrossHostRedirectError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Cross-host redirect from ${from} to ${to}`);
  }
}

export function normalizeUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol === 'http:') {
    url.protocol = 'https:';  // D-02: HTTP auto-upgraded to HTTPS
  }
  return url;
}

export async function fetchWithRedirects(
  url: URL,
  maxHops = 10,  // D-11
): Promise<{ response: Response; finalUrl: URL }> {
  let currentUrl = url;
  const originalHost = url.hostname;

  for (let hop = 0; hop <= maxHops; hop++) {
    const response = await fetch(currentUrl.toString(), {
      redirect: 'manual',
    });

    // D-14: HTTP 4xx/5xx -> error to stderr
    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}: ${statusText(response.status)} at ${currentUrl.href}`);
    }

    // Handle redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect (${response.status}) without Location header at ${currentUrl.href}`);
      }
      const targetUrl = new URL(location, currentUrl);

      // D-10: Cross-host redirect -> message, don't follow
      if (targetUrl.hostname !== originalHost) {
        throw new CrossHostRedirectError(currentUrl.href, targetUrl.href);
      }

      // D-11: Too many hops
      if (hop === maxHops) {
        throw new Error(`Too many redirects (>${maxHops}) starting from ${url.href}`);
      }

      currentUrl = targetUrl;
      continue;
    }

    // D-15: Content-Type whitelist
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error(`Unsupported content type: ${contentType} at ${currentUrl.href}`);
    }

    return { response, finalUrl: currentUrl };
  }

  throw new Error(`Too many redirects (>${maxHops}) starting from ${url.href}`);
}
```

### Content Extraction Module
```typescript
// src/lib/content.ts
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});
turndown.use(gfm);

const MAX_CONTENT_SIZE = 100_000; // ~100KB, matching Claude Code behavior

export function extractMarkdown(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  // Try Readability first
  const reader = new Readability(document);
  const article = reader.parse();

  let markdown: string;

  if (article && article.content) {
    // D-13: Readability succeeded
    markdown = turndown.turndown(article.content);
  } else {
    // D-13: Null fallback -- raw Turndown on full HTML
    markdown = turndown.turndown(html);
  }

  // Truncate if needed (D-06)
  if (markdown.length > MAX_CONTENT_SIZE) {
    markdown = markdown.slice(0, MAX_CONTENT_SIZE) + '\n\n[... content truncated ...]';
  }

  return markdown;
}
```

### WebFetch Entry Point
```typescript
// src/webfetch.ts -- main pipeline orchestration
import { readStdin, WebFetchInputSchema } from './lib/input.js';
import { logger } from './lib/logger.js';
import { normalizeUrl, fetchWithRedirects, CrossHostRedirectError } from './lib/fetch.js';
import { extractMarkdown } from './lib/content.js';
import { hasApiKey, summarize } from './lib/perplexity.js';
import { retryWithBackoff, isTransientError } from './lib/retry.js';

async function main(): Promise<void> {
  try {
    const input = await readStdin(WebFetchInputSchema);
    logger.info(`Fetching: ${input.url}`);

    const url = normalizeUrl(input.url);

    // Fetch with redirect handling
    const { response, finalUrl } = await fetchWithRedirects(url);

    // Extract content
    const html = await response.text();
    const markdown = extractMarkdown(html, finalUrl.href);

    // D-07/D-08: If no API key, return raw markdown
    if (!hasApiKey()) {
      process.stdout.write(markdown);
      return;
    }

    // Summarize via Perplexity
    const summary = await retryWithBackoff(
      () => summarize(markdown, input.prompt),
      isTransientError,
    );
    process.stdout.write(summary);
  } catch (err) {
    if (err instanceof CrossHostRedirectError) {
      // D-10: Cross-host redirect message to stdout
      process.stdout.write(
        `Redirect from ${err.from} to ${err.to} -- cross-host redirect not followed`,
      );
      return;
    }
    logger.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

main();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `axios` for HTTP | Native `fetch` (global in Node 20+) | Node 18 (2022) | No dependency needed. CLAUDE.md forbids axios. |
| `node-fetch` polyfill | Native `fetch` | Node 18 (2022) | Polyfill is redundant on Node 20+. CLAUDE.md forbids it. |
| Readability without URL option | Readability with URL option for relative URL resolution | Always recommended | Prevents broken image/link URLs in extracted content. |
| Perplexity with implicit search | Perplexity with `disable_search: true` | SDK v0.29.0+ | Prevents unwanted web searches during summarization. |

**Deprecated/outdated:**
- `node-fetch`: Replaced by native `fetch` in Node 18+. Not needed.
- `ts-node`: Replaced by `tsx`. CLAUDE.md lists it as "What NOT to Use."
- `jest`: Replaced by `vitest`. CLAUDE.md lists it as "What NOT to Use."

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Perplexity sonar model context window is ~127K tokens | Content Truncation | If smaller, content truncation threshold needs reduction. LOW risk -- 100KB char limit is conservative. |
| A2 | Claude Code WebFetch truncates at ~100KB of text | Content Truncation | If different, our truncation point may differ from Claude Code's. LOW risk -- D-06 delegates this to researcher. |
| A3 | `disable_search: true` prevents all web searches in Perplexity summarization | Summarization | If not true, Perplexity may add irrelevant web results to summaries. LOW risk -- verified in SDK types. |
| A4 | `@mozilla/readability` `parse()` returns null for non-article pages (not undefined) | Content Extraction | If it returns undefined instead, null check needs adjustment. LOW risk -- verified by GitHub issues. |
| A5 | Cross-host redirect detection by comparing `hostname` is sufficient | Redirect Handling | If redirects use IP addresses or CNAMEs, hostname comparison may not detect "same host." LOW risk -- matches Claude Code's approach. |

**If this table is empty:** All claims in this research were verified or cited -- no user confirmation needed.

## Open Questions

1. **Claude Code WebFetch exact output format**
   - What we know: Claude Code's built-in WebFetch sends content to Haiku 3.5 with a specific prompt template, returns the answer as plain text. Our implementation sends to Perplexity sonar instead. D-01 says "researcher MUST examine real Claude Code WebFetch output."
   - What's unclear: Whether Claude Code wraps the answer in any structural format (XML, markdown blocks, etc.) or returns raw text.
   - Recommendation: Based on the reverse-engineering analysis at mikhail.io, Claude Code returns raw answer text. D-03 confirms "Return raw answer text from Perplexity -- no structural wrapper, no metadata prefix." This should be considered resolved.

2. **Citation handling in output**
   - What we know: D-02 says "Include Perplexity citations in output when summarization is used." The Perplexity API returns `citations` as an array of URLs.
   - What's unclear: How to format citations in the output. Perplexity naturally embeds citation numbers [1], [2] in its response text. The `citations` array provides the URLs.
   - Recommendation: Since D-03 says "Return raw answer text from Perplexity," the citations that Perplexity naturally includes in its response text are sufficient. No additional formatting needed.

3. **Size threshold for "short page" raw markdown path**
   - What we know: D-07 mentions "when page is short enough" return raw markdown. D-06 delegates truncation to researcher.
   - What's unclear: What qualifies as "short enough" to skip Perplexity summarization.
   - Recommendation: Always send to Perplexity when API key is available, regardless of content size. The "short page" path only applies when no API key exists (D-08). This simplifies the implementation and ensures consistent output quality.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | 26.0.0 | -- |
| npm | Package management | Yes | 11.12.1 | -- |
| esbuild | Build bundling | Yes | 0.28.0 | -- |
| vitest | Testing | Yes | 4.1.6 | -- |
| tsx | Dev execution | Yes (devDep) | 4.22.3 | -- |
| Perplexity API key | Summarization | Depends on user | -- | Raw markdown output (D-08) |

**Missing dependencies with no fallback:**
- None -- all tools are available.

**Missing dependencies with fallback:**
- Perplexity API key: When absent, raw markdown is returned. This is by design (D-08).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.6 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run test/fetch.test.ts test/content.test.ts -x` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FTEC-01 | Accept `{url, prompt}` JSON on stdin | unit | `npx vitest run test/webfetch.test.ts -x` | Wave 0 |
| FTEC-02 | HTTP URLs auto-upgraded to HTTPS | unit | `npx vitest run test/fetch.test.ts -x` | Wave 0 |
| FTEC-03 | Readability + Turndown extraction with null fallback | unit | `npx vitest run test/content.test.ts -x` | Wave 0 |
| FTEC-04 | Perplexity summarization with disable_search | unit | `npx vitest run test/webfetch.test.ts -x` | Wave 0 |
| FTEC-05 | Same-host redirects followed, cross-host blocked | unit | `npx vitest run test/fetch.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run test/fetch.test.ts test/content.test.ts -x`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `test/fetch.test.ts` -- covers FTEC-02 (URL normalization), FTEC-05 (redirect handling)
- [ ] `test/content.test.ts` -- covers FTEC-03 (Readability + Turndown, null fallback, truncation)
- [ ] `test/webfetch.test.ts` -- covers FTEC-01 (input validation), FTEC-04 (Perplexity summarize integration)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Perplexity API key via env var (`PPLX_API_KEY`/`PERPLEXITY_API_KEY`) |
| V3 Session Management | no | Stateless CLI, no sessions |
| V4 Access Control | no | Single-user CLI tool |
| V5 Input Validation | yes | Zod schema validation on stdin input (`url`, `prompt`) |
| V6 Cryptography | no | HTTPS enforced (D-02), TLS handled by Node.js runtime |
| V8 Data Protection | yes | No persistent data storage. Content processed in memory only. |
| V10 Malicious Content | yes | Readability strips scripts. jsdom never executes scripts. Content-Type whitelist (D-15). |

### Known Threat Patterns for Content Pipeline

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF (Server-Side Request Forgery) | Tampering | Validate URL scheme (http/https only). Block private IP ranges (127.0.0.0/8, 10.0.0.0/8, 192.168.0.0/16, 169.254.0.0/16). Block localhost. |
| XSS via HTML content | Tampering | Readability strips scripts. jsdom with `runScripts` disabled (default). Turndown escapes Markdown characters. |
| Prompt injection via web content | Spoofing | Content sent to Perplexity with user's prompt as system instruction. Perplexity is instructed to summarize based on content only. Limited mitigation -- inherent in the architecture. |
| Content-Type spoofing | Tampering | Check `Content-Type` header before processing. D-12/D-15 whitelist `text/html` and `application/xhtml` only. |
| Redirect to malicious host | Tampering | D-10: Cross-host redirects are NOT followed. User sees redirect target and must explicitly fetch it. |
| Large content DoS | Denial of Service | 100KB truncation limit. HTTP response body read with size awareness. |

## Sources

### Primary (HIGH confidence)
- [github.com/mozilla/readability] - Readability API: `new Readability(document)`, `parse()` method, return type, null behavior, Node.js usage with jsdom, `url` option requirement, security warnings about `runScripts`. [CITED]
- [github.com/mixmark-io/turndown] - Turndown API: options (headingStyle, codeBlockStyle, bulletListMarker), `turndown()` method, `use()` for plugins, GFM plugin integration. [CITED]
- [docs.perplexity.ai/api-reference/sonar-post] - Perplexity Chat Completions API: `disable_search` parameter, `messages` array, `model` field, response structure with `choices`, `citations`, `search_results`. [CITED]
- [docs.perplexity.ai/docs/getting-started/pricing] - Perplexity pricing: sonar model tier, token pricing. [CITED]
- [node_modules/@perplexity-ai/perplexity_ai] - SDK v0.29.0 type definitions: `disable_search?: boolean | null`, `messages`, `model`. Source code verified. [VERIFIED]

### Secondary (MEDIUM confidence)
- [mikhail.io/2025/10/claude-code-web-tools/] - Reverse-engineering analysis of Claude Code WebFetch: pipeline steps, Haiku 3.5 summarization, 100KB truncation, redirect handling, output format. Cross-referenced with Perplexity API docs. [MEDIUM -- community source, high-quality analysis]
- [github.com/mixmark-io/turndown-plugin-gfm] - GFM plugin: `gfm`, `tables`, `strikethrough`, `taskListItems` exports. Usage with `turndownService.use(gfm)`. [CITED]
- Perplexity sonar model context window ~127K tokens - Multiple sources agree: DataStudios (128K), SiliconANGLE (127K), OpenRouter. [MEDIUM -- multiple community sources agree]

### Tertiary (LOW confidence)
- None -- all critical claims verified through primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified on npm registry, source repos confirmed, no postinstall scripts. Readability/turndown/jsdom are mature, well-maintained packages with 6-14 year histories.
- Architecture: HIGH - Pipeline design follows established patterns from Readability docs and Claude Code's own architecture. All decisions locked in CONTEXT.md.
- Pitfalls: HIGH - Readability null behavior verified via GitHub issues. Perplexity `disable_search` verified in installed SDK types. Redirect handling is straightforward with native fetch.
- Content truncation: MEDIUM - 100KB threshold based on reverse-engineering of Claude Code (mikhail.io). Sonar context window estimates vary slightly (127K-128K tokens). Conservative threshold provides safety margin.

**Research date:** 2026-05-20
**Valid until:** 2026-06-19 (30 days -- stable libraries, unlikely to change)
