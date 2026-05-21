# Walking Skeleton -- cc-websearch

**Phase:** 1
**Generated:** 2026-05-20

## Capability Proven End-to-End

A user installs the plugin via `claude plugin add`, both WebSearch and WebFetch skills appear in Claude Code, and invoking the WebSearch skill with a JSON query on stdin returns `<search_results>` XML with real title/URL pairs from the Perplexity Sonar API to stdout, with all diagnostic output on stderr.

## Architectural Decisions

| Decision           | Choice                                                                                                                                                   | Rationale                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | Node.js 20 LTS+ with TypeScript 5.x                                                                                                                      | Claude Code plugins invoke scripts via `node`. TypeScript provides type safety for CLI input parsing, API response handling, and config validation. |
| Distribution       | Claude Code plugin with `.claude-plugin/plugin.json` manifest                                                                                            | Standard plugin system. Skills auto-discovered from `skills/*/SKILL.md`.                                                                            |
| Build              | esbuild 0.28.0 -- each script bundled to single standalone `.js` file in `scripts/`                                                                      | Zero runtime dependencies. Bundles committed to repo. Instant install. No npm install hook needed.                                                  |
| Search provider    | Perplexity Sonar API via official SDK `@perplexity-ai/perplexity_ai` v0.29.0                                                                             | OpenAI-compatible Chat Completions endpoint with `citations` and `search_results` arrays. SDK provides typed responses and built-in retry.          |
| Input validation   | Zod v4.4.3                                                                                                                                               | Runtime type checking with TypeScript inference for JSON stdin input.                                                                               |
| CLI parsing        | Commander v14.0.3                                                                                                                                        | Supports flags for dev-time testing alongside JSON stdin.                                                                                           |
| Output format      | `<search_results>` XML to stdout, all diagnostics to stderr                                                                                              | Matches Claude Code's WebSearch tool output contract. Clean stdout/stderr separation prevents cross-contamination.                                  |
| API key resolution | Read `PPLX_API_KEY` first, fall back to `PERPLEXITY_API_KEY`, pass explicitly to SDK constructor                                                         | REQUIREMENTS.md specifies `PPLX_API_KEY`; SDK defaults to `PERPLEXITY_API_KEY`. Supporting both avoids confusion.                                   |
| Logging            | Level-prefixed stderr logger (debug/info/warn/error), controlled by `LOG_LEVEL` env var                                                                  | No external logger library. Keeps bundles small.                                                                                                    |
| Directory layout   | Plugin root: `.claude-plugin/plugin.json`, `skills/*/SKILL.md`, `scripts/*.js` (bundles), `src/*.ts` (source), `src/lib/*.ts` (shared), `test/*.test.ts` | Follows Claude Code plugin conventions. Skills at plugin root, not inside `.claude-plugin/`.                                                        |

## Stack Touched in Phase 1

- [x] Plugin scaffold -- `.claude-plugin/plugin.json` manifest, `package.json`, `tsconfig.json`
- [x] Skill definitions -- `skills/websearch/SKILL.md` (active), `skills/webfetch/SKILL.md` (stub)
- [x] Build pipeline -- `build.ts` using esbuild to produce standalone bundles
- [x] WebSearch script -- reads JSON stdin, validates with Zod, calls Perplexity API, outputs XML to stdout
- [x] WebFetch script -- stub returning "not yet implemented"
- [x] Shared library -- input parser, output formatter, logger, Perplexity client wrapper
- [x] Test runner -- vitest 4.1.6 with config

## Out of Scope (Deferred to Later Phases)

- DDG Lite fallback (Phase 2)
- Domain filtering -- allowed_domains, blocked_domains (Phase 2)
- Retry logic with exponential backoff (Phase 2)
- WebFetch content pipeline -- page fetching, Readability, Turndown, LLM summarization (Phase 3)
- Config file at `~/.config/websearch/config.json` (Phase 4)
- Caching (v2)
- CLI flags for testing outside Claude Code (v2)
- SessionStart hook for npm dependency installation (not needed -- bundles are standalone)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Search Resilience -- DDG fallback provider, domain filtering, retry logic
- Phase 3: WebFetch Content Pipeline -- page fetching, content extraction, markdown conversion, LLM summarization
- Phase 4: Config File and Logging -- config file with env override, configurable log levels
