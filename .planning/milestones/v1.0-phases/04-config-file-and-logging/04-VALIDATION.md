---
phase: 4
slug: config-file-and-logging
status: completed
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                               |
| ---------------------- | ----------------------------------- |
| **Framework**          | vitest 4.1.6                        |
| **Config file**        | `vitest.config.ts`                  |
| **Quick run command**  | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime**  | ~10 seconds                         |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement      | Threat Ref | Secure Behavior                                                               | Test Type | Automated Command                                                                                  | File Exists | Status     |
| -------- | ---- | ---- | ---------------- | ---------- | ----------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- | ----------- | ---------- |
| 04-01-01 | 01   | 1    | CONF-02, CONF-03 | T-4-01     | Zod strictObject rejects unknown keys; malformed JSON warns and uses defaults | unit      | `npx vitest run test/config.test.ts --reporter=verbose`                                            | ✅          | ✅ green |
| 04-01-02 | 01   | 1    | CONF-02, CONF-03 | —          | N/A                                                                           | unit      | `npx vitest run test/config.test.ts --reporter=verbose`                                            | ✅          | ✅ green |
| 04-02-01 | 02   | 2    | D-08, D-09, D-10 | T-4-01     | API key from config not logged                                                | unit      | `npx vitest run test/logger.test.ts test/retry.test.ts test/perplexity.test.ts --reporter=verbose` | ✅          | ✅ green |
| 04-02-02 | 02   | 2    | CONF-02, CONF-03 | —          | N/A                                                                           | unit      | `npx vitest run --reporter=verbose`                                                                | ✅          | ✅ green |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [x] `test/config.test.ts` — exists, needs expansion for loadConfig, env override, missing file, invalid values, unknown keys
- [x] `test/logger.test.ts` — exists, needs refactor for createLogger factory pattern
- [x] `test/retry.test.ts` — exists, needs env var stub updates
- [x] `test/perplexity.test.ts` — exists, needs env var stub updates

_Existing infrastructure covers all phase requirements. Wave 0 is pre-satisfied._

---

## Manual-Only Verifications

| Behavior                                                                       | Requirement | Why Manual                                    | Test Instructions                                                                              |
| ------------------------------------------------------------------------------ | ----------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Config file at `~/.config/websearch/config.json` loads correctly in production | CONF-02     | Requires real filesystem outside test sandbox | Create config file, run `node scripts/websearch.js` with a query, verify config values applied |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-21
