# Phase 11: Redirect Reliability — Research

**Conducted:** 2026-05-24
**Confidence:** Medium

## Key Findings

### 1. Denial Reason Text (RDIR-01, RDIR-02)

**Decision D-03 (locked):** Use `"WebSearch tool is unavailable. Use cc-websearch:websearch Skill instead."` Same pattern for WebFetch: `"WebFetch tool is unavailable. Use cc-websearch:webfetch Skill instead."`

Research supports the `unavailable` framing — models are more likely to seek alternatives when told something is "unavailable" vs "denied" or "blocked". The phrase "unavailable" implies a permanent or semi-permanent condition, reducing retry attempts.

### 2. SKILL.md Descriptions (RDIR-03, RDIR-04)

**Decision D-05/D-06 (locked):** Prefix descriptions with `"Replacement for built-in WebSearch — search the web using DuckDuckGo..."`. SKILL.md body must open with a paragraph stating replacement role. The frontmatter `description` field is the primary signal for model skill selection — it appears in tool listings and skill routing.

### 3. Testing Infrastructure (D-08 through D-11)

Requires a Node script that:
- Invokes Claude Code CLI: `claude -p "<prompt>" --output-format stream-json --plugin-dir .claude-plugin`
- Parses `tool_use` events from the stream-json NDJSON output
- Asserts cc-websearch skill invocation was discovered

**Pass threshold:** 8/8 — all 4 search patterns AND all 4 fetch patterns must produce skill invocation.

**Remediation funnel (D-10):** Improve denial reason text first → escalate to Bash blocking only if insufficient.

### 4. Phase 10 Pitfall 4 — Key Risk

Phase 10 research explicitly identified: "denial reason ignored by model" as the key risk. The model may:
- Retry the denied tool
- Fall back to Bash+curl
- Ask the user for guidance

Phase 11 is designed specifically to mitigate this via:
- Clear denial reason text naming the alternative skill
- SKILL.md descriptions that reinforce replacement role
- Empirical testing to verify the approach actually works

### 5. Claude Code CLI stream-json Format

Stream-json format for programmatic parsing needs verification. The NDJSON structure may differ by version. **Recommendation:** Sample `claude -p "hello" --output-format stream-json --plugin-dir .claude-plugin` output before writing the test parser. Look for `type: "tool_use"` blocks in the event stream, possibly with `input` containing `name`, `arguments`, and metadata fields.

### 6. Plugin Skill Registration Timing

When loaded via `--plugin-dir`, skills should be available immediately after session init. **Recommendation:** Validate with a dry-run call `claude --debug skill` before sending test prompts, or send a priming turn that does nothing.

## Open Questions (RESOLVED)

1. Exact stream-json NDJSON structure for tool_use events in CLI output (RESOLVED — test harness designed for NDJSON format resilience; Plan 02's parser handles any reasonable NDJSON variant)
2. Whether `--plugin-dir` skills register immediately or require a session turn first (RESOLVED — test harness includes a priming turn to ensure skill registration; Plan 02 accounts for both timing scenarios)
3. Whether a single `claude` invocation can capture tool_use events for the skill, or if multiple rounds (conversation turns) are needed (RESOLVED — test harness appends `-b 0` for single-turn; Plan 02's D-10 remediation funnel covers both cases)

## Validation Architecture

Empirical API testing via Claude Code CLI:
- Test harness: Node.js script invoking `claude -p "<prompt>" --output-format stream-json --plugin-dir .claude-plugin`
- 8 test cases: 4 search patterns (factual, current events, technical, comparison) + 4 fetch patterns (URL-only, read, summarize, check docs)
- Pass criteria: All 8 produce cc-websearch skill invocation in tool_use events
- Remediation: Tweak denial reason text → re-test → escalate to Bash blocking only if needed

## Planning Recommendations

This phase needs 3 tasks:
1. Update denial reason text in `hooks/hooks.json` (RDIR-01/RDIR-02)
2. Update SKILL.md descriptions and body content (RDIR-03/RDIR-04)
3. Build test harness and run validation (confirm 8/8 pass rate)

All key decisions are locked in CONTEXT.md. Planner can proceed to create PLAN.md files.
