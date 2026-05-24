---
phase: 11-redirect-reliability
plan: 02
subsystem: test
tags:
  - redirect
  - e2e
  - reliability
  - denial-reason
dependency_graph:
  requires:
    - 11-01 (denial reason and skill description updates)
  provides:
    - Automated redirect reliability test suite
  affects:
    - Phase 12 (WebFetch output format verification)
tech-stack:
  added:
    - vitest (e2e test runner)
    - Node.js child_process spawn
  patterns:
    - NDJSON stream-json parsing for claude CLI tool_use events
    - 180s per-test timeout for claude CLI invocations
key-files:
  created:
    - test/e2e/redirect-reliability.e2e.ts
  modified: []
decisions: []
metrics:
  duration: 211.72 seconds (test suite)
  completed_date: 2026-05-24
---

# Phase 11 Plan 02: Redirect Reliability E2E Test Suite

Create and run an automated redirect reliability test suite that empirically validates whether Claude invokes plugin skills after built-in tools are denied.

**One-liner:** Automated vitest e2e suite spawns claude CLI with 8 diverse prompts (4 search, 4 fetch), parses NDJSON stream-json output for tool_use events, and confirms cc-websearch skills were invoked after built-in tool denial -- achieving 8/8 pass rate per D-09.

## Task Results

### Task 1: Create redirect-reliability e2e test file (1e1752a)

- Created `test/e2e/redirect-reliability.e2e.ts` (217 lines, 6KB)
- Uses `spawn()` with args array (T-11-01 mitigation against subprocess command injection)
- No `exec()` or shell string usage
- 8 it() blocks: 4 search + 4 fetch, each with 180000ms (180s) timeout
- All prompts are hardcoded string literals -- no external input
- NDJSON parsing handles malformed lines gracefully (try/catch on JSON.parse)
- Auto-detected by vitest e2e runner (matches `test/e2e/**/*.e2e.ts` pattern)

### Task 2: Run test suite and report results

- Test suite ran successfully: 1 file, 8 tests, all PASSED
- Total duration: 211.72s (transform 39ms, setup 0ms, import 58ms, tests 211.30s)
- Pass rate: **8/8 per D-09 threshold** -- redirect reliability CONFIRMED

#### Individual test results

| # | Test Case | Result | Duration |
|---|-----------|--------|----------|
| 1 | Search: "What is the capital of Australia?" | PASS | 17.0s |
| 2 | Search: "latest AI news 2026" | PASS | 19.4s |
| 3 | Search: "TypeScript release notes" | PASS | 22.3s |
| 4 | Search: "PostgreSQL vs MongoDB comparison" | PASS | 24.9s |
| 5 | Fetch: "Fetch the content at https://example.com" | PASS | 19.4s |
| 6 | Fetch: "Read https://example.com and tell me what it contains" | PASS | 43.0s |
| 7 | Fetch: "Summarize the content at https://www.wikipedia.org" | PASS | 45.4s |
| 8 | Fetch: "Check the API documentation at https://jsonplaceholder.typicode.com" | PASS | 19.8s |

All 8 prompts from the plan produced the expected redirect behavior: built-in tool denied via PreToolUse hook, then cc-websearch skill invoked (search tests) or cc-websearch:webfetch skill invoked (fetch tests).

#### Observed tool call sequences (from diagnostic testing)

- **Search pattern:** WebSearch (denied) -> Skill(cc-websearch:websearch) -> Bash (plugin skill execution)
- **Fetch pattern:** WebFetch (denied) -> Skill(cc-websearch:webfetch)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fix spawn args to include --verbose flag**
- **Found during:** Task 1 verification
- **Issue:** The claude CLI requires `--verbose` when using `--output-format stream-json` with `-p` (short for `--print`). Without it, the CLI returns an error to stderr and produces no stream-json output on stdout.
- **Fix:** Added `--verbose` to the spawn args array in `runClaude()` helper
- **Files modified:** `test/e2e/redirect-reliability.e2e.ts`

**2. [Rule 1 - Bug] Fix NDJSON parsing for actual claude CLI stream-json format**
- **Found during:** Task 1 verification
- **Issue:** The initial implementation expected `tool_use` events at the top level of the NDJSON stream (`event.type === 'tool_use'`). In reality, the claude CLI's stream-json format nests tool_use events inside `assistant` messages at `event.message.content[].{type:"tool_use",...}`. Additionally, skill invocations use `name: "Skill"` with the actual skill identifier in `input.skill` (e.g., `"cc-websearch:websearch"`), not in the event's name field.
- **Fix:** Updated parsing logic to iterate `event.message.content` for `type: "tool_use"` items, and for `Skill` tool invocations, push `content.input.skill` instead of `content.name` to the toolNames array.
- **Files modified:** `test/e2e/redirect-reliability.e2e.ts`

### No Architectural Changes

No Rule 4 (architectural) deviations needed. The test structure, assertions, and parsing approach follow the plan's specifications. The two fixes above are within the scope of the plan's design.

## Known Stubs

None. The test file is fully functional with no placeholder values or unimplemented components.

## Threat Flags

No new security-relevant surface introduced. The test file uses spawn() with args array (T-11-01 mitigated), all prompts are hardcoded string literals, and no new dependencies are added.

## Self-Check: PASSED

- [x] File `test/e2e/redirect-reliability.e2e.ts` exists (217 lines, exceeds 120 minimum)
- [x] Uses spawn() with args array (2 occurrences, 0 exec occurrences)
- [x] 8 it() blocks with 180000ms timeouts
- [x] All 8 test cases discoverable by vitest (dry run confirmed)
- [x] Test suite exit code 0: all 8 tests passed (confirmed on 2 independent runs)
- [x] Commit 1e1752a exists for Task 1
- [x] No untracked files remaining
