<!-- GSD:project-start source:PROJECT.md -->

## Project

**cc-websearch**

A Claude Code plugin providing two skills that replace the built-in WebSearch and WebFetch tools. Distributed as a standard Claude Code plugin installable via the plugin command. Two Node CLI scripts (`websearch`, `webfetch`) called via `node` from skill definitions, producing output identical to Claude Code's built-in tools.

**Core Value:** Exact drop-in replacement for Claude Code's WebSearch and WebFetch — same interface, same output format, no behavior changes for the user.

### Constraints

- **Runtime**: TypeScript/Node — scripts run via `node`
- **Distribution**: Standard Claude Code plugin — installable via plugin command
- **Output format**: Must match Claude Code's WebSearch and WebFetch output byte-for-byte
- **Perplexity API**: Chat Completions endpoint
- **DDG API**: DuckDuckGo Lite HTML scraping
- **Config**: `~/.config/websearch/config.json` or environment variables
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## Recommended Stack

### Core Technologies

| Technology                     | Version | Purpose                       | Why Recommended                                                                                                                                                                                        |
| ------------------------------ | ------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript                     | 5.x     | Language                      | Claude Code plugins run via `node`; TypeScript provides type safety for CLI input parsing, API response handling, and config validation. The ecosystem strongly favors TS.                             |
| Node.js                        | 20 LTS+ | Runtime                       | Required by Claude Code plugin system (`node` command in skill definitions). v20 LTS is the current long-term support line.                                                                            |
| Commander.js                   | 13.x    | CLI argument parsing          | De facto standard for Node CLI apps. Supports hybrid input: flags for simple queries plus `parseAsync()` for programmatic use. TypeScript-native, zero dependencies, well-maintained.                  |
| `@perplexity-ai/perplexity_ai` | 2.x     | Perplexity API client         | Official Perplexity TypeScript SDK. Supports Chat Completions (sonar models) with built-in retries, timeouts, error handling, and streaming. OpenAI-compatible response format with `citations` array. |
| `duck-duck-scrape`             | 2.2.x   | DuckDuckGo fallback           | Node.js library for scraping DDG search results without API keys. Supports text, image, video, news search. The only maintained DDG scraping library in the ecosystem.                                 |
| `turndown`                     | 7.2.x   | HTML to Markdown conversion   | Standard HTML-to-Markdown converter for JavaScript. Used by Firefox, Joplin, and countless tools. Extensible rule system, plugin support for GFM tables.                                               |
| `@mozilla/readability`         | 0.6.x   | Content extraction            | Firefox Reader View engine. Extracts article content from HTML, stripping navigation, ads, sidebars. The proven solution for clean content extraction.                                                 |
| `jsdom`                        | 25.x    | DOM parsing for Readability   | Required by `@mozilla/readability` (needs a `document` object). jsdom provides a W3C-compliant DOM in Node.js. The standard pairing with Readability.                                                  |
| `cheerio`                      | 1.x     | HTML parsing for DDG scraping | Lightweight jQuery-style HTML parser. Used to parse DuckDuckGo Lite HTML search results. Far lighter than jsdom for simple scraping -- no full DOM needed.                                             |

### Supporting Libraries

| Library               | Version | Purpose                        | When to Use                                                                                                                        |
| --------------------- | ------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `zod`                 | 3.x     | Schema validation              | Validate JSON stdin input matching Claude Code's WebSearch/WebFetch tool schemas. Runtime type checking with TypeScript inference. |
| `turndown-plugin-gfm` | 1.0.x   | GFM table support for Turndown | Always -- web pages contain tables. Enables GitHub Flavored Markdown table conversion.                                             |
| `p-limit`             | 6.x     | Concurrency control            | If batching multiple DDG scrape requests. Prevents rate-limiting from aggressive parallel requests.                                |

### Development Tools

| Tool           | Purpose                       | Notes                                                                                                                             |
| -------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `tsx`          | Dev-time TypeScript execution | Run `.ts` files directly with `npx tsx script.ts`. No build step during development. Powered by esbuild.                          |
| `vitest`       | Testing framework             | Fast, ESM-native, TypeScript-first testing. Supports mocking HTTP requests via `vi.fn()`. Vite-powered.                           |
| `tsc --noEmit` | Type checking                 | Run in CI for full type safety. esbuild/tsx skip type checking, so this catches errors they miss.                                 |
| `esbuild`      | Production bundling           | Bundle CLI scripts into single files for distribution. Use directly (not tsup) since these are standalone scripts, not libraries. |

## Installation

# Core runtime dependencies

# Dev dependencies

## Alternatives Considered

| Category            | Recommended                                   | Alternative                                      | When to Use Alternative                                                                                                                                                                                                                              |
| ------------------- | --------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Perplexity client   | `@perplexity-ai/perplexity_ai` (official SDK) | Raw `fetch` to OpenAI-compatible endpoint        | If SDK adds unwanted bundle size or you need minimal dependencies. Perplexity API is OpenAI-compatible so a raw `fetch` with `Authorization` header works. However, the SDK provides retry logic, typed responses, and error classes out of the box. |
| Perplexity client   | `@perplexity-ai/perplexity_ai`                | `@ai-sdk/perplexity` (Vercel AI SDK provider)    | Only if already using Vercel AI SDK elsewhere. Adds unnecessary dependency weight for a standalone CLI.                                                                                                                                              |
| DDG scraping        | `duck-duck-scrape`                            | Raw `fetch` + `cheerio` on `lite.duckduckgo.com` | If `duck-duck-scrape` breaks due to DDG HTML changes and needs a quick patch. The library abstracts the HTML structure, which is fragile.                                                                                                            |
| HTML to Markdown    | `turndown`                                    | `node-html-markdown`                             | If Turndown's CommonMark output is too limited. `node-html-markdown` (v2.0) is faster but less mature, with fewer plugins. Turndown's plugin ecosystem (GFM, tables, strikethrough) makes it more flexible.                                          |
| DOM for Readability | `jsdom`                                       | `linkedom`                                       | If jsdom's ~2MB size is unacceptable. `linkedom` is lighter but missing some DOM APIs that Readability depends on. jsdom is the officially tested pairing.                                                                                           |
| CLI parsing         | `commander`                                   | `yargs`                                          | If you need advanced features like shell completion, internationalization, or deep subcommand nesting. Commander is simpler and more than sufficient for two scripts with a handful of flags.                                                        |
| CLI parsing         | `commander`                                   | Raw `process.argv` parsing                       | Only for the simplest one-flag scripts. Not worth it -- Commander adds negligible overhead and handles edge cases (quoted args, variadic, help text, etc.).                                                                                          |
| Config parsing      | `zod`                                         | `joi` or `ajv`                                   | If you prefer JSON Schema validation (ajv) or a different API style. Zod provides the best TypeScript inference and is the ecosystem standard in 2025.                                                                                               |
| Build tool          | `esbuild` (direct)                            | `tsup`                                           | If building a library with multiple export formats. For standalone CLI scripts, raw esbuild is simpler and more direct.                                                                                                                              |

## What NOT to Use

| Avoid                     | Why                                                                                                                                               | Use Instead                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Puppeteer / Playwright    | Way too heavy for scraping DDG Lite. Launches a full browser process. DDG Lite has zero JavaScript -- a simple `fetch` is all you need.           | `duck-duck-scrape` or `cheerio` with raw `fetch` |
| `axios`                   | Unnecessary dependency. Node 18+ has native `fetch`. The Perplexity SDK uses native `fetch` internally. Adding axios adds ~40KB for zero benefit. | Native `fetch` (global in Node 18+)              |
| `node-fetch`              | Polyfill for older Node versions. Node 18+ includes native `fetch`. Since the project targets Node 20 LTS+, this is redundant.                    | Native `fetch` (global in Node 20 LTS)           |
| `ts-node`                 | Slow, outdated. `tsx` is the modern replacement -- faster (esbuild-powered), better ESM support, actively maintained.                             | `tsx` for dev execution                          |
| `jest`                    | Heavy, slow, CJS-centric. Vitest is the modern standard for TypeScript projects -- faster, ESM-native, Vite-powered.                              | `vitest`                                         |
| MCP server implementation | Out of scope per PROJECT.md. Skills call CLI scripts directly via `node`. No MCP transport needed.                                                | CLI scripts invoked by skill definitions         |
| `deno` or `bun` runtimes  | Claude Code invokes scripts with `node`. The runtime must be Node.js.                                                                             | Node.js 20 LTS+                                  |

## Stack Patterns by Variant

- Drop `@perplexity-ai/perplexity_ai` and use raw `fetch` against `https://api.perplexity.ai/chat/completions`
- The API is OpenAI-compatible, so the request format is straightforward
- You lose built-in retries, typed responses, and error classes, but gain zero-dependency simplicity
- Fall back to raw `fetch` + `cheerio` targeting `lite.duckduckgo.com`
- DDG Lite is a stable HTML-only page (`<a class="result__a">` for titles, etc.)
- This is more fragile but gives you direct control over the parsing
- Consider `@popplar/readability` or a simpler content extraction approach
- But this is unlikely -- jsdom is the tested and documented pairing

## Plugin Distribution Architecture

- Skills invoke compiled bundles from their own subdirectory: `node "${CLAUDE_PLUGIN_ROOT}/skills/<name>/scripts/<bundle>.cjs"`
- Use `${CLAUDE_PLUGIN_ROOT}` for all path references in skill definitions
- Use `${CLAUDE_PLUGIN_DATA}` for persistent data (caches, node_modules across updates)
- The `hooks/hooks.json` `SessionStart` hook pattern handles npm dependency installation on first run and after updates
- Plugin manifests require only `name`; `version` is recommended for explicit versioning
- `bin/` directory adds executables to PATH during Bash tool usage (not needed here -- skills call scripts directly)

## Version Compatibility

| Package A                          | Compatible With             | Notes                                                                         |
| ---------------------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `@perplexity-ai/perplexity_ai@2.x` | Node 20+                    | SDK requires Node 20 LTS or later. Uses native `fetch`.                       |
| `@mozilla/readability@0.6.x`       | `jsdom@25.x`                | Readability requires a DOM `Document` object. jsdom is the standard provider. |
| `turndown@7.2.x`                   | `turndown-plugin-gfm@1.0.x` | GFM plugin is the standard extension for tables and strikethrough.            |
| `duck-duck-scrape@2.2.x`           | Node 18+                    | Uses native `fetch` internally. No browser polyfill needed.                   |
| `commander@13.x`                   | TypeScript 4.9+             | Ships native TypeScript types. No `@types/commander` needed.                  |
| `vitest@4.x`                       | Vite 6.x                    | Vitest 4.x is the current major version.                                      |
| `tsx@4.x`                          | Node 18+                    | esbuild-powered TypeScript execution.                                         |

## Sources

- [Perplexity Node.js SDK (GitHub)](https://github.com/perplexityai/perplexity-node) -- SDK API, Chat Completions, streaming, error handling, retries. HIGH confidence.
- [Claude Code Plugin Reference](https://code.claude.com/docs/en/plugins-reference) -- Plugin manifest schema, directory structure, skill definitions, hooks, `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` variables. HIGH confidence.
- [Claude Code Create Plugins](https://code.claude.com/docs/en/plugins) -- Quickstart, directory layout, testing with `--plugin-dir`. HIGH confidence.
- [Perplexity Sonar API Docs](https://docs.perplexity.ai/docs/sonar/quickstart) -- OpenAI-compatible format, citations in response, sonar models. HIGH confidence.
- [DuckDuckGo Non-JS Versions](https://duckduckgo.com/duckduckgo-help-pages/features/non-javascript) -- lite.duckduckgo.com and html.duckduckgo.com endpoints. HIGH confidence.
- [duck-duck-scrape (npm)](https://www.npmjs.com/package/duck-duck-scrape) -- v2.2.7, TypeScript support, search API. HIGH confidence.
- [turndown (npm)](https://www.npmjs.com/package/turndown) -- v7.2.0, HTML to Markdown, plugin system. HIGH confidence.
- [@mozilla/readability (npm)](https://www.npmjs.com/package/@mozilla/readability) -- v0.6.0, Firefox Reader View engine. HIGH confidence.
- [jsdom (npm)](https://www.npmjs.com/package/jsdom) -- v25.x, W3C DOM for Node.js. HIGH confidence.
- [cheerio (npm)](https://www.npmjs.com/package/cheerio) -- v1.x, lightweight HTML parser. HIGH confidence.
- [Commander.js (npm)](https://www.npmjs.com/package/commander) -- v13.x, CLI framework. HIGH confidence.
- [vitest (npm)](https://www.npmjs.com/package/vitest) -- v4.1.6, testing framework. HIGH confidence.
- [PkgPulse TypeScript Build Tools Guide](https://www.pkgpulse.com/guides/best-typescript-build-tools-2026) -- tsx vs tsup vs esbuild comparison. MEDIUM confidence.
- Version numbers for turndown (7.2.0), Commander.js (13.x), and tsx (4.x) are based on npm registry data and web search results cross-referenced with official pages. Some exact patch versions may differ from latest by the time of implementation -- verify with `npm view <package> version`.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.

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
