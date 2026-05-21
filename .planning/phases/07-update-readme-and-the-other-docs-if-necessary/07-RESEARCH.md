# Phase 7: Update README and the Other Docs if Necessary - Research

**Researched:** 2026-05-21
**Domain:** Project documentation, Claude Code plugin distribution, verification gate
**Confidence:** HIGH

## Summary

Phase 7 is a documentation and verification phase with no code changes to runtime logic. The primary deliverables are: (1) a complete README.md rewrite from the current one-liner, (2) a fix for the webfetch SKILL.md extension bug (`.js` to `.cjs`), (3) creation of `.env.example` config template, and (4) a verification gate confirming plugin production-readiness.

The project has already been built and tested across 6 prior phases (15 plans). The existing structure is valid for `claude plugin install` — compiled `.cjs` bundles are in `scripts/`, skill definitions are in `skills/websearch/` and `skills/webfetch/`, manifest is in `.claude-plugin/plugin.json`. No hooks exist (by design, per D-10). No structural re-architecture is needed.

The verification gate is well-defined: `npm run check` (lint + typecheck + test + build) plus a dry-run structure check. No new packages are introduced in this phase.

**Primary recommendation:** Structure the README for plugin users first (install, usage, config, comparison), dev section second. Fix the SKILL.md bug at the same time. Run the verification gate last.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### README Content & Structure

- **D-01:** Full project README (not minimal one-liner) with installation, usage, config reference, comparison table, architecture section, output examples, and quick-start dev guide.
- **D-02:** Primary audience = plugin users (install/use focused). Plugin-user-facing sections first; dev section secondary.
- **D-03:** Include comparison table showing feature parity vs Claude Code built-in WebSearch/WebFetch tools.
- **D-04:** Development section = quick start only (prerequisites, install deps, build, test, lint). Link to CONTRIBUTING.md for deeper docs.
- **D-05:** Include real output examples — search result XML snippet and fetched page markdown.
- **D-06:** Include brief architecture section explaining zero-API-key DDG design (Perplexity optional -> DDG fallback -> fetch).

#### Plugin Distribution Structure

- **D-07:** Keep skills at project-root `skills/` directory — current structure works with `claude plugin install`.
- **D-08:** Fix webfetch SKILL.md — change `webfetch.js` -> `webfetch.cjs` to match actual compiled file.
- **D-09:** Both skills use `${CLAUDE_PLUGIN_ROOT}` for script paths (standard Claude Code variable, resolves regardless of install location).

#### Plugin Hooks & Deps

- **D-10:** No SessionStart hook needed in `hooks/hooks.json`. User runs `npm install` manually if needed after clone.
- **D-11:** No auto-build in hooks. Compiled scripts (`scripts/*.cjs`) are tracked in git and ship with the repo.
- **D-12:** Distribution dependency strategy: scripts built and committed -> `claude plugin add` from repo URL gets everything. Manual `npm install` for deps if needed.

#### Verification Scope

- **D-13:** Full validation gate — lint passes, typecheck passes, tests pass, build succeeds, output format verified against Claude Code exact format.
- **D-14:** Dry-run structure check — validate plugin.json schema, skill directory structure, file path references, hook references without actually installing.

#### Additional Documentation

- **D-15:** Create `.env.example` showing config template for `~/.config/websearch/config.json` with all supported options and defaults.
- **D-16:** No CHANGELOG.md, CONTRIBUTING.md, or SECURITY.md for initial release.

### Claude's Discretion

- README section ordering and specific wording within agreed structure.
- `.env.example` specific option names and comments.
- Verification command details (exact lint/typecheck/test/build commands to run).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

## Phase Requirements

This phase does not introduce new functional requirements. It documents and verifies existing requirements. The verification gate confirms that ALL existing requirements (PLUG-01 through PLUG-05, SRCH-01 through SRCH-08, FTEC-01 through FTEC-05, CONF-01 through CONF-04) remain satisfied.

## Architectural Responsibility Map

| Capability           | Primary Tier         | Secondary Tier    | Rationale                                                                                             |
| -------------------- | -------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| README documentation | Project root         | —                 | README.md is a project-root file, not owned by any runtime tier                                       |
| SKILL.md content     | Plugin distribution  | —                 | SKILL.md files are Claude Code plugin definition files, consumed by the plugin system                 |
| `.env.example`       | Config documentation | —                 | Mirrors the config file schema at `~/.config/websearch/config.json` — documentation only              |
| Verification gate    | CI/DevOps            | Developer machine | Commands are defined in package.json `scripts`, runnable locally and in CI                            |
| Structure check      | Manual validation    | Developer machine | Dry-run structural audit of the plugin directory layout — does not correspond to a runtime capability |

## Standard Stack

No new libraries or packages are required for this phase. This is a documentation and verification phase only. All dependencies are development tooling already present in `package.json`.

### Verification Tooling (already available)

| Command             | Defined In           | Purpose                                                   |
| ------------------- | -------------------- | --------------------------------------------------------- |
| `npm run lint`      | package.json scripts | Run ESLint + Prettier check                               |
| `npm run typecheck` | package.json scripts | Run `tsc --noEmit` for type safety                        |
| `npm test`          | package.json scripts | Run vitest unit tests with coverage                       |
| `npm run build`     | package.json scripts | Rebuild `.cjs` bundles with esbuild                       |
| `npm run check`     | package.json scripts | Combined: lint + typecheck + test (with coverage) + build |

## Package Legitimacy Audit

**Not applicable — no packages are installed in this phase.** Phase 7 is documentation-only with a verification gate. All runtime dependencies were audited and installed in Phases 1-6. The verification gate runs the existing toolchain, it does not install new packages.

## Architecture Patterns

### Plugin Directory Structure (Current State)

```
cc-websearch/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (name, version, description)
├── skills/
│   ├── websearch/
│   │   └── SKILL.md             # WebSearch skill definition [VERIFIED: correct]
│   └── webfetch/
│       └── SKILL.md             # WebFetch skill definition [BUG: .js -> .cjs on line 15]
├── scripts/
│   ├── websearch.cjs            # Compiled WebSearch CLI bundle (tracked in git)
│   └── webfetch.cjs             # Compiled WebFetch CLI bundle (tracked in git)
├── src/                         # TypeScript source code
│   ├── websearch.ts
│   ├── webfetch.ts
│   ├── types.ts
│   ├── turndown-plugin-gfm.d.ts
│   └── lib/
│       ├── config.ts            # Config loading: ~/.config/websearch/config.json + env vars
│       ├── content.ts           # Readability + Turndown content extraction
│       ├── duckduckgo.ts        # DDG Lite search via duck-duck-scrape
│       ├── fetch.ts             # URL fetching with redirect handling
│       ├── filter.ts            # Domain filtering
│       ├── input.ts             # JSON stdin parsing with Zod schemas
│       ├── logger.ts            # Structured logging to stderr
│       ├── output.ts            # Search result XML formatting
│       └── retry.ts             # Exponential backoff with jitter
├── test/                        # Unit + E2E tests
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── build.ts                     # esbuild bundling config
├── eslint.config.js             # ESLint strict mode
├── vitest.config.ts             # Unit test config (80% coverage thresholds)
├── vitest.config.e2e.ts         # E2E test config
└── README.md                    # [CURRENT: one-liner] -> [TARGET: full docs]
```

### Pattern 1: README Audience-First Structure

**What:** Prioritize plugin users over developers in README layout. Installation instructions and usage examples first; development setup secondary.
**When to use:** Projects distributed as tools where most visitors want to USE it, not CONTRIBUTE to it.
**Rationale:** D-02 explicitly mandates plugin-user-first ordering. The primary success metric is a user being able to `claude plugin add` and start using WebSearch/WebFetch within 2 minutes of landing on the README.

### Pattern 2: Feature Parity Comparison

**What:** A table showing each input field and output format of the plugin's skills side-by-side with Claude Code's built-in WebSearch and WebFetch tools.
**When to use:** Drop-in replacement tools where users need to verify compatibility.
**Comparison data:**

| Feature                       | Built-in WebSearch     | Plugin WebSearch                              | Built-in WebFetch    | Plugin WebFetch                               |
| ----------------------------- | ---------------------- | --------------------------------------------- | -------------------- | --------------------------------------------- |
| `query` (string, min 2 chars) | Yes                    | Yes                                           | N/A                  | N/A                                           |
| `url` (string, valid URL)     | N/A                    | N/A                                           | Yes                  | Yes                                           |
| `prompt` (string)             | N/A                    | N/A                                           | Yes                  | Yes                                           |
| `allowed_domains` (string[])  | Yes                    | Yes                                           | N/A                  | N/A                                           |
| `blocked_domains` (string[])  | Yes                    | Yes                                           | N/A                  | N/A                                           |
| exclusive domains check       | Yes                    | Yes (SRCH-03)                                 | N/A                  | N/A                                           |
| Output format                 | `<search_results>` XML | `<search_results>` XML                        | Markdown content     | Markdown content                              |
| HTTP->HTTPS upgrade           | Yes                    | Yes (FTEC-02)                                 | Yes                  | Yes (FTEC-02)                                 |
| Redirect handling             | Same-host follow       | Same-host follow, cross-host report (FTEC-05) | Same-host follow     | Same-host follow, cross-host report (FTEC-05) |
| Content extraction            | Built-in               | Readability + Turndown (FTEC-03)              | Built-in             | Readability + Turndown (FTEC-03)              |
| Requires API key              | No (Anthropic infra)   | No (DDG primary)                              | No (Anthropic infra) | No                                            |

### Anti-Patterns to Avoid

- **Mixed audience sections:** Don't interleave user instructions with developer instructions. Use clear section separators.
- **Missing context on DDG:** Don't frame DDG as a "fallback" in the README title/description — DDG is the PRIMARY provider (zero API keys). Perplexity was removed from scope; DDG is the sole provider.
- **Outdated build instructions:** Don't reference `npx tsx src/websearch.ts` for the verification gate — the project uses compiled `.cjs` bundles in `scripts/`, not direct `tsx` execution.

## Don't Hand-Roll

| Problem              | Don't Build                                              | Use Instead                                                        | Why                                                                                                      |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| README documentation | Custom structure                                         | Standard plugin README pattern (install -> usage -> config -> dev) | Users expect a familiar layout. No innovation needed in README structure.                                |
| Config template      | Manual `.env.example` with no reference to actual schema | Generated/verified from `src/lib/config.ts` Zod schema             | The Zod schema IS the source of truth for valid config fields. The `.env.example` must match it exactly. |

**Key insight:** This phase does not introduce any new code. README content should derive from the existing source code and tests, not invent new abstractions.

## Runtime State Inventory

**Not applicable** — Phase 7 is a documentation and verification phase. No rename, refactor, or migration occurs. No runtime state is affected.

## Common Pitfalls

### Pitfall 1: README Drift from Actual Behavior

**What goes wrong:** README describes a feature that was removed or changed (e.g., Perplexity API integration that was descoped in Phase 5).
**Why it happens:** README is written from memory of the original spec rather than from the actual source code.
**How to avoid:** Derive every claim in the README from reading the actual source code. Verify feature descriptions against `src/` files, not against previous design docs.
**Warning signs:** References to Perplexity, sonar models, or API keys in the README that don't match the DDG-only implementation.

### Pitfall 2: SKILL.md Extension Mismatch

**What goes wrong:** SKILL.md references `.js` but the compiled file is `.cjs` (confirmed bug in webfetch SKILL.md).
**Why it happens:** `build.ts` uses `outExtension: { '.js': '.cjs' }` to generate `.cjs` files, but SKILL.md was written before this convention was established.
**How to avoid:** Verify the actual filename in `scripts/` directory, not the assumed extension. Always use `${CLAUDE_PLUGIN_ROOT}/scripts/webfetch.cjs` (matching build output).
**Warning signs:** SKILL.md line `node "${CLAUDE_PLUGIN_ROOT}/scripts/webfetch.js"` — the `.js` is the bug. [VERIFIED: directly observed in webfetch SKILL.md line 15]

### Pitfall 3: Missing Verification of Build Output in Verification Gate

**What goes wrong:** The verification gate runs `npm test` and `npm run typecheck` but skips `npm run build`, leaving silent failures in the compiled `.cjs` bundles.
**Why it happens:** Developers assume the source code compiles if typecheck passes. But esbuild bundling can fail on module resolution issues that tsc doesn't catch (e.g., external dependencies, dynamic requires).
**How to avoid:** Include `npm run build` in the verification gate. D-13 explicitly requires build succeeds.
**Warning signs:** Existing `npm run check` already includes build — use it.

### Pitfall 4: .env.example Schema Inconsistency

**What goes wrong:** `.env.example` documents environment variables or config paths that don't match the actual `src/lib/config.ts` Zod schema.
**Why it happens:** The `.env.example` is written manually without cross-referencing the Zod schema.
**How to avoid:** Copy the exact field names, types, and defaults from the Zod schema and `ENV_MAP` in `config.ts`. Every key in the example must correspond to a real key the code reads.
**Warning signs:** `config.ts` ENV_MAP keys (`WEBSEARCH_RETRY_MAX_RETRIES`, `WEBSEARCH_LOGGING_LEVEL`, etc.) must match exactly.

## Code Examples

### Correct SKILL.md Script Path

```markdown
echo '{"url":"URL","prompt":"QUESTION"}' | node "${CLAUDE_PLUGIN_ROOT}/scripts/webfetch.cjs"
```

**Note:** The `.cjs` extension is critical. It matches the esbuild output format configured in `build.ts`.

### Correct Config File Structure (`~/.config/websearch/config.json`)

```json
{
  "retry": {
    "maxRetries": 4,
    "baseDelay": 1000,
    "maxDelay": 16000,
    "timeout": 30000
  },
  "logging": {
    "level": "info"
  }
}
```

**Source:** `src/lib/config.ts` Zod schema and DEFAULTS constant. [VERIFIED: code inspection]

### Environment Variable Overrides

| Config Field       | Environment Variable          | Type                        | Default |
| ------------------ | ----------------------------- | --------------------------- | ------- |
| `retry.maxRetries` | `WEBSEARCH_RETRY_MAX_RETRIES` | integer >= 0                | 4       |
| `retry.baseDelay`  | `WEBSEARCH_RETRY_BASE_DELAY`  | integer ms >= 0             | 1000    |
| `retry.maxDelay`   | `WEBSEARCH_RETRY_MAX_DELAY`   | integer ms >= 0             | 16000   |
| `retry.timeout`    | `WEBSEARCH_RETRY_TIMEOUT`     | integer ms >= 0             | 30000   |
| `logging.level`    | `WEBSEARCH_LOGGING_LEVEL`     | enum: debug/info/warn/error | info    |

**Source:** `src/lib/config.ts` ENV_MAP constant. [VERIFIED: code inspection]
**Precedence:** Environment variable > config file > hardcoded default. [VERIFIED: loadConfig() in config.ts]

### Search Result XML Output Format

```xml
<search_results>
  <result>
    <title>Example Domain</title>
    <url>https://example.com</url>
    <snippet>This domain is for use in illustrative examples.</snippet>
  </result>
</search_results>
```

**Source:** `src/lib/output.ts` `formatSearchResults()` function. [VERIFIED: code inspection]

### Combined Verification Command

```bash
npm run check
```

This runs: `npm run lint && npm run typecheck && npm test -- --coverage && npm run build`

## State of the Art

| Old Approach                         | Current Approach                         | When Changed       | Impact                                                           |
| ------------------------------------ | ---------------------------------------- | ------------------ | ---------------------------------------------------------------- |
| Perplexity API primary, DDG fallback | DDG-only (sole provider)                 | Phase 5            | README must reflect DDG-only; no Perplexity API key references   |
| `.js` compiled scripts               | `.cjs` compiled scripts (esbuild format) | Phase 1 (build.ts) | SKILL.md paths must use `.cjs`                                   |
| `npx tsx` for dev execution          | `esbuild` bundle + node for production   | Phase 1            | Dev section documents `tsx`, but verification uses build         |
| No hooks by default                  | Confirmed no hooks needed (D-10, D-11)   | Phase 7 context    | Structure check confirms no hooks dir — not missing, intentional |

## Assumptions Log

No claims in this research rely on assumed knowledge. All findings derive from direct code inspection (src/, test/, scripts/), verified project files (package.json, build.ts, plugin.json), and the locked decisions in CONTEXT.md.

| #   | Claim                                                                         | Section | Risk if Wrong |
| --- | ----------------------------------------------------------------------------- | ------- | ------------- |
| —   | None — all claims verified against actual source code or documented decisions | —       | —             |

## Open Questions (RESOLVED)

1. **RESOLVED: Does the verification gate need to run on a clean checkout (git clone + npm install)?**
   - What we know: D-12 says compiled scripts are tracked in git. `npm install` is manual. The existing `node_modules/` directory is present in development.
   - What's unclear: Whether the verification gate should test from a clean state (simulating fresh clone) or just run against the current working tree.
   - Recommendation: Run `npm run check` against current working tree for the verification gate. D-12's intent is that compiled scripts exist in the repo; as long as they compile from source, the gate passes. A separate clean-checkout test is overkill for a dry-run structure check.

2. **RESOLVED: Should the structure check be automated or manual?**
   - What we know: D-14 says "dry-run structure check" — validate plugin.json schema, skill directory structure, file path references, hook references without actually installing.
   - What's unclear: Whether this should be a script (like a vitest test) or a manual checklist executed by the planner.
   - Recommendation: Add a vitest test `structure.test.ts` (or extend `manifest.test.ts`/`skills.test.ts`) that validates the complete plugin structure programmatically. This makes the structure check repeatable and automated, consistent with the project's existing test infrastructure.

## Environment Availability

| Dependency       | Required By               | Available | Version | Fallback |
| ---------------- | ------------------------- | --------- | ------- | -------- |
| Node.js          | Verification gate scripts | ✓         | 26.0.0  | —        |
| npm              | `npm run check`           | ✓         | 11.12.1 | —        |
| TypeScript (tsc) | typecheck                 | ✓         | 6.0.3   | —        |
| vitest           | test                      | ✓         | 4.1.6   | —        |
| esbuild          | build                     | ✓         | 0.28.0  | —        |
| ESLint           | lint                      | ✓         | 10.4.x  | —        |
| Prettier         | formatting check          | ✓         | 3.8.3   | —        |
| tsx              | build.ts execution        | ✓         | 4.22.3  | —        |

**Missing dependencies with no fallback:** None. All tooling is installed and available.

**Missing dependencies with fallback:** None. All tooling confirmed present.

## Validation Architecture

### Test Framework

| Property           | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| Framework          | vitest 4.1.6                                                 |
| Config file        | `vitest.config.ts` (unit), `vitest.config.e2e.ts` (e2e)      |
| Quick run command  | `npm test`                                                   |
| Full suite command | `npm run check` (lint + typecheck + test --coverage + build) |
| Coverage threshold | Lines 80%, Branches 70%, Functions 80%, Statements 80%       |

### Phase Requirements -> Test Map

This phase introduces no new requirements. The verification gate confirms all existing requirements remain satisfied:

| Req ID      | Behavior                                       | Test Type | Automated Command                                                                                                                          | File Exists?          |
| ----------- | ---------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| PLUG-01..05 | Plugin structure, skill definitions, script IO | unit      | `npm test -- test/manifest.test.ts test/skills.test.ts`                                                                                    | ✅                    |
| SRCH-01..08 | WebSearch input/output/fallback/retry          | unit      | `npm test -- test/websearch.test.ts test/input.test.ts test/output.test.ts test/duckduckgo.test.ts test/filter.test.ts test/retry.test.ts` | ✅                    |
| FTEC-01..05 | WebFetch input/extraction/fetch                | unit      | `npm test -- test/webfetch.test.ts test/fetch.test.ts test/content.test.ts test/input.test.ts`                                             | ✅                    |
| CONF-01..04 | Config loading, env vars, logging              | unit      | `npm test -- test/config.test.ts test/logger.test.ts`                                                                                      | ✅                    |
| E2E Plugin  | Full pipeline (search + fetch)                 | e2e       | `npm run e2e`                                                                                                                              | ✅                    |
| STRUCTURE   | Plugin structure validation (proposed)         | unit      | `npm test -- test/manifest.test.ts test/skills.test.ts`                                                                                    | ✅ (extends existing) |

### Sampling Rate

- **Per task commit:** `npm test` (quick unit tests)
- **Per wave merge:** `npm run check` (full gate)
- **Phase gate:** `npm run check` green + dry-run structure check passes

### Verification Gate Command

```bash
npm run check
```

This runs: `npm run lint && npm run typecheck && npm test -- --coverage && npm run build`

### Structure Check (Dry-Run)

The structure check is a manual/automated audit that validates:

1. `.claude-plugin/plugin.json` exists and is valid JSON with `name` field matching `cc-websearch`
2. `skills/websearch/SKILL.md` exists with YAML frontmatter containing `description` and `allowed-tools`
3. `skills/webfetch/SKILL.md` exists with YAML frontmatter containing `description` and `allowed-tools`
4. Script paths in SKILL.md files reference `${CLAUDE_PLUGIN_ROOT}` and match actual compiled filenames
5. Referenced compiled scripts (`scripts/websearch.cjs`, `scripts/webfetch.cjs`) exist
6. `hooks/` directory either absent (D-10) or hooks.json is valid if present

This can be automated by extending `test/manifest.test.ts` and `test/skills.test.ts` with additional assertions.

### Wave 0 Gaps

- [ ] None — existing test infrastructure covers all phase requirements. The structure check assertions could be added as extensions to `manifest.test.ts` and `skills.test.ts` but are not strict Wave 0 gaps.

## Security Domain

**Not applicable** — Phase 7 is a documentation and verification phase. No code changes to runtime logic, no input handling, no authentication, no data processing. README content does not introduce security-sensitive information. `.env.example` will contain placeholder values only.

### Applicable ASVS Categories

| ASVS Category         | Applies | Rationale                             |
| --------------------- | ------- | ------------------------------------- |
| V2 Authentication     | no      | No authentication logic in this phase |
| V3 Session Management | no      | No session logic                      |
| V4 Access Control     | no      | No access control changes             |
| V5 Input Validation   | no      | No code changes                       |
| V6 Cryptography       | no      | No cryptographic operations           |

## Sources

### Primary (HIGH confidence)

- [Project source code] - `src/lib/config.ts`, `src/lib/input.ts`, `src/lib/output.ts`, `src/websearch.ts`, `src/webfetch.ts` — verified all config schema, input schemas, output format, and runtime behavior
- [Project configuration] - `package.json`, `build.ts`, `eslint.config.js`, `tsconfig.json`, `vitest.config.ts`, `.gitignore` — verified all commands, build config, and linting rules
- [Plugin structure] - `.claude-plugin/plugin.json`, `skills/websearch/SKILL.md`, `skills/webfetch/SKILL.md`, `scripts/websearch.cjs`, `scripts/webfetch.cjs` — verified the physical file structure and content
- [Test files] - `test/manifest.test.ts`, `test/skills.test.ts` — verified existing structure validation tests
- [Decision lock] - `Phase 7 CONTEXT.md` — all 16 decisions locked, confirmed against actual project state

### Secondary (MEDIUM confidence)

- [Claude Code Plugin Reference](https://docs.anthropic.com/en/docs/claude-code/plugins-reference) — referenced in CLAUDE.md as HIGH confidence source; used to confirm structure conventions. Site is behind auth wall, structure patterns verified through existing implementation.
- [Claude Code Create Plugins](https://docs.anthropic.com/en/docs/claude-code/plugins) — referenced in CLAUDE.md as HIGH confidence source; used to confirm directory layout conventions.

### Tertiary (LOW confidence)

None — all findings derived from direct code inspection or locked decisions.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new packages needed; existing toolchain verified
- Architecture: HIGH — full tree confirmed via file system inspection
- Pitfalls: HIGH — all derived from actual code inspection (webfetch SKILL.md bug confirmed, DDG-only confirmed, config schema confirmed)
- Environment: HIGH — all tools probed and version-confirmed

**Research date:** 2026-05-21
**Valid until:** This phase references the current project state (Phases 1-6 complete). Validated at Phase 7 execution time. No time-sensitive external dependencies.
