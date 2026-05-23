---
phase: 10
slug: hook-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-23
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification — no code changes |
| **Config file** | None — phase is pure JSON configuration |
| **Quick run command** | `python3 -m json.tool .claude-plugin/hooks/hooks.json .claude-plugin/plugin.json` |
| **Full suite command** | `python3 -m json.tool .claude-plugin/hooks/hooks.json .claude-plugin/plugin.json` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run JSON validity check
- **After every plan wave:** Run JSON validity check + functional test (install plugin)
- **Before `/gsd:verify-work`:** Must pass manually
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | HOOK-01 | — / — | N/A — deny reason text, no privileges | manual | `python3 -m json.tool` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | HOOK-02 | — / — | N/A — deny reason text, no privileges | manual | `python3 -m json.tool` | ✅ | ⬜ pending |
| 10-02-01 | 01 | 1 | HOOK-03 | — / — | N/A — inline command, no script | manual | `python3 -m json.tool` | ✅ | ⬜ pending |
| 10-02-02 | 01 | 1 | HOOK-04 | — / — | N/A — case sensitivity in matchers | manual | `python3 -m json.tool` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hook denies WebSearch with redirect | HOOK-01 | Hook behavior depends on Claude Code runtime — no CLI test | Install plugin in Claude Code, invoke WebSearch, verify denial with redirect reason |
| Hook denies WebFetch with redirect | HOOK-02 | Hook behavior depends on Claude Code runtime — no CLI test | Install plugin in Claude Code, invoke WebFetch, verify denial with redirect reason |
| No external shell scripts or jq | HOOK-03 | Structural inspection | Verify hooks.json contains inline `echo` commands, no script references |
| Exact case-sensitive matchers | HOOK-04 | Structural inspection | Verify hook matchers use `WebSearch` and `WebFetch` (not lowercase variants) |

---

## Validation Sign-Off

- [ ] All tasks have manual verify (no code changes — CLI tests not applicable)
- [ ] Sampling continuity: N/A (single wave)
- [ ] Wave 0 covers all MISSING references: not applicable
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
