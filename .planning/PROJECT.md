# cc-websearch

## What This Is

A Claude Code plugin providing two skills that replace the built-in WebSearch and WebFetch tools. Distributed as a standard Claude Code plugin installable via the plugin command. Two Node CLI scripts (`websearch`, `webfetch`) called via `node` from skill definitions, producing output identical to Claude Code's built-in tools. Zero API keys required — DuckDuckGo Lite is the sole search provider.

## Core Value

Exact drop-in replacement for Claude Code's WebSearch and WebFetch — same interface, same output format, no behavior changes for the user.

## Current Milestone: v1.2 Replace Built-in WebSearch/WebFetch

**Goal:** Make the cc-websearch plugin replace Claude Code's built-in WebSearch and WebFetch tools for ALL providers — the plugin is always used regardless of whether the provider is Anthropic or not.

**Target features:**
- Investigate how Claude Code routes built-in tools vs plugin skills
- Find mechanism to override/disable built-in WebSearch and WebFetch
- Implement solution so plugin skills are always used instead of built-in tools
- Works identically for all providers (Anthropic, OpenAI, self-hosted, etc.)

## Requirements

### Validated

- ✓ WebSearch skill using DuckDuckGo Lite HTML scraping — v1.0
- ✓ WebFetch skill that retrieves web pages and returns content in markdown — v1.0
- ✓ WebSearch supports domain filtering (allowed_domains, blocked_domains) — v1.0
- ✓ Search results returned in Claude Code XML format with title, url, and snippet — v1.0
- ✓ Exponential backoff with jitter retry strategy for rate limit responses — v1.0
- ✓ Config file support at `~/.config/websearch/config.json` with env variable override — v1.0
- ✓ Configurable logging levels for debugging rate limits and errors — v1.0
- ✓ Plugin installable via standard Claude Code plugin command — v1.0
- ✓ CLI scripts accept JSON on stdin matching Claude Code tool schema — v1.0
- ✓ CI toolchain with ESLint, Prettier, coverage enforcement, and mise task runner — v1.0
- ✓ E2E test suite validating real DDG search and WebFetch — v1.0
- ✓ GitHub Actions CI, cron workflow, and Dependabot — v1.0

### Active

- [ ] **DIST-01**: Bundles output to `skills/<name>/scripts/` with esbuild
- [ ] **DIST-02**: SKILL.md references use `${CLAUDE_PLUGIN_ROOT}/skills/<name>/scripts/`
- [ ] **DIST-03**: Old `scripts/` root directory removed
- [ ] **DIST-04**: Path-dependent tests and CI updated
- [ ] Optional caching — enabled via config, cache directory configurable, no cache when not configured
- [ ] CLI flags for testing outside Claude Code (`--query`, `--url`, `--prompt`, `--allowed-domains`, `--blocked-domains`)

### Out of Scope

- MCP server implementation — skills call CLI scripts directly, no MCP transport
- Additional search providers beyond DuckDuckGo — DDG-only is the designed architecture
- Auto-following links from search results — WebFetch is standalone
- Three-tier fallback chains — DDG → fail cleanly
- LLM summarization — removed in Phase 5 (DDG-only), WebFetch is pure fetch-extract-markdown

## Context

- Shipped v1.0 with ~3,000 LOC TypeScript, 142 tests, 14 test files
- Tech stack: TypeScript, Node.js 20+, DuckDuckGo Lite HTML scraping via fetch + cheerio, Readability + Turndown for content extraction
- DuckDuckGo Lite endpoint (`https://lite.duckduckgo.com/lite/`) provides stable search results without API keys — no rate limiting from the Lite endpoint
- E2E tests validate real DDG search and WebFetch behavior against live network
- GitHub Actions CI runs lint, typecheck, test coverage, and build on every PR
- Weekly cron workflow runs npm audit and E2E tests
- Dependabot configured for npm and GitHub Actions dependency updates

## Constraints

- **Runtime**: TypeScript/Node — scripts run via `node`
- **Distribution**: Standard Claude Code plugin — installable via plugin command
- **Output format**: Must match Claude Code's WebSearch and WebFetch output byte-for-byte
- **DDG API**: DuckDuckGo Lite HTML scraping (`https://lite.duckduckgo.com/lite/`)
- **Config**: `~/.config/websearch/config.json` or environment variables

## Key Decisions

| Decision                            | Rationale                                                                              | Outcome       |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ------------- |
| TypeScript/Node                     | Matches Claude Code plugin ecosystem, skill scripts run via `node`                     | ✓ Good        |
| Perplexity Chat Completions         | More flexible than Ask API, structured results with citations                          | ⚠️ Revisit    |
| DDG Lite HTML scraping              | No API key required, widely used pattern, reliable fallback                            | ✓ Good        |
| Exponential + jitter retry          | Standard best practice for rate-limited APIs, prevents thundering herd                 | ✓ Good        |
| Hybrid CLI input (stdin JSON)       | JSON stdin matching tool schema for Claude Code use                                    | ✓ Good        |
| Markdown stdout + stderr errors     | Matches Claude Code output format directly, clean separation of results vs diagnostics | ✓ Good        |
| Readability + Turndown for WebFetch | Standard HTML content extraction + markdown conversion pipeline                        | ✓ Good        |
| Optional configurable caching       | Saves API credits on repeat queries, disabled by default to keep simple                | — Deferred    |
| fetch + cheerio (DDG Lite)          | Replaced duck-duck-scrape (Phase 8), stable Lite endpoint, no rate limiting           | ✓ Good        |
| DDG-only architecture               | Perplexity pricing no longer viable, zero API keys, simpler maintenance                | ✓ Good        |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-05-22 after v1.2 milestone start*
