---
phase: 7
slug: update-readme-and-the-other-docs-if-necessary
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-21
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.6 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run check` (lint + typecheck + test + build) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test` or targeted command
- **Before `/gsd:verify-work`:** Full `npm run check` must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | — / — | — | N/A | manual doc review | `diff README.md` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | — / — | — | N/A | vitest (existing) | `npm test` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 1 | — / — | — | N/A | manual review | `diff .env.example` | ⬜ W0 | ⬜ pending |
| 07-03-01 | 03 | 1 | — / — | — | N/A | vitest + manual | `npm run check` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/structure.test.ts` — extend for dry-run plugin structure validation if tests don't already cover

*Existing tests (`manifest.test.ts`, `skills.test.ts`) already validate plugin.json and SKILL.md structure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| README content correctness | — | Content quality cannot be automated | Review rendered README for completeness, accuracy, clarity |
| .env.example accuracy | — | Mirrors config schema exactly | Compare against src/lib/config.ts fields |

---

## Validation Sign-Off

- [ ] All tasks have verification step
- [ ] Sampling continuity: no 3 consecutive tasks without verification
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
