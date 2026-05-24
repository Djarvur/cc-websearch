# Phase 11: Redirect Reliability - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 11-redirect-reliability
**Areas discussed:** Denial reason text, SKILL.md descriptions, Testing strategy, Dynamic denial reason

---

## Denial Reason Text

| Option | Description | Selected |
|--------|-------------|----------|
| Keep short | Current length is fine. Claude sees the tool was denied and the reason names exactly which skill to use. | ✓ |
| Medium length | 2-3 sentences. Name the skill, state it's the replacement, and briefly mention how to invoke it. | |
| Full instructional | 5+ sentences with sub-steps. Maximum guidance reduces misinterpretation. | |

**User's choice:** Keep short

| Option | Description | Selected |
|--------|-------------|----------|
| Keep as-is | 'Use cc-websearch:websearch Skill tool instead.' is clear enough. | ✓ |
| Tweak slightly | Minor improvement with 'the' or stronger action verb. | |
| Add purpose | 'Built-in WebSearch not available. Use cc-websearch:websearch Skill instead.' | |

**User's choice:** Keep as-is (basic structure)

| Option | Description | Selected |
|--------|-------------|----------|
| No, terse is fine | Current text already tells Claude what to do. | |
| Yes, add context | 'WebSearch tool is unavailable. Use cc-websearch:websearch Skill tool instead.' — clarifies WHY. | ✓ |

**User's choice:** Yes, add context

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, that's it | Two clauses, still terse, adds 'unavailable' context. | ✓ |
| Slightly different | User has different wording in mind. | |

**User's choice:** Confirmed the exact revision: "WebSearch tool is unavailable. Use cc-websearch:websearch Skill instead."

**Notes:** User wanted short denial with "unavailable" context. The revised text is two clauses — still terse but adds context about why the tool was denied.

---

## SKILL.md Descriptions

| Option | Description | Selected |
|--------|-------------|----------|
| Add 'replacement' tag | Prefix: 'Replacement for built-in WebSearch — search the web using DuckDuckGo.' | ✓ |
| Full explanatory | 'Replacement for built-in WebSearch when that tool is unavailable. Search the web using DuckDuckGo.' | |
| Soft integration | Keep current functional description. Claude discovers replacement context from denial reason. | |

**User's choice:** Add 'replacement' tag

| Option | Description | Selected |
|--------|-------------|----------|
| Body stays same | Just update the description field. Body is sufficient. | |
| Add replacement note | Add a line at top of body about replacement. | |
| Restructure for redirect | Reorganize SKILL.md so first thing Claude sees is the replacement message. | ✓ |

**User's choice:** Restructure for redirect

| Option | Description | Selected |
|--------|-------------|----------|
| Same tools | Bash(node *) is sufficient. | ✓ |
| Add tool access | Claude may need additional tools after denial. | |

**User's choice:** Same tools — no changes to allowed-tools

**Notes:** User wants replacement-first SKILL.md: description field prefixed with "Replacement for...", body reorganized to lead with replacement message, then usage instructions. No tool permission changes.

---

## Testing Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Manual testing session | Run structured testing in Claude Code with 8 prompts. Quick, real results, subjective. | |
| Empirical API testing | Use Claude Code CLI/API to script prompts, capture tool_call sequences, analyze results. | ✓ |
| Config verification only | Verify SKILL.md and hooks.json correctness. Reliability is model-dependent. | |

**User's choice:** Empirical API testing

| Option | Description | Selected |
|--------|-------------|----------|
| Must be 8/8 | All 4 search + 4 fetch prompts must result in skill invocation. | ✓ |
| 7/8 acceptable | One failure mode acceptable — note and flag for future tuning. | |
| 14/16 across 2 rounds | Run each prompt twice. More data points. | |

**User's choice:** Must be 8/8

| Option | Description | Selected |
|--------|-------------|----------|
| Improve denial reason | Tweak denial reason text for failing patterns. | ✓ |
| Switch to Node.js hook | Upgrade to script hook for richer denial context. | |
| Add Bash blocking | Block curl/wget web requests via Bash hook. | |

**User's choice:** Improve denial reason (escalating approach)

| Option | Description | Selected |
|--------|-------------|----------|
| Test script + instructions | Create script listing prompts and expected outcomes. Manual execution. | |
| Automated test suite | Node script invoking Claude Code CLI, capturing tool_call sequences. | ✓ |
| Just run it as UAT | No separate test script, verify during Phase 11 UAT. | |

**User's choice:** Automated test suite

**Notes:** Strict testing bar (8/8). Automated CLI-based test suite. Remediation via denial reason improvement only — no Node.js hook or Bash blocking as first-line fix.

---

## Dynamic Denial Reason

| Option | Description | Selected |
|--------|-------------|----------|
| Keep static, drop | Short denial works. Inline echo stays. | ✓ |
| Add dynamic query | Include original query in denial reason. | |
| Defer again | Keep static for Phase 11, revisit if tests fail. | |

**User's choice:** Keep static, drop

**Notes:** Dynamic denial reason formally dropped. Inline echo stays. If empirical testing reveals failures, remediation is denial reason text improvement, not dynamic query/URL inclusion.

---

## Claude's Discretion

- **Test prompt selection** — Specific phrasing of the 8 test prompts (4 search, 4 fetch). Claude may choose appropriate representative prompts per category.
- **SKILL.md restructuring** — Exact layout and wording within the agreed "replacement-first" structure.

## Deferred Ideas

- **Bash web-bypass blocking** — Adding PreToolUse hook for Bash that detects curl/wget. Deferred from Phase 10. Keep deferred — only implement if empirical testing shows Bash fallback as common failure mode.
- **Dynamic denial reason with query/URL** — Dropped for Phase 11. Revisit only if static reason becomes unreliable in future.
- **Node.js script hook** — Not needed. Inline echo stays.
