# Roadmap: cc-websearch

## Overview

Build a Claude Code plugin that replaces the built-in WebSearch and WebFetch tools with DuckDuckGo as the sole search provider. The journey starts with a working plugin skeleton and Perplexity-powered search, adds resilience through DDG fallback and domain filtering, delivers the independent WebFetch content pipeline, adds config file support and configurable logging, transitions to DDG-only with citations, establishes CI and E2E tests, completes documentation, and closes tech debt.

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-05-22)
- 🚧 **v1.1 Plugin Distribution** — Phase 9 (in progress)

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

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Plugin Foundation and Primary Search | v1.0 | 2/2 | Complete | 2026-05-19 |
| 2. Search Resilience | v1.0 | 3/3 | Complete | 2026-05-20 |
| 3. WebFetch Content Pipeline | v1.0 | 2/2 | Complete | 2026-05-20 |
| 4. Config File and Logging | v1.0 | 3/3 | Complete | 2026-05-20 |
| 5. DDG-Only with Citations | v1.0 | 2/2 | Complete | 2026-05-21 |
| 6. CI Pipeline and E2E Tests | v1.0 | 3/3 | Complete | 2026-05-21 |
| 7. Update README and verify plugin readiness | v1.0 | 2/2 | Complete | 2026-05-21 |
| 8. Close tech debt | v1.0 | 4/4 | Complete | 2026-05-21 |
| 9. Script relocation for plugin distribution | v1.1 | 1/1 | Planned | - |

### 🚧 v1.1 Plugin Distribution (In Progress)

### Phase 9: Script Relocation for Plugin Distribution

**Goal**: Compiled scripts are distributed alongside skill definitions so `claude plugin install` copies everything needed automatically. No more `${CLAUDE_PLUGIN_ROOT}/scripts/` dependency — each skill is self-contained.

**Mode**: mvp
**Depends on**: Phase 7 (uses existing bundle structure)
**Requirements**: DIST-01, DIST-02, DIST-03, DIST-04, DIST-05, DIST-06
**Success Criteria** (what must be TRUE):

1. `npm run build` outputs `skills/websearch/scripts/websearch.cjs` and `skills/webfetch/scripts/webfetch.cjs`
2. SKILL.md commands reference `${CLAUDE_PLUGIN_ROOT}/skills/<name>/scripts/<bundle>.cjs`
3. Old `scripts/` root directory deleted with no dangling references
4. All path-dependent tests pass with new locations
5. `npm run lint && npm run build && npm test` all pass

**Plans**: 1 plan

Plans:

- [x] 09-01: Update build output paths, SKILL.md refs, tests, and remove old scripts/ dir
