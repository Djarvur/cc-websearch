---
phase: 05
slug: ddg-only-with-citations
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-21
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                  |
| ---------------------- | -------------------------------------- |
| **Framework**          | vitest 4.1.6                           |
| **Config file**        | none — uses package.json `test` script |
| **Quick run command**  | `npm test`                             |
| **Full suite command** | `npm test && npx tsc --noEmit`         |
| **Estimated runtime**  | ~3 seconds                             |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green, `tsc --noEmit` clean, `grep -r "perplexity" src/ test/` returns zero matches
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement      | Threat Ref | Secure Behavior      | Test Type   | Automated Command | File Exists | Status     |
| -------- | ---- | ---- | ---------------- | ---------- | -------------------- | ----------- | ----------------- | ----------- | ---------- |
| 05-01-01 | 01   | 1    | SRCH-01, SRCH-04 | —          | N/A                  | unit        | `npm test`        | ✅          | ✅ green |
| 05-01-02 | 01   | 1    | SRCH-04          | —          | escapeXml on snippet | unit        | `npm test`        | ✅          | ✅ green |
| 05-02-01 | 02   | 2    | SRCH-04          | —          | N/A                  | unit        | `npm test`        | ✅          | ✅ green |
| 05-02-02 | 02   | 2    | SRCH-04          | —          | N/A                  | integration | `npm test`        | ✅          | ✅ green |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-21
