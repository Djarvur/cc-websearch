# Phase 2: Search Resilience - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

WebSearch gracefully degrades when Perplexity is unavailable via DuckDuckGo fallback, supports domain filtering matching Claude Code's interface, and implements retry logic for rate limits. Three-tier behavior: Perplexity primary → DDG fallback → clean failure. Domain filtering via Perplexity API param (allowed) and post-result filtering (blocked, and all DDG filtering). Exponential backoff with jitter on transient errors.

</domain>

<decisions>
## Implementation Decisions

### DDG Result Fidelity

- **D-01:** DDG results return title+URL only — no snippets. Output format identical to Perplexity results regardless of provider.
- **D-02:** Use `duck-duck-scrape` library as sole DDG scraping provider. No raw cheerio backup.
- **D-03:** Return all DDG results (no cap). Perplexity returns 5-10, DDG may return 20-30.
- **D-04:** No API key = first-class DDG experience. No warning, no degraded mode indication. DDG is primary when no key present.
- **D-05:** DDG errors follow same clean error path as Perplexity errors. Provider-agnostic error handling.

### Retry Latency Budget

- **D-06:** Conservative retry defaults: base delay 1s, max delay 16s, 4 retries (~30s total before DDG fallback).
- **D-07:** Retry on all transient errors: 429 (rate limit), 5xx (server errors), network timeouts.
- **D-08:** All retry parameters configurable via env vars: `RETRY_BASE_DELAY`, `RETRY_MAX_DELAY`, `RETRY_MAX_RETRIES`, `RETRY_TIMEOUT`. Config file support in Phase 4.
- **D-09:** Per-request timeout configurable via env var, default 30s.

### Domain Filtering

- **D-10:** Perplexity: pass `allowed_domains` via `search_domain_filter` API param. Blocked domains post-filtered if API doesn't support exclusion (researcher must verify).
- **D-11:** DDG: subdomain-inclusive post-result filtering. `github.com` matches `docs.github.com`, `api.github.com`, etc.
- **D-12:** Strict filtering — return empty results if filter removes everything. No soft fallback to unfiltered.
- **D-13:** Aggressive domain normalization — strip protocol, path, trailing slash before filtering. `http://github.com/path` → `github.com`.
- **D-14:** Perplexity `search_domain_filter` capabilities must be researched before planning. Verify if API supports both allowed and blocked domains, or only allowed.

### Fallback Visibility

- **D-15:** Stdout output includes provider name as XML comment: `<!-- provider: perplexity -->` before `<search_results>`. Machine-invisible, human-visible.
- **D-16:** Fallback event logged at debug level to stderr. Not visible at default info level.

### Partial Result Handling

- **D-17:** If Perplexity returns partial results then fails, merge with DDG results (don't discard).
- **D-18:** Merged ordering: Perplexity results first, DDG results appended after. Deduplicate by URL.

### Error Messages

- **D-19:** Detailed error messages on total failure: include provider name, error type, what was tried. E.g., "Perplexity returned 429 after 4 retries, DDG network error: connection refused".

### Claude's Discretion

- Exact jitter implementation algorithm (full jitter, decorrelated, etc.)
- DDG scraping error recovery (retry DDG or fail immediately)
- Env var naming conventions beyond specified retry params
- Internal code architecture (module split, function signatures)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-Level

- `CLAUDE.md` — Locked technology stack: `duck-duck-scrape` for DDG, `cheerio` for HTML parsing, `@perplexity-ai/perplexity_ai` SDK, Zod validation, esbuild bundling. Contains version constraints and "What NOT to Use" list.
- `.planning/PROJECT.md` — Core value, requirements, key decisions, constraints
- `.planning/REQUIREMENTS.md` — Phase 2 requirements: SRCH-03 (mutual exclusivity), SRCH-05 (DDG fallback), SRCH-06 (domain filtering), SRCH-07 (exponential backoff), SRCH-08 (two-tier fallback)
- `.planning/ROADMAP.md` — Phase 2 goal, 5 success criteria, 3 plan breakdown (02-01 DDG Lite, 02-02 Domain filtering, 02-03 Retry orchestration)

### Phase 1 Context

- `.planning/phases/01-plugin-foundation-and-primary-search/01-CONTEXT.md` — Distribution strategy (D-01/02/03), Perplexity integration (D-04/05), output format (D-06), WebFetch stub (D-07)

### API Reference

- Perplexity Chat Completions API — `search_domain_filter` parameter capabilities MUST be researched (D-14). Verify allowed vs blocked support.
- `duck-duck-scrape` npm package — text search API, result structure, error handling

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `src/lib/perplexity.ts` — Perplexity client with `search(query)` function. Returns `{results, content}`. API key detection from `PPLX_API_KEY`/`PERPLEXITY_API_KEY` env vars. Model configurable via `PPLX_MODEL`.
- `src/lib/input.ts` — `WebSearchInputSchema` with `query`, `allowed_domains` (optional), `blocked_domains` (optional). `readStdin()` for JSON stdin parsing. Already validates schema including allowed/blocked fields.
- `src/lib/output.ts` — `formatSearchResults(results)` outputs `<search_results>` XML. Needs modification for provider comment (D-15).
- `src/lib/logger.ts` — Level-based stderr logging (`debug`, `info`, `warn`, `error`). Controlled by `LOG_LEVEL` env var.
- `src/types.ts` — `SearchResult` interface: `{title: string, url: string}`. No snippet field needed (D-01).
- `src/websearch.ts` — Entry point: reads stdin → calls `search()` → formats output. Needs retry/fallback orchestration wrapper.

### Established Patterns

- Pre-compiled esbuild bundles in `scripts/` directory
- Skill definitions in `skills/*/SKILL.md` invoke `node "${CLAUDE_PLUGIN_ROOT}/scripts/*.js"`
- All output to stdout, all errors/logging to stderr
- Zod schema validation on stdin input

### Integration Points

- `src/websearch.ts` main function — needs rewrite to add retry loop + DDG fallback + domain filtering
- `src/lib/output.ts` `formatSearchResults()` — needs provider name parameter for XML comment
- `src/lib/input.ts` — `allowed_domains`/`blocked_domains` already parsed but unused; add mutual exclusivity check
- New module needed: `src/lib/duckduckgo.ts` — DDG search via `duck-duck-scrape`
- New module needed: `src/lib/retry.ts` — exponential backoff with jitter, configurable params
- New module needed: `src/lib/filter.ts` — domain filtering with normalization and subdomain matching

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

_Phase: 2-Search Resilience_
_Context gathered: 2026-05-20_
