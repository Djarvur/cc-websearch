---
phase: '02'
slug: search-resilience
status: completed
nyquist_compliant: true
wave_0_complete: true
created: '2026-05-20'
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                            |
| ---------------------- | -------------------------------- |
| **Framework**          | vitest 4.1.6                     |
| **Config file**        | vitest.config.ts                 |
| **Quick run command**  | `npm test`                       |
| **Full suite command** | `npm test -- --reporter=verbose` |
| **Estimated runtime**  | ~5 seconds                       |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test -- --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Threat Ref | Secure Behavior                                | Test Type | Automated Command                        | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ---------- | ---------------------------------------------- | --------- | ---------------------------------------- | ----------- | ---------- |
| 02-01-01 | 01   | 1    | SRCH-05     | —          | N/A                                            | unit      | `npx vitest run test/duckduckgo.test.ts` | ❌ W0       | ✅ green |
| 02-01-02 | 01   | 1    | SRCH-05     | —          | N/A                                            | unit      | `npx vitest run test/duckduckgo.test.ts` | ❌ W0       | ✅ green |
| 02-02-01 | 02   | 1    | SRCH-03     | T-02-01    | Normalize domains aggressively                 | unit      | `npx vitest run test/filter.test.ts`     | ❌ W0       | ✅ green |
| 02-02-02 | 02   | 1    | SRCH-06     | T-02-01    | Domain normalization strips protocol/path      | unit      | `npx vitest run test/filter.test.ts`     | ❌ W0       | ✅ green |
| 02-02-03 | 02   | 1    | SRCH-06     | —          | N/A                                            | unit      | `npx vitest run test/filter.test.ts`     | ❌ W0       | ✅ green |
| 02-03-01 | 03   | 1    | SRCH-07     | T-02-02    | Hard cap on retry count (4), max delay (16s)   | unit      | `npx vitest run test/retry.test.ts`      | ❌ W0       | ✅ green |
| 02-03-02 | 03   | 1    | SRCH-07     | T-02-02    | Per-request timeout (30s) enforced             | unit      | `npx vitest run test/retry.test.ts`      | ❌ W0       | ✅ green |
| 02-03-03 | 03   | 2    | SRCH-08     | —          | N/A                                            | unit      | `npx vitest run test/websearch.test.ts`  | ❌ W0       | ✅ green |
| 02-03-04 | 03   | 2    | SRCH-03     | —          | N/A                                            | unit      | `npx vitest run test/websearch.test.ts`  | ❌ W0       | ✅ green |
| 02-03-05 | 03   | 2    | SRCH-05     | —          | N/A                                            | unit      | `npx vitest run test/websearch.test.ts`  | ❌ W0       | ✅ green |
| 02-03-06 | 03   | 2    | SRCH-08     | T-02-03    | Error messages exclude API keys/sensitive data | unit      | `npx vitest run test/websearch.test.ts`  | ❌ W0       | ✅ green |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [x] `test/duckduckgo.test.ts` — stubs for SRCH-05
- [x] `test/retry.test.ts` — stubs for SRCH-07
- [x] `test/filter.test.ts` — stubs for SRCH-03, SRCH-06
- [x] `test/websearch.test.ts` — stubs for SRCH-03, SRCH-05, SRCH-08
- [x] `test/helpers/mocks.ts` — shared fixtures (mock Perplexity/DDG responses)

---

## Manual-Only Verifications

| Behavior                               | Requirement | Why Manual                    | Test Instructions                                                                    |
| -------------------------------------- | ----------- | ----------------------------- | ------------------------------------------------------------------------------------ |
| Live DDG fallback when Perplexity down | SRCH-05     | Requires real network failure | Set invalid PPLX_API_KEY, run `echo '{"query":"test"}' \| node scripts/websearch.js` |
| Live Perplexity rate limit backoff     | SRCH-07     | Requires real 429 response    | Rapid-fire searches until rate-limited; observe backoff timing on stderr             |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-20
