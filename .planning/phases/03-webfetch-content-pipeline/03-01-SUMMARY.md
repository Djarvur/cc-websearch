---
phase: 03-webfetch-content-pipeline
plan: 01
subsystem: webfetch
tags: [http, fetch, redirects, url-normalization, input-validation]
dependency_graph:
  requires: [src/lib/input.ts, src/lib/logger.ts, src/lib/retry.ts]
  provides: [src/lib/fetch.ts, src/lib/input.ts::WebFetchInputSchema, src/webfetch.ts, skills/webfetch/SKILL.md]
  affects: [test/skills.test.ts, scripts/webfetch.js]
tech_stack:
  added: []
  patterns: [native-fetch-redirect-manual, zod-strict-object-schema, iife-main-pattern]
key_files:
  created:
    - src/lib/fetch.ts
    - test/fetch.test.ts
    - test/webfetch.test.ts
  modified:
    - src/lib/input.ts
    - src/webfetch.ts
    - skills/webfetch/SKILL.md
    - test/skills.test.ts
    - scripts/webfetch.js
decisions:
  - fetchWithRedirects uses native fetch with redirect:manual for custom redirect logic
  - CrossHostRedirectError written to stdout (not stderr) per D-10
  - Content-Type whitelist only allows text/html and application/xhtml
  - HTTP URLs auto-upgraded to HTTPS in normalizeUrl
  - 10-hop redirect cap prevents infinite loops
  - SKILL.md references webfetch.cjs matching esbuild outExtension convention
metrics:
  duration: 343s
  completed: "2026-05-20"
  tasks: 1
  files: 8
  tests_added: 17
  tests_total: 133
---

# Phase 3 Plan 01: WebFetch HTTP Fetch Pipeline Summary

HTTP fetch pipeline with URL normalization (HTTP->HTTPS), manual redirect handling (same-host follow, cross-host block), Content-Type whitelist, and error handling. WebFetchInputSchema validates {url, prompt} on stdin. All edge cases (redirects, non-HTML, HTTP errors) handled. SKILL.md updated from stub to real instructions.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Test scaffolds and input schema + fetch module + webfetch controller | e9c4ace (RED), 9a43837 (GREEN) | src/lib/fetch.ts, src/lib/input.ts, src/webfetch.ts, skills/webfetch/SKILL.md, test/fetch.test.ts, test/webfetch.test.ts, test/skills.test.ts, scripts/webfetch.js |

## TDD Gate Compliance

| Gate | Commit | Status |
| ---- | ------ | ------ |
| RED (failing tests) | e9c4ace | 17 tests failing |
| GREEN (all passing) | 9a43837 | 17 new tests + 116 existing = 133 total passing |
| REFACTOR | N/A | No refactoring needed |

## Verification Results

- Full test suite: 133 tests passing, 0 failures
- Invalid URL input: produces Zod validation error on stderr, exitCode 1
- Missing fields input: produces field-specific validation errors on stderr, exitCode 1
- Bundle rebuilt: scripts/webfetch.js contains fetchWithRedirects, CrossHostRedirectError, normalizeUrl
- SKILL.md: references webfetch.cjs, contains usage instructions, no "not yet implemented"

## Requirements Met

| Requirement | Status | Evidence |
|-------------|--------|----------|
| FTEC-01: WebFetchInputSchema {url, prompt} | Met | Zod strictObject with .url() and .min(1) validators |
| FTEC-02: HTTP auto-upgraded to HTTPS | Met | normalizeUrl replaces http: protocol with https: |
| FTEC-05: Same-host redirects followed, cross-host blocked | Met | fetchWithRedirects with redirect:manual, hostname comparison |
| D-09: redirect:manual for custom redirect logic | Met | fetch() called with { redirect: 'manual' } |
| D-10: Cross-host redirect message to stdout | Met | CrossHostRedirectError catch branch writes to stdout |
| D-11: Same-host redirects capped at 10 hops | Met | maxHops=10 default, error thrown on exceed |
| D-14: HTTP 4xx/5xx produce error on stderr | Met | status >= 400 throws Error with status code |
| D-12/D-15: Non-HTML Content-Type rejected | Met | Content-Type whitelist check before returning response |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Updated test/skills.test.ts assertion**
- **Found during:** Task 1 GREEN phase
- **Issue:** Pre-existing test checked for "not yet implemented" in SKILL.md, which failed after we replaced the stub with real content
- **Fix:** Replaced the "not yet implemented" assertion with positive assertions: checks for node/CLAUDE_PLUGIN_ROOT in body and asserts "not yet implemented" is NOT present
- **Files modified:** test/skills.test.ts
- **Commit:** 9a43837

## Known Stubs

None. Plan 02 will add content extraction (Readability + Turndown) and Perplexity summarization -- this plan intentionally outputs raw HTML only.

## Threat Flags

No new security-relevant surface beyond what the plan's threat model covers. All mitigations implemented:
- T-03-01: URL constructor validates scheme (http/https only)
- T-03-02: Content-Type whitelist (text/html, application/xhtml)
- T-03-03: Cross-host redirects not followed (hostname comparison)
- T-03-04: 10-hop redirect cap
- T-03-05: 4xx/5xx rejected immediately
- T-03-06: Zod strictObject validation on stdin input

## Self-Check: PASSED

All 8 created/modified files found. Both commit hashes (e9c4ace, 9a43837) found in git log.
