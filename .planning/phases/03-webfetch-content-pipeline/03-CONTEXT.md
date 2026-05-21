# Phase 3: WebFetch Content Pipeline - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Page fetching with HTTP→HTTPS normalization, content extraction via Readability + Turndown (with null fallback), LLM summarization via Perplexity Chat Completions, and same-host/cross-host redirect handling. WebFetch accepts `{url, prompt}` JSON on stdin, returns summarized answer (or raw markdown when no API key). Replaces the existing stub in `src/webfetch.ts`.

</domain>

<decisions>
## Implementation Decisions

### Output Format

- **D-01:** Researcher MUST examine real Claude Code WebFetch output to determine exact format (markdown, XML, structure). Output must match byte-for-byte.
- **D-02:** Include Perplexity citations in output when summarization is used. Do not strip them.
- **D-03:** Return raw answer text from Perplexity — no structural wrapper, no metadata prefix. Simple stdout write.

### Summarization Approach

- **D-04:** Reuse same sonar model as WebSearch. Model from `PPLX_MODEL` env var, default `sonar`. No separate model config for WebFetch.
- **D-05:** Prompt structure: page content as user message, user's prompt as system instruction. Leverages Perplexity's citation system naturally.
- **D-06:** Content size / truncation strategy: researcher determines based on Perplexity context window limits. Must handle large pages gracefully.
- **D-07:** Conditional output path: when page is short enough or Perplexity unavailable/no key, return raw extracted markdown. When Perplexity available, send content + prompt for summarized answer.
- **D-08:** No API key = return raw markdown (not an error). Graceful degradation matching WebSearch's DDG fallback philosophy.

### Redirect Handling

- **D-09:** Use `fetch` with `redirect: 'manual'` to implement custom redirect logic. No external redirect library.
- **D-10:** Cross-host redirect: return short human-readable message to stdout (e.g., "Redirect from [original] to [target] — cross-host redirect not followed"). Not structured metadata.
- **D-11:** Same-host redirects: follow to completion, cap at 10 hops to prevent infinite loops. After 10 hops, return error.

### Non-HTML Content

- **D-12:** Non-HTML content types (PDF, binary, JSON, etc.): return error to stderr with descriptive message including Content-Type. Clean exit, no crash. Only `text/html` and `application/xhtml` proceed.
- **D-13:** Readability null fallback: when Readability can't extract article content (nav-heavy pages, paywalls, non-articles), fall through to raw Turndown on full HTML → send to Perplexity. Noisy but functional.
- **D-14:** HTTP 4xx/5xx responses: return error to stderr immediately (e.g., "HTTP 404: Page not found at [URL]"). No body extraction or Perplexity call for error pages.
- **D-15:** Content-Type whitelist check before processing. Only `text/html` and `application/xhtml` proceed. Everything else errors early.

### Claude's Discretion

- Exact Perplexity prompt wording (system message template)
- Content truncation implementation details (deferred to researcher for context window sizing)
- Size threshold for "short page" raw markdown path
- Turndown configuration (heading style, code blocks, etc.)
- Error message wording and formatting

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-Level

- `CLAUDE.md` — Locked technology stack: `@mozilla/readability` for content extraction, `jsdom` for DOM, `turndown` + `turndown-plugin-gfm` for HTML→MD, `@perplexity-ai/perplexity_ai` SDK, esbuild bundling. Contains version constraints and "What NOT to Use" list.
- `.planning/PROJECT.md` — Core value, requirements, key decisions
- `.planning/REQUIREMENTS.md` — Phase 3 requirements: FTEC-01 (input schema), FTEC-02 (URL normalization), FTEC-03 (Readability + Turndown), FTEC-04 (Perplexity summarization), FTEC-05 (redirect handling)
- `.planning/ROADMAP.md` — Phase 3 goal, 5 success criteria, 2-plan breakdown

### Prior Phase Context

- `.planning/phases/01-plugin-foundation-and-primary-search/01-CONTEXT.md` — Distribution strategy (D-01/02/03), Perplexity integration (D-04/05), output format (D-06), WebFetch stub (D-07)
- `.planning/phases/02-search-resilience/02-CONTEXT.md` — Retry logic (D-06/07/08/09), provider comment output (D-15), error messages (D-19)

### API Reference

- Perplexity Chat Completions API — for summarization call structure, context window limits, citation handling
- `@mozilla/readability` — `Readability` constructor, `parse()` method, null return behavior
- `turndown` — `TurndownService` API, GFM plugin integration
- `jsdom` — `JSDOM` constructor for creating DOM from HTML string

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `src/lib/perplexity.ts` — Perplexity client with `search()` function. Reuse `getApiKey()`, `hasApiKey()`, and client instantiation for WebFetch summarization. May need a new `summarize()` function.
- `src/lib/input.ts` — `readStdin()` for JSON stdin parsing. Need new `WebFetchInputSchema` for `{url, prompt}`.
- `src/lib/retry.ts` — `retryWithBackoff()` and `isTransientError()` for HTTP fetch retries.
- `src/lib/logger.ts` — Level-based stderr logging. Reuse directly.
- `src/types.ts` — `SearchResult` interface. WebFetch may need its own types.
- `src/webfetch.ts` — Current stub to replace entirely.

### Established Patterns

- Pre-compiled esbuild bundles in `scripts/` directory (Phase 1 D-01/02/03)
- Skill definitions in `skills/*/SKILL.md` invoke `node "${CLAUDE_PLUGIN_ROOT}/scripts/*.js"`
- All output to stdout, all errors/logging to stderr
- Zod schema validation on stdin input
- Retry with exponential backoff + jitter on transient errors

### Integration Points

- `src/webfetch.ts` — Complete rewrite from stub to full pipeline
- `skills/webfetch/SKILL.md` — Update description from "not yet implemented" to actual usage
- New modules needed: `src/lib/fetch.ts` (HTTP fetch with redirect handling), `src/lib/content.ts` (Readability + Turndown pipeline)
- Build system: `build.ts` already bundles webfetch.ts → scripts/webfetch.js

</code_context>

<specifics>
## Specific Ideas

No specific references or examples — implementation follows requirements and captured decisions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 3-WebFetch Content Pipeline_
_Context gathered: 2026-05-20_
