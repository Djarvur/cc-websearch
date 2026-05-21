---
phase: 03-webfetch-content-pipeline
verified: 2026-05-20T18:10:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
re_verification: false
---

# Phase 3: WebFetch Content Pipeline Verification Report

**Phase Goal:** Users can fetch web pages and receive summarized markdown content matching Claude Code's WebFetch behavior
**Verified:** 2026-05-20T18:10:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

Truths derived from ROADMAP.md Success Criteria (5 items) plus PLAN frontmatter truths that add specificity.

| #    | Truth                                                                                                              | Status   | Evidence                                                                                                                                                                                                                                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SC-1 | WebFetch skill accepts `{url, prompt}` as JSON on stdin and returns a summarized answer to stdout                  | VERIFIED | `src/webfetch.ts` reads stdin via `readStdin(WebFetchInputSchema)`, normalizes URL, fetches, extracts markdown, summarizes via Perplexity when key available, writes to stdout. `src/lib/input.ts:11-14` defines `WebFetchInputSchema` with `z.strictObject({url, prompt})`. Integration test `test/webfetch.test.ts:163-185` confirms summarize result written to stdout. |
| SC-2 | HTTP URLs are automatically upgraded to HTTPS before fetching                                                      | VERIFIED | `src/lib/fetch.ts:12-18` `normalizeUrl` replaces `http:` protocol with `https:`. Unit test `test/fetch.test.ts:30-36` confirms `http://example.com/path` becomes `https:`.                                                                                                                                                                                                 |
| SC-3 | Article pages produce clean markdown output via Readability content extraction followed by Turndown conversion     | VERIFIED | `src/lib/content.ts:21-46` implements full pipeline: JSDOM -> Readability.parse() -> Turndown conversion. ATX headings, fenced code blocks, GFM tables all verified in `test/content.test.ts:75-145`. 7 content tests pass.                                                                                                                                                |
| SC-4 | Non-article pages (where Readability returns null) still produce usable markdown via raw Turndown fallback         | VERIFIED | `src/lib/content.ts:35-37` falls back to `turndown.turndown(html)` on full HTML when Readability returns null. Test `test/content.test.ts:44-53` confirms non-article HTML produces non-empty output containing nav elements.                                                                                                                                              |
| SC-5 | Same-host redirects are followed automatically; cross-host redirects return redirect metadata instead of following | VERIFIED | `src/lib/fetch.ts:20-70` implements `fetchWithRedirects` with `redirect: 'manual'`, hostname comparison for cross-host detection, 10-hop cap. `CrossHostRedirectError` caught in `src/webfetch.ts:34-39` writes redirect message to stdout. Tests `test/fetch.test.ts:63-135` cover same-host chain (3 hops), cross-host error, max hops.                                  |

**Score:** 5/5 truths verified

### Additional Truths from PLAN Frontmatter

| #         | Truth                                                                                                | Status   | Evidence                                                                                                                                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | -------------------------------------------------------- |
| D-09      | HTTP fetching uses native fetch with `redirect: 'manual'`                                            | VERIFIED | `src/lib/fetch.ts:28-29` calls `fetch(currentUrl.toString(), { redirect: 'manual' })`. Test `test/fetch.test.ts:188-202` confirms `redirect: 'manual'` option.                                                          |
| D-10      | Cross-host redirects return human-readable redirect message to stdout, not followed                  | VERIFIED | `src/webfetch.ts:34-39` catches `CrossHostRedirectError` and writes message to stdout. Test `test/webfetch.test.ts:111-132` confirms redirect message on stdout, NOT on stderr.                                         |
| D-14      | HTTP 4xx/5xx responses produce an error on stderr and clean exit                                     | VERIFIED | `src/lib/fetch.ts:33-35` throws error for status >= 400. `src/webfetch.ts:41-42` catches and logs to stderr via `logger.error`, sets `process.exitCode = 1`. Test `test/fetch.test.ts:137-146` confirms HTTP 404 error. |
| D-12/D-15 | Non-HTML content types produce an error naming the Content-Type                                      | VERIFIED | `src/lib/fetch.ts:60-64` checks Content-Type whitelist, throws error naming content type. Test `test/fetch.test.ts:148-159` confirms `application/pdf` rejected.                                                        |
| FTEC-02   | HTTP URLs are automatically upgraded to HTTPS before fetching                                        | VERIFIED | Same as SC-2.                                                                                                                                                                                                           |
| D-06      | Large content is truncated to 100KB before sending to Perplexity                                     | VERIFIED | `src/lib/content.ts:6` defines `MAX_CONTENT_SIZE = 100_000`, `src/lib/content.ts:41-43` truncates with marker suffix. Test `test/content.test.ts:55-65` confirms truncation.                                            |
| D-07      | When Perplexity API key is available, extracted markdown is summarized and answer returned to stdout | VERIFIED | `src/webfetch.ts:22-32` `hasApiKey()` true path calls `retryWithBackoff(() => summarize(...))` and writes result to stdout. Test `test/webfetch.test.ts:163-185` confirms.                                              |
| D-08      | When no API key, raw extracted markdown is returned to stdout                                        | VERIFIED | `src/webfetch.ts:22-24` `!hasApiKey()` path writes raw markdown to stdout. Test `test/webfetch.test.ts:187-210` confirms `summarize` is NOT called.                                                                     |
| D-04      | Reuse same sonar model as WebSearch                                                                  | VERIFIED | `src/lib/perplexity.ts:79` uses `process.env.PPLX_MODEL                                                                                                                                                                 |     | 'sonar'`in`summarize()`, matching `search()` at line 30. |
| D-05      | Prompt structure: page content as user message, user prompt as system instruction                    | VERIFIED | `src/lib/perplexity.ts:86-94` messages array: `system` role = `userPrompt`, `user` role = `content`. Test `test/webfetch.test.ts:236-258` confirms `summarize` called with `(markdown, prompt)`.                        |

### Required Artifacts

| Artifact                   | Expected                                                                             | Status   | Details                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/fetch.ts`         | HTTP fetch with manual redirect handling, URL normalization, Content-Type validation | VERIFIED | 70 lines, exports `CrossHostRedirectError`, `normalizeUrl`, `fetchWithRedirects`. All wired in `src/webfetch.ts`.                                                                             |
| `src/lib/input.ts`         | WebFetchInputSchema added alongside existing WebSearchInputSchema                    | VERIFIED | Lines 11-16 define `WebFetchInputSchema` with `z.strictObject({url, prompt})`. Exported type `WebFetchInput`.                                                                                 |
| `src/lib/content.ts`       | Readability + Turndown extraction with null fallback and truncation                  | VERIFIED | 46 lines, imports Readability, JSDOM, TurndownService, gfm. `MAX_CONTENT_SIZE = 100_000`. Null fallback at line 35-37.                                                                        |
| `src/lib/perplexity.ts`    | `summarize()` function with `disable_search: true`                                   | VERIFIED | Lines 77-99 define `summarize()` with `disable_search: true`, system=prompt, user=content message structure.                                                                                  |
| `src/webfetch.ts`          | Full pipeline: stdin -> normalize -> fetch -> extract -> summarize/raw output        | VERIFIED | 46 lines, imports all modules, has both `hasApiKey()` branches, `CrossHostRedirectError` catch branch.                                                                                        |
| `test/fetch.test.ts`       | Unit tests for URL normalization, redirect handling, Content-Type validation         | VERIFIED | 216 lines, 13 tests covering normalizeUrl, fetchWithRedirects, CrossHostRedirectError.                                                                                                        |
| `test/webfetch.test.ts`    | Integration tests for webfetch stdin/stdout pipeline                                 | VERIFIED | 259 lines, 8 tests covering successful fetch, redirect, errors, summarize/raw paths, prompt passing.                                                                                          |
| `test/content.test.ts`     | Unit tests for content extraction, null fallback, truncation                         | VERIFIED | 146 lines, 7 tests covering article extraction, null fallback, truncation, ATX headings, fenced code, GFM tables.                                                                             |
| `skills/webfetch/SKILL.md` | Real usage instructions, not stub                                                    | VERIFIED | References `scripts/webfetch.js`, no "not yet implemented" text, documents stdin schema.                                                                                                      |
| `scripts/webfetch.js`      | Bundled real implementation                                                          | VERIFIED | 343,304 lines (esbuild bundle), contains all key symbols: `extractMarkdown`, `disable_search`, `CrossHostRedirectError`, `normalizeUrl`, `fetchWithRedirects`. No "not yet implemented" text. |

### Key Link Verification

| From                 | To                      | Via                                                                   | Status | Details                                                        |
| -------------------- | ----------------------- | --------------------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| `src/webfetch.ts`    | `src/lib/fetch.js`      | `import { normalizeUrl, fetchWithRedirects, CrossHostRedirectError }` | WIRED  | Line 3 import, used at lines 13, 15, 34                        |
| `src/webfetch.ts`    | `src/lib/content.js`    | `import { extractMarkdown }`                                          | WIRED  | Line 4 import, used at line 19                                 |
| `src/webfetch.ts`    | `src/lib/perplexity.js` | `import { hasApiKey, summarize }`                                     | WIRED  | Line 5 import, used at lines 22, 29                            |
| `src/webfetch.ts`    | `src/lib/retry.js`      | `import { retryWithBackoff, isTransientError }`                       | WIRED  | Line 6 import, used at line 28-31                              |
| `src/lib/content.ts` | `@mozilla/readability`  | `import { Readability }`                                              | WIRED  | Line 1 import, used at line 27                                 |
| `src/lib/content.ts` | `turndown`              | `import TurndownService`                                              | WIRED  | Line 3 import, instantiated at line 9                          |
| `src/lib/content.ts` | `turndown-plugin-gfm`   | `import { gfm }`                                                      | WIRED  | Line 4 import, used at line 14                                 |
| `SKILL.md`           | `scripts/webfetch.js`   | Usage example in body                                                 | WIRED  | Line 15 references `scripts/webfetch.js` (NOT the `.cjs` stub) |

### Data-Flow Trace (Level 4)

| Artifact          | Data Variable | Source                                                              | Produces Real Data                                                   | Status  |
| ----------------- | ------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------- | ------- |
| `src/webfetch.ts` | `markdown`    | `extractMarkdown(html, finalUrl.href)`                              | Yes -- Readability+Turndown pipeline extracts real content from HTML | FLOWING |
| `src/webfetch.ts` | `summary`     | `retryWithBackoff(() => summarize(markdown, input.prompt))`         | Yes -- Perplexity Chat Completions returns answer text               | FLOWING |
| `src/webfetch.ts` | stdout output | `process.stdout.write(markdown)` or `process.stdout.write(summary)` | Yes -- conditional on `hasApiKey()`                                  | FLOWING |

### Behavioral Spot-Checks

| Behavior                                | Command                                                                                           | Result                                 | Status |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------- | ------ |
| Phase 3 test suite passes               | `npx vitest run test/fetch.test.ts test/webfetch.test.ts test/content.test.ts --reporter=verbose` | 28/28 tests passing                    | PASS   |
| Full test suite passes (no regressions) | `npx vitest run --reporter=verbose`                                                               | 144/144 tests passing across 15 files  | PASS   |
| Bundle contains real implementation     | `grep -c 'extractMarkdown\|disable_search' scripts/webfetch.js`                                   | 32 matches found                       | PASS   |
| SKILL.md references correct script      | `grep webfetch scripts ref in SKILL.md`                                                           | References `webfetch.js` (real bundle) | PASS   |

### Requirements Coverage

| Requirement | Source Plan | Description                                                          | Status    | Evidence                                                                         |
| ----------- | ----------- | -------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------- |
| FTEC-01     | 03-01       | Script accepts `{url: string (required), prompt: string (required)}` | SATISFIED | `WebFetchInputSchema` in `src/lib/input.ts:11-14`, validated by `readStdin`      |
| FTEC-02     | 03-01       | URL normalization: HTTP auto-upgraded to HTTPS                       | SATISFIED | `normalizeUrl` in `src/lib/fetch.ts:12-18`                                       |
| FTEC-03     | 03-02       | HTML-to-Markdown via Readability + Turndown, with null fallback      | SATISFIED | `extractMarkdown` in `src/lib/content.ts:21-46`, null fallback at line 35-37     |
| FTEC-04     | 03-02       | LLM summarization via Perplexity Chat Completions                    | SATISFIED | `summarize` in `src/lib/perplexity.ts:77-99` with `disable_search: true`         |
| FTEC-05     | 03-01       | Same-host redirects followed; cross-host redirects return metadata   | SATISFIED | `fetchWithRedirects` in `src/lib/fetch.ts:20-70`, hostname comparison at line 46 |

No orphaned requirements found. REQUIREMENTS.md maps FTEC-01 through FTEC-05 all to Phase 3, and all five are covered by the two plans.

### Anti-Patterns Found

| File                   | Line  | Pattern                                                                            | Severity | Impact                                                                                                                      |
| ---------------------- | ----- | ---------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/retry.ts`     | 29-37 | `withTimeout` creates `AbortController` but never connects signal to the operation | WARNING  | Timeout is non-functional for hung operations. Pre-existing from Phase 2, not introduced by Phase 3. Not a Phase 3 blocker. |
| `src/lib/input.ts`     | 24    | `JSON.parse(raw)` without try/catch on empty stdin                                 | WARNING  | Empty stdin produces cryptic `SyntaxError`. Pre-existing from Phase 1, not introduced by Phase 3. Not a Phase 3 blocker.    |
| `src/lib/fetch.ts`     | 12-18 | `normalizeUrl` does not reject non-HTTP schemes (data:, ftp:)                      | WARNING  | Non-HTTP schemes pass through without validation. Low severity in CLI tool context.                                         |
| `scripts/webfetch.cjs` | --    | Stub file still exists alongside real `scripts/webfetch.js`                        | INFO     | Not referenced by SKILL.md. Could cause developer confusion but no runtime impact.                                          |

No TBD, FIXME, or XXX markers found in Phase 3 files.

### Review Issues Assessment

The code review (03-REVIEW.md) identified 7 issues. Current state:

| ID    | Severity | Description                             | Current Status                                                          | Phase 3 Scope?                |
| ----- | -------- | --------------------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| CR-01 | Critical | SKILL.md references stub `webfetch.cjs` | FIXED -- SKILL.md now references `webfetch.js`                          | Yes, fixed                    |
| CR-02 | Critical | `withTimeout` non-functional            | Still present                                                           | No -- pre-existing in Phase 2 |
| WR-01 | Warning  | `readStdin` crashes on empty stdin      | Still present                                                           | No -- pre-existing in Phase 1 |
| WR-02 | Warning  | `skills.test.ts` checks wrong filename  | NOT VALID -- test correctly checks `webfetch.js` which matches SKILL.md | N/A                           |
| WR-03 | Warning  | `normalizeUrl` accepts non-HTTP schemes | Still present                                                           | Yes, but low severity         |
| IN-01 | Info     | Perplexity response typed as `any`      | Still present                                                           | No -- pre-existing in Phase 1 |
| IN-02 | Info     | JSDOM not explicitly closed             | Still present                                                           | Yes, but low severity         |

### Human Verification Required

1. **End-to-end WebFetch with real URL**
   - **Test:** Run `echo '{"url":"https://example.com","prompt":"What is on this page?"}' | node scripts/webfetch.js` with a valid `PPLX_API_KEY` set
   - **Expected:** Returns a summarized answer about the page content
   - **Why human:** Requires network access and valid API key; cannot verify programmatically in offline verification

2. **Cross-host redirect message clarity**
   - **Test:** Fetch a URL that triggers a cross-host redirect (e.g., a short URL service)
   - **Expected:** Human-readable redirect message appears on stdout indicating redirect was not followed
   - **Why human:** Requires specific URL known to cross-host redirect; output readability is subjective

---

## Gaps Summary

No blocking gaps found. All 5 ROADMAP success criteria are verified with codebase evidence. All 5 requirements (FTEC-01 through FTEC-05) are satisfied. The full test suite passes (144/144). All key links are wired. Data flows are connected from stdin through to stdout.

The code review identified 2 critical issues, but both have been resolved or are out of scope:

- CR-01 (wrong SKILL.md reference) is fixed -- SKILL.md now points to the real `webfetch.js`
- CR-02 (non-functional timeout) is a pre-existing Phase 2 issue, not introduced by Phase 3

Three low-severity warnings remain (empty stdin error, non-HTTP scheme acceptance, JSDOM close) but none block the phase goal.

---

_Verified: 2026-05-20T18:10:00Z_
_Verifier: Claude (gsd-verifier)_
