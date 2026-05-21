# Phase 5: DDG-Only with Citations - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove all Perplexity code, dependencies, and configuration. DuckDuckGo becomes sole search provider with citation snippets (DDG description text) added to results. WebFetch becomes pure content extraction (no LLM summarization). Config simplifies to {retry, logging} only. No API key required for any functionality.

</domain>

<decisions>
## Implementation Decisions

### Citation Format
- **D-01:** Include DDG snippet/description text in search results. Supersedes Phase 2 D-01 ("title+URL only").
- **D-02:** Use `<snippet>` XML tag for DDG description in output. Format: `<result><title>...</title><url>...</url><snippet>...</snippet></result>`.
- **D-03:** Always emit `<snippet>` tag, even when empty (no description from DDG). Consistent XML structure.
- **D-04:** `SearchResult` type gains optional `snippet?: string` field. `searchDDG()` extracts `r.description` from duck-duck-scrape results.
- **D-05:** `formatSearchResults()` always includes `<snippet>` element, empty string if no description.

### WebFetch Simplification
- **D-06:** Remove `summarize()` and `hasApiKey()` from perplexity.ts usage. WebFetch always: fetch → extractMarkdown → stdout.
- **D-07:** Keep `retryWithBackoff` for HTTP fetch failures in WebFetch. Transient error retry stays.
- **D-08:** No changes to content extraction pipeline (Readability + Turndown, 100KB truncation). Just removes Perplexity summarization layer.

### WebSearch Simplification
- **D-09:** Fully simplify websearch.ts. Remove `dedupeAndMerge`, `hasApiKey` import, Perplexity `search` import, fallback/merge/retry branching. Main function becomes: loadConfig → readStdin → validateDomains → searchDDG → filterByDomains → formatResults → stdout.
- **D-10:** Single retry path: `retryWithBackoff(() => searchDDG(query), isDDGTransientError, retryConfig)`. No fallback chain.

### Config & Provider Cleanup
- **D-11:** Remove `perplexity` section from `ConfigSchema`, `ResolvedConfig`, `DEFAULTS`, `ENV_MAP`. Config becomes `{retry, logging}` only.
- **D-12:** Remove `WEBSEARCH_PERPLEXITY_API_KEY` and `WEBSEARCH_PERPLEXITY_MODEL` env var mappings.
- **D-13:** Remove `<!-- provider: X -->` XML comment from search output. Only one provider — comment is noise.

### Dependency Removal
- **D-14:** Delete `src/lib/perplexity.ts` entirely.
- **D-15:** Remove `@perplexity-ai/perplexity_ai` from package.json dependencies.
- **D-16:** Remove all perplexity imports from `websearch.ts` and `webfetch.ts`.

### Test Cleanup
- **D-17:** Delete `test/perplexity.test.ts` entirely.
- **D-18:** Update DDG tests: verify snippet extraction from duck-duck-scrape results.
- **D-19:** Update websearch tests: remove fallback/merge/dedupe tests, test simplified single-provider flow.
- **D-20:** Update config tests: remove perplexity section tests.
- **D-21:** Update output tests: add `<snippet>` tag assertions, remove provider comment assertions.

### Claude's Discretion
- Exact wording of simplified websearch.ts main function
- Specific test case structure for updated tests
- Order of removal operations (source vs tests vs config vs dependencies)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-Level
- `CLAUDE.md` — Locked technology stack: `duck-duck-scrape` for DDG, Zod validation, esbuild bundling. `@perplexity-ai/perplexity_ai` to be removed.
- `.planning/PROJECT.md` — Core value (drop-in replacement), constraints, key decisions
- `.planning/REQUIREMENTS.md` — Phase 5 requirements: SRCH-01 (input schema), SRCH-04 (reinterpreted: search with citations from DDG)
- `.planning/ROADMAP.md` — Phase 5 goal, 4 success criteria

### Prior Phase Context
- `.planning/phases/02-search-resilience/02-CONTEXT.md` — DDG integration (D-01 through D-05), domain filtering (D-10 through D-14), retry logic (D-06 through D-09). D-01 superseded by this context's D-01.
- `.planning/phases/03-webfetch-content-pipeline/03-CONTEXT.md` — Content extraction pipeline, Perplexity summarization (to be removed), redirect handling
- `.planning/phases/04-config-file-and-logging/04-CONTEXT.md` — Config schema structure (perplexity section to be removed), env var mapping

### Source Files to Modify
- `src/lib/perplexity.ts` — DELETE entirely
- `src/lib/duckduckgo.ts` — Add snippet extraction from duck-duck-scrape results
- `src/lib/output.ts` — Add `<snippet>` tag, remove provider comment
- `src/lib/config.ts` — Remove perplexity section from schema, defaults, env map
- `src/websearch.ts` — Full simplify: remove fallback/merge/dedupe, single DDG path
- `src/webfetch.ts` — Remove Perplexity summarization, keep retry for fetch
- `src/types.ts` — Add `snippet?: string` to SearchResult
- `package.json` — Remove `@perplexity-ai/perplexity_ai` dependency

### Test Files to Modify
- `test/perplexity.test.ts` — DELETE entirely
- `test/duckduckgo.test.ts` — Update for snippet extraction
- `test/websearch.test.ts` — Update for simplified single-provider flow
- `test/config.test.ts` — Remove perplexity section tests
- `test/output.test.ts` — Add snippet assertions, remove provider comment assertions
- `test/webfetch.test.ts` — Remove Perplexity summarization tests

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/duckduckgo.ts` — DDG search via `duck-duck-scrape`. Currently maps `r.title, r.url`. Add `r.description` for snippets.
- `src/lib/output.ts` — `formatSearchResults(results, provider)`. Add snippet support, remove provider param.
- `src/lib/filter.ts` — Domain filtering. No changes needed.
- `src/lib/content.ts` — Readability + Turndown pipeline. No changes needed.
- `src/lib/retry.ts` — Exponential backoff. No changes needed.
- `src/lib/fetch.ts` — HTTP fetch with redirect handling. No changes needed.
- `src/lib/input.ts` — Input parsing, domain validation. No changes needed.
- `src/lib/logger.ts` — Module-scoped logging. No changes needed.

### Established Patterns
- Pre-compiled esbuild bundles in `scripts/` directory
- Zod schema validation on stdin input
- All output to stdout, all errors/logging to stderr
- `retryWithBackoff` wraps async operations with configurable retry
- Config reads from `~/.config/websearch/config.json` with env > file > defaults

### Integration Points
- `src/websearch.ts` — Complete rewrite to simplified single-provider flow
- `src/webfetch.ts` — Remove Perplexity imports, simplify main function
- `src/lib/config.ts` — Remove perplexity section from schema and resolution
- Build system: `build.ts` bundles both entry points — no changes needed
- Rebuild bundles after changes: `npm run build`

</code_context>

<specifics>
## Specific Ideas

No specific references or examples — implementation follows captured decisions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-DDG-Only with Citations*
*Context gathered: 2026-05-21*
