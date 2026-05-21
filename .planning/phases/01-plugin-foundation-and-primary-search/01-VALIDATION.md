---
phase: 1
slug: plugin-foundation-and-primary-search
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                               |
| ---------------------- | ----------------------------------- |
| **Framework**          | vitest 4.1.6                        |
| **Config file**        | `vitest.config.ts` (Wave 0 creates) |
| **Quick run command**  | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage`         |
| **Estimated runtime**  | ~5 seconds                          |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Threat Ref | Secure Behavior                     | Test Type   | Automated Command                           | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ---------- | ----------------------------------- | ----------- | ------------------------------------------- | ----------- | ---------- |
| 01-01-01 | 01   | 1    | PLUG-01     | —          | N/A                                 | unit        | `npx vitest run test/manifest.test.ts`      | ❌ W0       | ⬜ pending |
| 01-01-02 | 01   | 1    | PLUG-02     | —          | N/A                                 | unit        | `npx vitest run test/skills.test.ts`        | ❌ W0       | ⬜ pending |
| 01-01-03 | 01   | 1    | PLUG-03     | —          | N/A                                 | unit        | `npx vitest run test/skills.test.ts`        | ❌ W0       | ⬜ pending |
| 01-02-01 | 02   | 1    | PLUG-04     | T-1-01     | Zod rejects unexpected fields/types | unit        | `npx vitest run test/input.test.ts`         | ❌ W0       | ⬜ pending |
| 01-02-02 | 02   | 1    | SRCH-01     | —          | N/A                                 | unit        | `npx vitest run test/input.test.ts`         | ❌ W0       | ⬜ pending |
| 01-02-03 | 02   | 1    | SRCH-02     | T-1-02     | escapeXml() escapes &, <, >, "      | unit        | `npx vitest run test/output.test.ts`        | ❌ W0       | ⬜ pending |
| 01-02-04 | 02   | 1    | PLUG-05     | —          | N/A                                 | unit        | `npx vitest run test/io-separation.test.ts` | ❌ W0       | ⬜ pending |
| 01-02-05 | 02   | 1    | CONF-04     | —          | N/A                                 | unit        | `npx vitest run test/logger.test.ts`        | ❌ W0       | ⬜ pending |
| 01-03-01 | 03   | 2    | CONF-01     | T-1-03     | API key never logged                | unit        | `npx vitest run test/config.test.ts`        | ❌ W0       | ⬜ pending |
| 01-03-02 | 03   | 2    | SRCH-04     | —          | N/A                                 | integration | `npx vitest run test/perplexity.test.ts`    | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — test framework configuration
- [ ] `test/manifest.test.ts` — stubs for PLUG-01
- [ ] `test/skills.test.ts` — stubs for PLUG-02, PLUG-03
- [ ] `test/input.test.ts` — stubs for PLUG-04, SRCH-01
- [ ] `test/output.test.ts` — stubs for SRCH-02
- [ ] `test/io-separation.test.ts` — stubs for PLUG-05
- [ ] `test/config.test.ts` — stubs for CONF-01
- [ ] `test/logger.test.ts` — stubs for CONF-04
- [ ] `test/perplexity.test.ts` — stubs for SRCH-04

---

## Manual-Only Verifications

| Behavior                                                  | Requirement | Why Manual                               | Test Instructions                                                                               |
| --------------------------------------------------------- | ----------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Plugin installs via `claude plugin add` and skills appear | PLUG-01     | Requires live Claude Code environment    | Run `claude plugin add /path/to/cc-websearch`, verify both skills appear in autocomplete        |
| Real Perplexity API returns valid results                 | SRCH-04     | Requires live API key and network access | Set PPLX_API_KEY, run `echo '{"query":"test"}' \| node scripts/websearch.js`, verify XML output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
