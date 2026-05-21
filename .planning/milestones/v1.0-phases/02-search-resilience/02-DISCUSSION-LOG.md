# Phase 2: Search Resilience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 2-Search Resilience
**Areas discussed:** DDG Result Fidelity, Retry Latency Budget, Domain Matching Semantics, Fallback Visibility, Per-Request Timeout, Perplexity Domain Filter Capabilities, Partial Result Handling, Merged Result Ordering, Domain Format Validation, Error Message Detail Level

---

## DDG Result Fidelity

### Snippet inclusion

| Option           | Description                                                                                    | Selected |
| ---------------- | ---------------------------------------------------------------------------------------------- | -------- |
| Title+URL only   | Keep output identical to Perplexity format. Snippet data from DDG is discarded.                | ✓        |
| Include snippets | Extend SearchResult type with optional snippet field. Output format changes between providers. |          |
| You decide       | Let downstream planner pick based on Claude Code's actual output.                              |          |

**User's choice:** Title+URL only
**Notes:** Maintains drop-in consistency with Perplexity output.

### Scraping library

| Option               | Description                                                                          | Selected |
| -------------------- | ------------------------------------------------------------------------------------ | -------- |
| duck-duck-scrape lib | Abstracts HTML parsing, handles DDG structure changes. Library updates fix breakage. | ✓        |
| Raw fetch + cheerio  | More control, fewer dependencies. Breaks if DDG changes HTML.                        |          |
| Hybrid with fallback | Use library, fall back to raw cheerio. Belt and suspenders.                          |          |

**User's choice:** duck-duck-scrape lib

### Result count

| Option                          | Description                                                         | Selected |
| ------------------------------- | ------------------------------------------------------------------- | -------- |
| Cap at Perplexity count (~5-10) | Consistent, predictable. DDG often returns more but we truncate.    |          |
| Return all DDG results          | More results when falling back, but output differs from Perplexity. | ✓        |
| Configurable, default capped    | Make it configurable later (Phase 4 config file).                   |          |

**User's choice:** Return all DDG results

### No-API-key experience

| Option            | Description                                               | Selected |
| ----------------- | --------------------------------------------------------- | -------- |
| First-class path  | Seamless experience, user may not realize they're on DDG. | ✓        |
| Warn then proceed | Log warning to stderr, then proceed with DDG.             |          |

**User's choice:** First-class path

### DDG error handling

| Option                   | Description                                                  | Selected |
| ------------------------ | ------------------------------------------------------------ | -------- |
| Same error path          | DDG failure triggers same clean error as Perplexity failure. | ✓        |
| Provider-specific errors | Different error messages for DDG vs Perplexity.              |          |

**User's choice:** Same error path

---

## Retry Latency Budget

### Retry patience

| Option                    | Description                                                        | Selected |
| ------------------------- | ------------------------------------------------------------------ | -------- |
| Aggressive (~7s total)    | Base 500ms, max 4s, 3 retries.                                     |          |
| Moderate (~15s total)     | Base 1s, max 8s, 3 retries.                                        |          |
| Conservative (~30s total) | Base 1s, max 16s, 4 retries. Maximizes Perplexity recovery chance. | ✓        |

**User's choice:** Conservative (~30s total)
**Notes:** User explicitly requested retry policy must be configurable via env vars.

### Retry scope

| Option        | Description                            | Selected |
| ------------- | -------------------------------------- | -------- |
| 429 only      | Only retry on rate limit.              |          |
| 429 + 5xx     | Retry on rate limit and server errors. |          |
| All transient | Retry on 429, 5xx, network timeouts.   | ✓        |

**User's choice:** All transient

---

## Domain Matching Semantics

### Provider delegation

**User's question:** Can we pass domain filtering to Perplexity/DDG to handle?
**Answer:** Perplexity has `search_domain_filter` API param (pass through). DDG has no domain filter — must post-filter.

### DDG post-filter matching

| Option              | Description                                       | Selected |
| ------------------- | ------------------------------------------------- | -------- |
| Exact match only    | `github.com` matches `github.com` only.           |          |
| Subdomain-inclusive | `github.com` matches `docs.github.com` etc.       | ✓        |
| You decide          | Let planner pick simplest correct implementation. |          |

**User's choice:** Subdomain-inclusive for DDG

### Empty filter results

| Option                    | Description                                         | Selected |
| ------------------------- | --------------------------------------------------- | -------- |
| Filter then return        | If all results filtered out, return empty.          | ✓        |
| Soft filter with fallback | If all filtered, log warning and return unfiltered. |          |
| You decide                | Let planner decide.                                 |          |

**User's choice:** Filter then return (strict)

---

## Fallback Visibility

### Provider indication

| Option                      | Description                                                | Selected |
| --------------------------- | ---------------------------------------------------------- | -------- |
| Silent fallback, stderr log | No stdout indication. stderr logging for debugging.        |          |
| Visible in stdout           | Both stdout and stderr show which provider served results. |          |
| Debug log only              | Only log at debug level.                                   |          |

**User's choice:** Response must be marked with provider name used. Fallback logged as debug.

### Provider tag format

| Option        | Description                                                 | Selected |
| ------------- | ----------------------------------------------------------- | -------- |
| XML attribute | `<search_results provider="perplexity">`. Machine-readable. |          |
| XML comment   | `<!-- provider: perplexity -->`. Invisible to XML parsing.  | ✓        |
| Child element | `<provider>perplexity</provider>`. First-class element.     |          |

**User's choice:** XML comment

---

## Per-Request Timeout

| Option                    | Description                                              | Selected |
| ------------------------- | -------------------------------------------------------- | -------- |
| 30s per request           | Standard API timeout. Matches conservative retry budget. |          |
| 10s per request           | Faster fail per attempt.                                 |          |
| Configurable, default 30s | Aligns with making all retry params configurable.        | ✓        |

**User's choice:** Configurable via env var, default 30s

---

## Perplexity Domain Filter Capabilities

| Option                                   | Description                                                                      | Selected |
| ---------------------------------------- | -------------------------------------------------------------------------------- | -------- |
| Research first, then decide              | Check Perplexity API docs for search_domain_filter capabilities before deciding. | ✓        |
| Always post-filter both                  | Simpler code, consistent behavior.                                               |          |
| API for allowed, post-filter for blocked | Split approach.                                                                  |          |

**User's choice:** Research first
**Notes:** Decision deferred to research phase. Researcher must verify if Perplexity `search_domain_filter` supports both allowed and blocked domains.

---

## Partial Result Handling

| Option                     | Description                                                              | Selected |
| -------------------------- | ------------------------------------------------------------------------ | -------- |
| Discard partial, fresh DDG | Clean slate with DDG.                                                    |          |
| Merge results              | Combine Perplexity partial + DDG. More results but potential duplicates. | ✓        |
| You decide                 | Let researcher/planner decide based on failure modes.                    |          |

**User's choice:** Merge results

---

## Merged Result Ordering

| Option                         | Description                                                      | Selected |
| ------------------------------ | ---------------------------------------------------------------- | -------- |
| Perplexity first, DDG appended | Higher quality results first, DDG fills in. Deduplicated by URL. | ✓        |
| Interleaved                    | Mixed by position.                                               |          |
| Simple concat, no reorder      | Just concatenate.                                                |          |

**User's choice:** Perplexity first, DDG appended

---

## Domain Format Validation

| Option                 | Description                                                               | Selected |
| ---------------------- | ------------------------------------------------------------------------- | -------- |
| Normalize aggressively | Strip protocol, path, trailing slash. Forgiving input, strict comparison. | ✓        |
| Strict: reject invalid | Reject anything that isn't a bare domain.                                 |          |
| No validation          | Pass as-is to filter.                                                     |          |

**User's choice:** Normalize aggressively

---

## Error Message Detail Level

| Option                | Description                                        | Selected |
| --------------------- | -------------------------------------------------- | -------- |
| Detailed with context | Include provider name, error type, what was tried. | ✓        |
| Brief generic message | "All search providers failed". Minimal.            |          |
| Layered by log level  | Generic at info, details at debug.                 |          |

**User's choice:** Detailed with context

---

## Claude's Discretion

- Exact jitter algorithm (full jitter, decorrelated, etc.)
- DDG scraping error recovery strategy
- Env var naming conventions beyond specified retry params
- Internal module architecture and function signatures

## Deferred Ideas

None — discussion stayed within phase scope.
