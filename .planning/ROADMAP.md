# Roadmap: cc-websearch

## Overview

Build a Claude Code plugin that replaces the built-in WebSearch and WebFetch tools with DuckDuckGo as the sole search provider. The journey starts with a working plugin skeleton and Perplexity-powered search, adds resilience through DDG fallback and domain filtering, delivers the independent WebFetch content pipeline, adds config file support and configurable logging, transitions to DDG-only with citations, establishes CI and E2E tests, completes documentation, closes tech debt, relocates scripts for plugin distribution, and now intercepts built-in tool calls via PreToolUse hooks to redirect to plugin skills.

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-05-22)
- ✅ **v1.1 Plugin Distribution** — Phase 9 (shipped 2026-05-22)
- 🚧 **v1.2 Replace Built-in WebSearch/WebFetch** — Phases 10-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-8) — SHIPPED 2026-05-22</summary>

- [x] Phase 1: Plugin Foundation and Primary Search (2/2 plans) — completed 2026-05-19
- [x] Phase 2: Search Resilience (3/3 plans) — completed 2026-05-20
- [x] Phase 3: WebFetch Content Pipeline (2/2 plans) — completed 2026-05-20
- [x] Phase 4: Config File and Logging (3/3 plans) — completed 2026-05-20
- [x] Phase 5: DDG-Only with Citations (2/2 plans) — completed 2026-05-21
- [x] Phase 6: CI Pipeline and E2E Tests (3/3 plans) — completed 2026-05-21
- [x] Phase 7: Update README and verify plugin readiness (2/2 plans) — completed 2026-05-21
- [x] Phase 8: Close tech debt: update REQUIREMENTS.md, fix SUMMARY gaps, finalize Nyquist (4/4 plans) — completed 2026-05-21

</details>

<details>
<summary>✅ v1.1 Plugin Distribution (Phase 9) — SHIPPED 2026-05-22</summary>

- [x] Phase 9: Script Relocation for Plugin Distribution (1/1 plan) — completed 2026-05-22

</details>

### 🚧 v1.2 Replace Built-in WebSearch/WebFetch (In Progress)

**Milestone Goal:** Plugin automatically intercepts built-in WebSearch and WebFetch tool calls via PreToolUse hooks, denies them, and redirects Claude to use the plugin skills instead. Works on all providers.

- [x] **Phase 10: Hook Infrastructure** - PreToolUse hooks in plugin.json deny built-in WebSearch and WebFetch (completed 2026-05-23)
- [ ] **Phase 11: Redirect Reliability** - Denial reasons and skill descriptions reliably redirect Claude to plugin skills
- [ ] **Phase 12: Output & Compatibility** - Output format verified, content truncation matched, cross-provider validated

## Phase Details

### Phase 10: Hook Infrastructure

**Goal**: Built-in WebSearch and WebFetch tool calls are automatically intercepted and denied when the plugin is installed
**Depends on**: Phase 9 (plugin distribution structure)
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04
**Success Criteria** (what must be TRUE):

  1. Installing the plugin causes all built-in WebSearch tool calls to be denied with a redirect reason
  2. Installing the plugin causes all built-in WebFetch tool calls to be denied with a redirect reason
  3. Hook configuration is self-contained in plugin.json with no external shell scripts or jq dependency
  4. Hook matchers use exact case-sensitive tool names (WebSearch|WebFetch) — lowercase matchers are absent

**Plans**: 1 plan

Plans:

- [x] 10-01-PLAN.md — Create PreToolUse deny hooks for built-in WebSearch and WebFetch

### Phase 11: Redirect Reliability

**Goal**: After built-in tools are denied, Claude reliably invokes the plugin skills instead of retrying, falling back to Bash, or asking the user
**Depends on**: Phase 10
**Requirements**: RDIR-01, RDIR-02, RDIR-03, RDIR-04
**Success Criteria** (what must be TRUE):

  1. Claude invokes the plugin's websearch skill after built-in WebSearch is denied, across diverse search prompt patterns (factual questions, current events, technical queries, comparison requests)
  2. Claude invokes the plugin's webfetch skill after built-in WebFetch is denied, across diverse fetch prompt patterns (URL-only, "read this page", "summarize this article", "check this documentation")
  3. WebSearch SKILL.md description explicitly states it is the replacement for built-in WebSearch when that tool is unavailable
  4. WebFetch SKILL.md description explicitly states it is the replacement for built-in WebFetch when that tool is unavailable

**Plans**: 2 plans

Plans:
**Wave 1**

- [ ] 11-01-PLAN.md — Update denial reason text and skill descriptions for redirect reliability

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 11-02-PLAN.md — Create and run redirect reliability e2e test harness

### Phase 12: Output & Compatibility

**Goal**: Plugin output matches built-in tool output format and the plugin works identically across all Claude Code providers
**Depends on**: Phase 11
**Requirements**: OUTP-01, OUTP-02, OUTP-03, OUTP-04
**Success Criteria** (what must be TRUE):

  1. WebSearch skill output (XML with title, url, snippet) matches the format Claude expects after a built-in tool denial
  2. WebFetch skill output (markdown content) matches the format Claude expects after a built-in tool denial
  3. Plugin operates identically on Anthropic, OpenAI-compatible, and self-hosted providers — no provider-specific behavior
  4. WebFetch truncates fetched content at 100KB to match built-in tool behavior

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 10 → 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Plugin Foundation and Primary Search | v1.0 | 2/2 | Complete | 2026-05-19 |
| 2. Search Resilience | v1.0 | 3/3 | Complete | 2026-05-20 |
| 3. WebFetch Content Pipeline | v1.0 | 2/2 | Complete | 2026-05-20 |
| 4. Config File and Logging | v1.0 | 3/3 | Complete | 2026-05-20 |
| 5. DDG-Only with Citations | v1.0 | 2/2 | Complete | 2026-05-21 |
| 6. CI Pipeline and E2E Tests | v1.0 | 3/3 | Complete | 2026-05-21 |
| 7. Update README and verify plugin readiness | v1.0 | 2/2 | Complete | 2026-05-21 |
| 8. Close tech debt | v1.0 | 4/4 | Complete | 2026-05-21 |
| 9. Script Relocation for Plugin Distribution | v1.1 | 1/1 | Complete | 2026-05-22 |
| 10. Hook Infrastructure | v1.2 | 1/1 | Complete   | 2026-05-23 |
| 11. Redirect Reliability | v1.2 | 0/2 | Not started | - |
| 12. Output & Compatibility | v1.2 | 0/? | Not started | - |
