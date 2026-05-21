# Phase 5: DDG-Only with Citations - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 05-ddg-only-with-citations
**Areas discussed:** Citation format, WebFetch simplification, Config & provider cleanup, WebSearch simplification, Test cleanup, Dependency removal

---

## Citation Format

| Option               | Description                                                                             | Selected |
| -------------------- | --------------------------------------------------------------------------------------- | -------- |
| Include DDG snippets | Add <snippet> tags with DDG description text. Results become <title>, <url>, <snippet>. | ✓        |
| URLs are citations   | Current format already has URLs. No format change.                                      |          |
| Something else       | Different approach for citations.                                                       |          |

**User's choice:** Include DDG snippets
**Notes:** Supersedes Phase 2 D-01. DDG results will now include description text from duck-duck-scrape.

| Option            | Description                              | Selected |
| ----------------- | ---------------------------------------- | -------- |
| <snippet> tag     | Clear tag name, matches DDG terminology. | ✓        |
| <description> tag | Matches duck-duck-scrape field name.     |          |

**User's choice:** `<snippet>` tag
**Notes:** XML element name for DDG description in output.

| Option                      | Description                                | Selected |
| --------------------------- | ------------------------------------------ | -------- |
| Always include tag          | Consistent XML structure, even when empty. | ✓        |
| Conditional (omit if empty) | Tighter output, omit if no description.    |          |

**User's choice:** Always include tag
**Notes:** Empty `<snippet></snippet>` for results without descriptions.

---

## WebFetch Simplification

| Option          | Description                                                           | Selected |
| --------------- | --------------------------------------------------------------------- | -------- |
| Pure extraction | Remove summarize/hasApiKey, keep Readability+Turndown pipeline as-is. | ✓        |
| Something more  | Add truncation/formatting changes or other processing.                |          |

**User's choice:** Pure extraction
**Notes:** No changes to content pipeline. Just removes Perplexity summarization layer.

| Option     | Description                                                             | Selected |
| ---------- | ----------------------------------------------------------------------- | -------- |
| Keep retry | Retry on transient errors for page fetching. Same pattern as WebSearch. | ✓        |
| No retry   | Remove retry logic, single attempt, fail fast.                          |          |

**User's choice:** Keep retry
**Notes:** `retryWithBackoff` stays for HTTP fetch in WebFetch.

---

## Config & Provider Cleanup

| Option          | Description                                                                               | Selected |
| --------------- | ----------------------------------------------------------------------------------------- | -------- |
| Full removal    | Remove perplexity section from schema, config, env vars. Config becomes {retry, logging}. | ✓        |
| Partial cleanup | Remove section but leave structure for future providers.                                  |          |

**User's choice:** Full removal
**Notes:** No placeholder for future providers. Clean slate.

| Option         | Description                           | Selected |
| -------------- | ------------------------------------- | -------- |
| Remove comment | Only one provider — comment is noise. | ✓        |
| Keep comment   | Consistency with existing behavior.   |          |

**User's choice:** Remove comment
**Notes:** `<!-- provider: X -->` XML comment removed from output.

---

## WebSearch Simplification

| Option         | Description                                                                                | Selected |
| -------------- | ------------------------------------------------------------------------------------------ | -------- |
| Full simplify  | Remove all fallback/merge/dedupe. Main becomes: DDG → filter → format → output. ~30 lines. | ✓        |
| Keep structure | Preserve structure for future provider additions.                                          |          |

**User's choice:** Full simplify
**Notes:** Complete rewrite of websearch.ts main function. No fallback chain.

---

## Test Cleanup

| Option       | Description                                                                   | Selected |
| ------------ | ----------------------------------------------------------------------------- | -------- |
| Full cleanup | Delete perplexity.test.ts, full updates to DDG/websearch/config/output tests. | ✓        |
| Minimal      | Delete perplexity.test.ts, minimal updates to pass.                           |          |

**User's choice:** Full cleanup
**Notes:** Thorough test updates across all affected test files.

---

## Dependency Removal

| Option         | Description                                                                | Selected |
| -------------- | -------------------------------------------------------------------------- | -------- |
| Confirm scope  | Delete perplexity.ts, remove @perplexity-ai/perplexity_ai, remove imports. | ✓        |
| Something more | Additional considerations.                                                 |          |

**User's choice:** Confirm scope
**Notes:** Mechanical removal. No other dependencies become dead.

---

## Claude's Discretion

- Exact wording of simplified websearch.ts main function
- Specific test case structure for updated tests
- Order of removal operations

## Deferred Ideas

None — discussion stayed within phase scope.
