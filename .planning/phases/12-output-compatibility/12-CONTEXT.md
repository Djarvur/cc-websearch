# Phase 12: Output & Compatibility - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify plugin output is functionally correct (well-formed XML for WebSearch, readable markdown for WebFetch), WebFetch truncation matches expected 100KB behavior, and the plugin works identically across Claude Code providers. Covers requirements OUTP-01 through OUTP-04.

No structural changes to CLI scripts, no new runtime dependencies. This is a verification/validation phase over existing code.

</domain>

<decisions>
## Implementation Decisions

### WebFetch Output Format (OUTP-02)
- **D-01:** Built-in WebFetch returns bare markdown to stdout (no XML wrapper). Plugin already matches this format — raw markdown via Readability + Turndown pipeline.
- **D-02:** No format changes needed for WebFetch output. Current behavior is correct.

### Format Reference Source (OUTP-01, OUTP-02)
- **D-03:** Verification uses **well-formedness + usability** standard — not byte-for-byte comparison with built-in tools (inaccessible for direct comparison).
- **D-04:** WebSearch: output must be valid, parseable XML with correct tag structure (`<search_results>`, `<result>`, `<title>`, `<url>`, `<snippet>`). No provider comment.
- **D-05:** WebFetch: output must be readable markdown that Claude can consume (non-empty for valid inputs, proper ATX headings, fenced code blocks, GFM tables).

### Verification Methodology (OUTP-01, OUTP-02, OUTP-04)
- **D-06:** Behavioral verification via **Phase 11-style automated harness** — Claude Code CLI sends prompts and checks Claude's response for correct output consumption.
- **D-07:** Pass threshold: Claude cites search results in its response (proves format is readable by Claude).
- **D-08:** Test prompts reuse Phase 11's 8 prompt patterns (4 search + 4 fetch).
- **D-09:** No empirical comparison against live built-in tool — built-in WebSearch/WebFetch not accessible in a clean-room session.

### Cross-Provider Scope (OUTP-03)
- **D-10:** Verification = code review (no provider-specific code paths) + documentation check (hooks are Claude Code framework feature, not provider-dependent).
- **D-11:** Plugin has zero provider-specific code — DDG-only, CLI tool, no knowledge of which provider Claude uses.
- **D-12:** Hooks assumed compatible across all providers (Anthropic, OpenAI-compatible, self-hosted). No provider-specific integration testing.

### Error Output Parity
- **D-13:** Current error behavior is correct — errors go to stderr, exit code 1. No changes needed.
- **D-14:** No stdout error message needed. Current IO separation (stdout=data, stderr=logs/errors) matches standard CLI practice.

### Truncation Behavior (OUTP-04)
- **D-15:** Existing unit test (`test/content.test.ts` truncation tests) is sufficient for verification.
- **D-16:** Plugin truncates at 100KB with `[... content truncated ...]` marker. Marker appears at end. Edge cases (exactly 100KB, just over) already covered.
- **D-17:** No additional truncation tests needed.

### Claude's Discretion
- Test harness implementation details (exact script structure, how to detect search result citation in Claude's response).
- Whether to add additional structural assertions to existing output tests as supplementary verification.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/REQUIREMENTS.md` — OUTP-01 through OUTP-04 requirements, traceability to phase 12
- `.planning/ROADMAP.md` — Phase 12 goal, success criteria, dependency on Phase 11

### Prior Phase Context
- `.planning/phases/10-hook-infrastructure/10-CONTEXT.md` — Phase 10 decisions on hook structure, deny output format
- `.planning/phases/11-redirect-reliability/11-CONTEXT.md` — Phase 11 decisions on denial reason text, test harness patterns

### Project State
- `.planning/PROJECT.md` — Core value, key decisions, v1.2 goals
- `.planning/STATE.md` — Current session state, deferred items

### Existing Assets (under verification)
- `src/lib/output.ts` — Search result XML formatting (`<search_results>` with `<result>` children)
- `src/lib/content.ts` — Content extraction with 100KB truncation (`MAX_CONTENT_SIZE = 100_000`)
- `src/websearch.ts` — WebSearch main script (stdin → DDG → stdout XML)
- `src/webfetch.ts` — WebFetch main script (stdin → fetch → stdout markdown)
- `src/types.ts` — `SearchResult` interface (title, url, snippet)

### Existing Tests (under verification)
- `test/output.test.ts` — Output format tests (XML tag structure, entity escaping, no provider comment)
- `test/content.test.ts` — Content extraction tests (Readability, Turndown, 100KB truncation, GFM tables)
- `test/websearch.test.ts` — WebSearch pipeline tests (DDG flow, IO separation)
- `test/webfetch.test.ts` — WebFetch pipeline tests (fetch flow, markdown output, redirect handling)

### Existing Skill Config (no changes expected)
- `skills/websearch/SKILL.md` — WebSearch skill definition
- `skills/webfetch/SKILL.md` — WebFetch skill definition
- `.claude-plugin/hooks/hooks.json` — Current deny hooks

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/output.ts` — `formatSearchResults()` produces XML format that works for Claude consumption. Existing unit tests validate tag structure, entity escaping, empty states.
- `src/lib/content.ts` — `extractMarkdown()` with `MAX_CONTENT_SIZE = 100_000` already implements OUTP-04 truncation. Truncation marker `[... content truncated ...]` appended at cutoff.

### Established Patterns
- IO separation: stdout = data only, stderr = logs/errors (established Phase 1)
- Phase 11 test harness pattern: Claude Code CLI automation comparing tool_call sequences. Phase 12 can reuse/adapt the harness pattern for behavioral verification.
- Error handling: catch-all `try/catch` → logger.error + `process.exitCode = 1`. No stdout error output.

### Integration Points
- Behavioral verification harness connects to same Claude Code CLI entry point as Phase 11 test
- No changes to `src/`, `skills/`, or `.claude-plugin/` files expected — pure verification phase

</code_context>

<specifics>
## Specific Ideas

- "As we could not make the working session with embedded websearch and webfetch we have to revise verification strategy: no empirical tests against built-in tools."
- Built-in tool output format is determined through well-formedness + usability standard, not byte-for-byte comparison.
- WebFetch returns bare markdown (not structured JSON) — confirmed as design assumption.
- Test prompts should reuse Phase 11's 4 search + 4 fetch patterns for consistency.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-Output & Compatibility*
*Context gathered: 2026-05-24*
