# Milestones

## 1.0 MVP (Shipped: 2026-05-21)

**Phases completed:** 8 phases, 21 plans, 37 tasks
**Known deferred items at close:** 3 (see STATE.md Deferred Items)

**Key accomplishments:**

- Installable Claude Code plugin with manifest, two skill definitions, Zod input validation, XML output formatter, stderr logger, esbuild build pipeline, and 21 passing tests
- End-to-end WebSearch with Perplexity Sonar API: JSON stdin to Perplexity chat completions to XML stdout, with API key configuration and 37 passing tests
- Installable Claude Code plugin with Perplexity-powered WebSearch, esbuild build pipeline, Zod input validation, XML output formatter, stderr logger, and 37 passing tests
- DDG fallback provider, exponential backoff with full jitter, two-tier Perplexity-to-DDG orchestration, provider comment in output, and 68 passing tests
- Domain normalization, subdomain-inclusive matching, Perplexity API native domain filtering, DDG post-result filtering, mutual exclusivity validation, and 109 passing tests
- Partial Perplexity result capture via closure, URL-deduped merge with DDG fallback, dual-provider comment, and detailed error messages on total failure
- DDG fallback with exponential backoff retry, domain filtering with subdomain matching, and partial result merging -- achieving fault-tolerant search across 115 passing tests
- 1. [Rule 3 - Blocking Issue] Updated test/skills.test.ts assertion
- 1. [Rule 1 - Bug] Fixed article title assertion in content test
- HTTP fetch pipeline with redirect handling, Readability + Turndown content extraction with null fallback, Perplexity summarization with disable_search:true, and 144 passing tests
- Config loader with Zod strictObject schema, sync file reading from ~/.config/websearch/config.json, per-key env > file > defaults precedence, and 24 passing tests
- Refactored logger to createLogger factory with ISO 8601 timestamps and module prefixes; wired retry and perplexity modules to accept ResolvedConfig; updated all 5 lib module test files with 74 passing tests
- Config-initialized entry points with loadConfig + createLogger factory, updated all 3 entry-point test files with config/logger mocks, rebuilt bundles, 168 tests passing
- Config loader with Zod schema and per-key env > file > defaults precedence, createLogger factory replacing singleton, all lib modules accepting ResolvedConfig, and 168 passing tests
- DDG-only search with citation snippets, Perplexity fully removed from source, config, and dependencies
- Verified complete Perplexity purge across all source and test files, rebuilt esbuild bundles removing ~4700 lines of dead SDK code
- Complete Perplexity removal: DDG-only search with citation snippets, zero-API-key operation, simplified config, and 127 passing tests with rebuilt bundles
- ESLint 9 flat config + Prettier + coverage enforcement + mise tasks + jsdom bundle fix, all passing npm run check
- E2E test suite validating real DDG search and WebFetch via child_process, plus GitHub Actions PR gate CI workflow
- Weekly cron workflow for npm audit + E2E tests, plus Dependabot for automated npm and GitHub Actions dependency updates
- ESLint 9 flat config, Prettier, coverage enforcement (80/70/80), mise task runner, E2E tests via child_process, GitHub Actions PR gate + cron workflow + Dependabot, and 131 passing tests
- README.md rewritten with 8 sections (221 lines), .env.example config template created matching config.ts, webfetch SKILL.md path bug fixed (.js -> .cjs)
- Extended plugin structure validation tests with script path matching, hook absence assertions, and manifest description check, then passed full verification gate (lint + typecheck + test coverage + build)
- Full README rewrite (221 lines, 8 sections), .env.example config template, corrected SKILL.md paths, extended structure validation tests (12 total), and full verification gate pass (lint + typecheck + test coverage + build)
- REQUIREMENTS.md rewritten to reflect DDG-only architecture, add 8 CI requirements, standardize traceability statuses, and sync all checkboxes per v1.0 milestone audit
- Audited all 17 plan-level SUMMARY frontmatter for completeness, fixed 03-01 known gap (FTEC-01/02/05), created 7 phase-level aggregation SUMMARYs, and created v1.0 milestone SUMMARY
- Four low-severity code debt items resolved: withTimeout ETIMEDOUT message, readStdin isTTY guard, normalizeUrl scheme validation, jsdom/@types/jsdom version alignment

---

## 1.1 Plugin Distribution (Shipped: 2026-05-22)

**Phases completed:** 1 phase (Phase 9), 1 plan

**Key accomplishments:**

- esbuild bundles relocated from the repository root to `skills/websearch/scripts/websearch.cjs` and `skills/webfetch/scripts/webfetch.cjs`, so each skill ships next to the script it invokes
- SKILL.md command paths switched to `${CLAUDE_PLUGIN_ROOT}/skills/<name>/scripts/<bundle>.cjs`
- Path-dependent tests and README examples updated for the new locations

**Known gap at close:** DIST-05 ("old `scripts/` root directory removed") was marked complete but was not done -- `scripts/websearch.cjs` and `scripts/webfetch.cjs` remain tracked in git while nothing builds them.

---

## 1.2 Replace Built-in WebSearch/WebFetch (Shipped: 2026-05-24, released v1.2.4 on 2026-05-25)

**Phases completed:** 3 phases (10-12), 5 plans

**Key accomplishments:**

- PreToolUse deny hooks that intercept the built-in WebSearch and WebFetch tools and redirect Claude to `cc-websearch:websearch` / `cc-websearch:webfetch`. Two separate matchers, each a fixed inline `echo` -- no shell script, no `jq`, and no reading of the tool input
- Denial reason wording and SKILL.md descriptions tuned for redirect reliability, with `test/e2e/redirect-reliability.e2e.ts` measuring it across diverse prompt patterns
- Output compatibility proven empirically by `test/e2e/output-compatibility.e2e.ts` (8 tests, 4 search + 4 fetch): WebSearch XML and WebFetch markdown are consumable by Claude after a denial
- 100KB content truncation in `src/lib/content.ts` to match built-in WebFetch behavior
- Works on every provider, since the hook does not depend on the built-in tool being present

**Post-milestone correction:** the hook file was first created at `.claude-plugin/hooks/hooks.json` and referenced from `plugin.json`. That combination made Claude Code load the same file twice and fail with "Duplicate hooks file detected". Commit `f99c9d2` moved it to `hooks/hooks.json` at the repository root and dropped the manifest reference, relying on auto-discovery.

---

