# Phase 1: Plugin Foundation and Primary Search - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 1-Plugin Foundation and Primary Search
**Areas discussed:** Distribution strategy, Perplexity model default, WebFetch skill scope, Output format details

---

## Distribution Strategy

| Option                     | Description                                                                    | Selected |
| -------------------------- | ------------------------------------------------------------------------------ | -------- |
| Pre-compiled bundles       | esbuild bundles each script to single .js. Zero runtime deps, instant startup. | ✓        |
| Source + SessionStart hook | Ship .ts source. npm install into ${CLAUDE_PLUGIN_DATA} on first run.          |          |
| Both                       | tsx for dev, esbuild for prod bundles committed to repo.                       |          |

**User's choice:** Pre-compiled bundles
**Notes:** None

### Committed vs build-on-install

| Option           | Description                                         | Selected |
| ---------------- | --------------------------------------------------- | -------- |
| Commit bundles   | Compiled .js committed to repo. Install is instant. | ✓        |
| Build on install | Build during plugin install via post-install hook.  |          |

**User's choice:** Commit bundles
**Notes:** None

### Dev loop

| Option            | Description                                            | Selected |
| ----------------- | ------------------------------------------------------ | -------- |
| Manual rebuild    | Skills reference scripts/\*.js. Rebuild after changes. | ✓        |
| Dev mode with tsx | Skills check dev flag, run tsx on src/\*.ts.           |          |

**User's choice:** Manual rebuild
**Notes:** None

---

## Perplexity Model Default

| Option                      | Description                                                      | Selected |
| --------------------------- | ---------------------------------------------------------------- | -------- |
| sonar                       | Fast, cheap, $0.001/query. Good for frequent searches.           |          |
| sonar-pro                   | Higher quality, ~5x more expensive. Overkill for simple lookups. |          |
| Configurable, default sonar | PPLX_MODEL env var / config file, defaults to sonar.             | ✓        |

**User's choice:** Configurable, default sonar
**Notes:** None

---

## WebFetch Skill Scope

| Option             | Description                                                   | Selected |
| ------------------ | ------------------------------------------------------------- | -------- |
| Stub WebFetch      | Register both skills. WebFetch returns "not yet implemented". | ✓        |
| Skip until Phase 3 | Only WebSearch skill in Phase 1.                              |          |

**User's choice:** Stub WebFetch
**Notes:** Satisfies PLUG-03 as Phase 1 requirement.

---

## Output Format Details

### Result content

| Option            | Description                                        | Selected |
| ----------------- | -------------------------------------------------- | -------- |
| Include snippets  | Title + URL + description from Perplexity.         |          |
| Title + URL only  | Minimal XML format per SRCH-02.                    |          |
| Defer to research | Let researcher determine exact Claude Code format. | ✓        |

**User's choice:** Defer to research
**Notes:** Researcher will examine Claude Code's actual WebSearch output to determine precise format.

### Result count

| Option            | Description                                      | Selected |
| ----------------- | ------------------------------------------------ | -------- |
| All available     | Return all citations Perplexity provides (5-10). | ✓        |
| Fixed count       | Return a fixed number.                           |          |
| Defer to research | Let researcher determine.                        |          |

**User's choice:** All available
**Notes:** None

---

## Additional Gray Areas

User was presented with additional areas (error verbosity, logging approach, SessionStart hook, directory structure) and confirmed "everything clear" — deferred to Claude's discretion.

---

## Claude's Discretion

- Error message verbosity — balance helpful debugging vs clean output
- Logging approach for CONF-04 — simple level-prefixed stderr logging
- SessionStart hook — not needed in Phase 1 with pre-compiled bundles
- Directory structure — follow Claude Code plugin conventions

## Deferred Ideas

None — discussion stayed within phase scope.
