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

- **After every task commit:** Run `npm test` or targeted grep command
- **Before `/gsd:verify-work`:** Full `npm run check` must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Automated Command | File Exists | Status |
|---------|------|------|-------------------|-------------|--------|
| 07-01-1 | 01 | 1 | `grep -c 'webfetch\\.cjs' skills/webfetch/SKILL.md && npm test -- test/skills.test.ts` | ✅ | ⬜ pending |
| 07-01-2 | 01 | 1 | `grep -c 'WEBSEARCH_RETRY_MAX_RETRIES' .env.example && ... && ! grep -c -i 'PPLX\\|PERPLEXITY' .env.example` | ⬜ W0 | ⬜ pending |
| 07-01-3 | 01 | 1 | human review (checkpoint) | ⬜ W0 | ⬜ pending |
| 07-02-1 | 02 | 2 | `npm test -- test/skills.test.ts && npm test -- test/manifest.test.ts` | ✅ | ⬜ pending |
| 07-02-2 | 02 | 2 | `npm run check` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — existing test infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Why Manual | Test Instructions |
|----------|------------|-------------------|
| README content correctness (Task 07-01-3) | Content quality cannot be automated | Review rendered README for completeness, accuracy, clarity per acceptance criteria checklist |
| .env.example accuracy (Task 07-01-2) partial | Automated grep covers field presence; human check verifies values | Compare grep output against src/lib/config.ts fields |

---

## Validation Sign-Off

- [ ] All tasks have verification step (automated or checkpoint)
- [ ] Sampling continuity: no 3 consecutive tasks without verification
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
