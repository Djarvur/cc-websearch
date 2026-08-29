<!-- GSD:project-start source:PROJECT.md -->

## Project

**cc-websearch** — a Claude Code plugin providing two skills, `websearch` and `webfetch`, that
replace the built-in WebSearch and WebFetch tools. Each skill invokes a bundled Node CLI script that
reads JSON on stdin and writes results to stdout, producing output identical to the built-in tools.

**Core value:** exact drop-in replacement — same interface, same output format, no API keys.

### Constraints

- **Runtime**: TypeScript compiled to CommonJS bundles; Node `^22.22.2 || ^24.15.0 || >=26.0.0`
  (see `engines` in `package.json`). CI runs on Node 24.
- **Distribution**: standard Claude Code plugin. Bundles are committed to git, so the plugin works
  immediately after install with no build step.
- **Output format**: must match Claude Code's built-in WebSearch/WebFetch byte-for-byte.
- **Search backend**: DuckDuckGo Lite (`lite.duckduckgo.com`) scraped with the global `fetch` and
  `cheerio`. No API keys, no accounts.
- **No LLM in the pipeline**: WebFetch extracts and converts page content; it never answers the
  `prompt` field.
- **Config**: `~/.config/websearch/config.json`, overridden by `WEBSEARCH_*` environment variables.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

Versions below are the current pins; `package.json` is the source of truth.

| Package                               | Version    | Purpose                                           |
| ------------------------------------- | ---------- | ------------------------------------------------- |
| `zod`                                 | 4.4.3      | Stdin/config schema validation (`z.strictObject`) |
| `cheerio`                             | ^1.2.0     | Parsing DDG Lite search-result HTML               |
| `@mozilla/readability`                | ^0.6.0     | Article extraction (Firefox Reader View engine)   |
| `jsdom`                               | ^30.0.1    | DOM implementation required by Readability        |
| `turndown`                            | ^7.2.4     | HTML → Markdown                                   |
| `turndown-plugin-gfm`                 | ^1.0.2     | GFM tables and strikethrough for Turndown         |
| `typescript`                          | 6.0.3      | Language / `tsc --noEmit` typechecking            |
| `esbuild`                             | 0.28.2     | Production bundling to `.cjs`                     |
| `tsx`                                 | 4.23.12    | Runs `build.ts` without a compile step            |
| `vitest` + `@vitest/coverage-v8`      | 4.1.x      | Unit and e2e tests                                |
| `eslint` + `typescript-eslint`        | 10.x / 8.x | Linting (`recommended` + `strict`)                |
| `prettier` + `eslint-config-prettier` | 3.x / 10.x | Formatting                                        |

`package.json` still lists two dependencies that nothing imports: `commander` (there is no CLI flag
parsing — input arrives as JSON on stdin) and `duck-duck-scrape` (replaced by `fetch` + `cheerio`).
Neither ends up in the bundles. They only generate Dependabot noise and should be dropped.

### What not to add

- **HTTP clients** (`axios`, `node-fetch`) — Node's global `fetch` is used everywhere.
- **Headless browsers** (Puppeteer, Playwright) — DDG Lite is plain HTML; a `fetch` is enough.
- **CLI argument parsers** — both scripts take JSON on stdin only. There is no flag parsing.
- **`ts-node`, `jest`** — the project uses `tsx` and `vitest`.
- **MCP server code** — skills call the bundled scripts directly.
- **Non-Node runtimes** (Deno, Bun) — Claude Code invokes the scripts with `node`.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

- **ESM source, CJS bundles.** `package.json` sets `"type": "module"`; relative imports use the
  `.js` extension (`./lib/input.js`) as required by `NodeNext` resolution.
- **stdout is the result, stderr is everything else.** Logging goes exclusively to stderr;
  `test/io-separation.test.ts` guards this. Never `console.log` in `src/`.
- **Validation at the boundary.** All external input goes through a zod `strictObject` in
  `src/lib/input.ts`; unknown keys are rejected.
- **Errors set `process.exitCode = 1`** and log via the module logger — no bare `throw` from `main`.
- **Prettier**: single quotes, semicolons, trailing commas, width 100, 2-space indent.
  `eslint-config-prettier` must stay last in `eslint.config.js`.
- **Generated files are not hand-edited.** `skills/*/scripts/*.cjs` and `scripts/*.cjs` come from
  `npm run build`.
- **Versions are duplicated** in `package.json` and `.claude-plugin/plugin.json` — bump both together.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

| Path                    | Role                                                                 |
| ----------------------- | -------------------------------------------------------------------- |
| `src/websearch.ts`      | WebSearch entry point — stdin → DDG → XML on stdout                  |
| `src/webfetch.ts`       | WebFetch entry point — stdin → fetch → Readability → markdown        |
| `src/lib/input.ts`      | zod schemas for stdin payloads, stdin reader, domain-flag validation |
| `src/lib/config.ts`     | Config file loading + `WEBSEARCH_*` env overrides                    |
| `src/lib/duckduckgo.ts` | DDG search wrapper                                                   |
| `src/lib/fetch.ts`      | HTTP fetch, HTTPS upgrade, redirect and content-type handling        |
| `src/lib/content.ts`    | Readability extraction + Turndown (with GFM plugin) markdown output  |
| `src/lib/filter.ts`     | `allowed_domains` / `blocked_domains` filtering                      |
| `src/lib/retry.ts`      | Exponential backoff, transient-error classification                  |
| `src/lib/output.ts`     | `<search_results>` XML formatting                                    |
| `src/lib/logger.ts`     | Leveled logger — writes to stderr only                               |
| `build.ts`              | esbuild bundling into `skills/*/scripts/*.cjs`                       |
| `skills/*/SKILL.md`     | Skill definitions that shell out to the bundles                      |
| `hooks/hooks.json`      | `PreToolUse` hooks denying the built-in WebSearch/WebFetch tools     |
| `.plugin-scanner.toml`  | HOL Guard scanner config — suppresses findings in generated bundles  |

### Pipelines

```
websearch: JSON stdin → zod validate → fetch lite.duckduckgo.com → cheerio parse
           → unwrap /l/?uddg= redirect links → domain filter
           → <search_results> XML on stdout
webfetch:  JSON stdin → zod validate → fetch → @mozilla/readability (jsdom)
           → turndown → markdown on stdout
```

### Build

`npm run build` runs `build.ts` under `tsx`. esbuild bundles each entry point into a single
self-contained `.cjs` file. A custom esbuild plugin inlines jsdom's filesystem reads (default
stylesheet, XHR sync worker) and patches `@acemir/cssom` so the bundle runs without jsdom's
`node_modules` present — that plugin is the fragile part of the build; check it after any jsdom bump.

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

| Skill                 | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Path                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| agents-best-practices | "Use this skill when designing, generating an MVP blueprint for, auditing, refactoring, or explaining an agentic harness for any domain. Covers provider-neutral agent architecture for OpenAI, Anthropic, and OpenAI-compatible APIs: agent loops, tool design, permissions, system prompts, planning, goals, context compaction, memory, skills, MCP/external connectors, observability, evals, prompt caching, agent-legible environments, feedback loops, and safety." | `.claude/skills/agents-best-practices/SKILL.md` |

<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.

<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.

<!-- GSD:profile-end -->

## Commands

| Command             | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `npm run check`     | Full CI equivalent: lint + typecheck + test + build        |
| `npm run lint`      | `eslint .` then `prettier --check .`                       |
| `npm run typecheck` | `tsc --noEmit`                                             |
| `npm test`          | Vitest unit tests                                          |
| `npm run build`     | Bundle both scripts with esbuild                           |
| `npm run e2e`       | Build, then run `test/e2e/` (needs the local `claude` CLI) |

`.mise.toml` mirrors these as mise tasks; npm scripts remain the primary interface.

## Working agreements

- Run `npm run check` before pushing — CI runs exactly these steps and fails on Prettier diffs.
- After changing `src/` or `build.ts`, rebuild and commit the regenerated bundles, since they are
  what users actually run.
- Dependabot PRs that have sat open for a while are branched from a stale `master` and will fail
  lint on unrelated files. Rebase them before judging the failure.
- `.github/workflows/plugin-scan.yml` runs the HOL Guard plugin scanner and gates on
  score >= 80/100 with no high/critical findings (currently 100/100). Third-party GitHub Actions
  must stay pinned to full commit SHAs, or that job fails.
