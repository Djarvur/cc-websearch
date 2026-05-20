---
phase: 3
slug: webfetch-content-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.6 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run test/fetch.test.ts test/content.test.ts -x` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run test/fetch.test.ts test/content.test.ts -x`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | FTEC-01 | — | Zod schema validation on stdin input | unit | `npx vitest run test/webfetch.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | FTEC-02 | — | HTTP→HTTPS upgrade | unit | `npx vitest run test/fetch.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | FTEC-05 | T-03-05 | Same-host redirects followed (max 10); cross-host blocked | unit | `npx vitest run test/fetch.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | FTEC-03 | T-03-02 | Readability strips scripts; jsdom runScripts disabled | unit | `npx vitest run test/content.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | FTEC-04 | T-03-01 | Perplexity summarization with disable_search | unit | `npx vitest run test/webfetch.test.ts -x` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 2 | FTEC-03 | — | Readability null fallback to raw Turndown | unit | `npx vitest run test/content.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/fetch.test.ts` — stubs for FTEC-02 (URL normalization), FTEC-05 (redirect handling)
- [ ] `test/content.test.ts` — stubs for FTEC-03 (Readability + Turndown, null fallback, truncation)
- [ ] `test/webfetch.test.ts` — stubs for FTEC-01 (input validation), FTEC-04 (Perplexity summarize integration)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end fetch + summarize of real URL | FTEC-04 | Requires live Perplexity API key and network access | Run `echo '{"url":"https://example.com","prompt":"Summarize this page"}' | node scripts/webfetch.js` and verify output |
| Cross-host redirect message format | FTEC-05 | Requires real redirecting URL | Fetch URL that redirects cross-host, verify stdout shows redirect message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
