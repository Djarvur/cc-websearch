---
phase: 11
slug: redirect-reliability
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-24
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js (CLI test harness) |
| **Config file** | None — test script in `tests/redirect-test.js` |
| **Quick run command** | `node tests/redirect-test.js` |
| **Full suite command** | `node tests/redirect-test.js` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Not applicable — test harness is the final task
- **After every plan wave:** Run `node tests/redirect-test.js`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | RDIR-01, RDIR-02 | T-11-01 / — | N/A — denial reason text | manual | `grep` check | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | RDIR-03, RDIR-04 | — | N/A — SKILL.md descriptions | manual | `grep` check | ✅ | ⬜ pending |
| 11-02-01 | 02 | 1 | RDIR-01, RDIR-02, RDIR-03, RDIR-04 | — | N/A — empirical validation | automated | `node tests/redirect-test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/redirect-test.js` — test harness script (invokes Claude Code CLI and parses tool_use events)
- [ ] `tests/` directory — if doesn't exist, create during Wave 0

*Test harness is the last deliverable but Wave 0 ensures the test runner exists.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Denial reason text matches D-03 | RDIR-01, RDIR-02 | File content check — simple grep | Run `grep` on `hooks/hooks.json` for exact D-03 strings |
| SKILL.md description matches D-05 | RDIR-03, RDIR-04 | File content check — simple grep | Run `grep` on SKILL.md files for replacement prefix |

*All other behaviors have automated verification via the redirect test harness.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
