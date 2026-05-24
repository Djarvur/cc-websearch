# Phase 11: Redirect Reliability - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Making the denial reason text and skill descriptions effective enough that Claude reliably invokes plugin skills (websearch/webfetch) after built-in WebSearch and WebFetch tools are denied by PreToolUse hooks. Covers requirements RDIR-01 through RDIR-04.

This is a communication/behavioral layer on top of Phase 10's hook infrastructure — no structural changes to hook mechanism, no new runtime dependencies.

</domain>

<decisions>
## Implementation Decisions

### Denial Reason Text (RDIR-01, RDIR-02)
- **D-01:** Keep denial reason short — rejected full instructional text. Claude needs a clear redirect, not sub-step guidance.
- **D-02:** Existing short form is correct pattern. Tweak: add "unavailable" context clause.
- **D-03:** Revised denial reason for WebSearch: `"WebSearch tool is unavailable. Use cc-websearch:websearch Skill instead."` (same pattern for WebFetch: `"WebFetch tool is unavailable. Use cc-websearch:webfetch Skill instead."`)
- **D-04:** Inline echo hook stays — no Node.js script upgrade (dynamic denial reason dropped for Phase 11).

### SKILL.md Descriptions (RDIR-03, RDIR-04)
- **D-05:** Prefix descriptions with replacement tag: WebSearch becomes `"Replacement for built-in WebSearch — search the web using DuckDuckGo. Use this skill when the user needs current information, web search results, or to find web pages about a topic."`
- **D-06:** Restructure SKILL.md body to lead with replacement message — first paragraph states "This skill replaces the built-in WebSearch tool when unavailable." Then usage instructions follow.
- **D-07:** `allowed-tools: Bash(node *)` stays unchanged. No additional tool permissions needed.

### Testing Strategy
- **D-08:** Empirical API testing — automated test suite using Claude Code CLI to send prompts and capture tool_call sequences.
- **D-09:** Pass threshold: 8/8 — all 4 search patterns AND all 4 fetch patterns must result in skill invocation.
- **D-10:** Remediation for failures: improve denial reason text first (tweak wording for failing patterns). Escalate to Bash blocking only if denial tuning proves insufficient.
- **D-11:** Test harness is an automated suite (Node script invoking Claude Code CLI). Not manual session testing.

### Dynamic Denial Reason
- **D-12:** Dropped for Phase 11. Static inline echo is sufficient. Dynamic query/URL inclusion not needed.

### Claude's Discretion
- Test prompt selection details (specific phrasing of the 8 prompts) — Claude may choose appropriate representative prompts per category.
- SKILL.md restructuring specifics — Claude may determine exact layout and wording within the agreed "replacement-first" structure.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Requirements
- `.planning/REQUIREMENTS.md` — RDIR-01 through RDIR-04 requirements with traceability
- `.planning/ROADMAP.md` — Phase 11 goal, success criteria, dependency on Phase 10

### Prior Phase Context
- `.planning/phases/10-hook-infrastructure/10-CONTEXT.md` — Phase 10 decisions (D-05, D-06) and deferred ideas
- `.planning/phases/10-hook-infrastructure/10-RESEARCH.md` — Phase 10 research on hook mechanism, denial reason patterns, pitfalls (Pitfall 4: denial ignored by model)

### Project State
- `.planning/PROJECT.md` — Core value, key decisions, v1.2 goals
- `.planning/STATE.md` — Current session state, accumulated context

### Existing Assets (will be modified)
- `.claude-plugin/hooks/hooks.json` — Current deny hooks with old denial reason text
- `skills/websearch/SKILL.md` — WebSearch skill definition (needs description + body update)
- `skills/webfetch/SKILL.md` — WebFetch skill definition (needs description + body update)

### Existing Assets (unchanged)
- `.claude-plugin/plugin.json` — Plugin manifest referencing hooks (no change needed)
- `.claude/settings.json` — Existing PreToolUse hook patterns for reference

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.claude-plugin/hooks/hooks.json` — Inline echo hook format already in place. Only denial reason strings need updating.
- `.claude-plugin/plugin.json` — Already has `"hooks": "hooks/hooks.json"`. No manifest changes needed.

### Established Patterns
- Hook configuration uses `hookSpecificOutput` format with `permissionDecision: "deny"` (Phase 10 decision D-03)
- Two separate hook entries for WebSearch and WebFetch (Phase 10 decision D-04)
- Inline echo for hook command — trivially reliable, no script files (Phase 10 decision D-01)

### Integration Points
- `hooks/hooks.json` — Two `permissionDecisionReason` strings to update (one per hook entry)
- `skills/websearch/SKILL.md` — Frontmatter description field + body content to update
- `skills/webfetch/SKILL.md` — Frontmatter description field + body content to update

</code_context>

<specifics>
## Specific Ideas

- Phase 10 research (Pitfall 4) explicitly flagged "denial reason ignored by model" as the key risk for Phase 11.
- The research noted: "The denial reason is behavioral guidance — the model may follow it, retry the tool, fall back to Bash+curl, or ask the user."
- Empirical test suite is the primary mechanism to verify whether the static denial reason actually works.

</specifics>

<deferred>
## Deferred Ideas

- **Bash web-bypass blocking** — Adding PreToolUse hook for Bash that detects curl/wget web requests. Deferred from Phase 10. Keep deferred — only implement if empirical testing shows Bash fallback as a common failure mode.
- **Dynamic denial reason with query/URL** — Dropped for Phase 11 per D-12. Revisit in future if model behavior changes and static reason becomes unreliable.
- **Node.js script hook** — Not needed. Inline echo stays. Revisit only if dynamic denial is required in future.

</deferred>

---

*Phase: 11-Redirect Reliability*
*Context gathered: 2026-05-24*
