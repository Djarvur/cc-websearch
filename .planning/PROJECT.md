# cc-websearch

## What This Is

A Claude Code plugin providing two skills that replace the built-in WebSearch and WebFetch tools. Distributed as a standard Claude Code plugin installable via the plugin command. Two Node CLI scripts (`websearch`, `webfetch`) called via `node` from skill definitions, producing output identical to Claude Code's built-in tools.

## Core Value

Exact drop-in replacement for Claude Code's WebSearch and WebFetch — same interface, same output format, no behavior changes for the user.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] WebSearch skill that queries Perplexity Chat Completions API as primary provider
- [ ] WebSearch falls back to DuckDuckGo Lite HTML scraping when Perplexity unavailable, no key provided, or credits exhausted
- [ ] WebSearch supports domain filtering (allowed_domains, blocked_domains) matching Claude Code's interface
- [ ] WebSearch returns markdown search results with link citations — exact Claude Code output format
- [ ] WebFetch skill that retrieves web pages and returns content in markdown or plain text format
- [ ] WebFetch is standalone — pure page retrieval, no search interaction
- [ ] Exponential backoff with jitter retry strategy for rate limit responses from any provider
- [ ] Config file support at `~/.config/websearch/config.json` with env variable fallback
- [ ] Optional caching — enabled via config, cache directory configurable, no cache when not configured
- [ ] Configurable logging levels for debugging rate limits, fallbacks, and errors
- [ ] Plugin installable via standard Claude Code plugin command
- [ ] CLI scripts accept hybrid input — CLI flags for simple use, JSON on stdin matching Claude Code tool schema

### Out of Scope

- MCP server implementation — skills call CLI scripts directly, no MCP transport
- Additional search providers beyond Perplexity and DDG — two-tier fallback only
- Auto-following links from search results — WebFetch is standalone
- Three-tier fallback chains — Perplexity → DDG → fail cleanly

## Context

- Claude Code's built-in WebSearch and WebFetch tools have specific input/output schemas that must be matched exactly
- Perplexity Chat Completions endpoint provides structured search results with citations
- DuckDuckGo Lite provides HTML search results that can be scraped without API keys
- HTML-to-Markdown conversion needed for WebFetch — Readability + Turndown is the standard approach
- Plugin is registered as a Claude Code plugin with skills in proper subdirectories
- Skills invoke scripts using `node` command

## Constraints

- **Runtime**: TypeScript/Node — scripts run via `node`
- **Distribution**: Standard Claude Code plugin — installable via plugin command
- **Output format**: Must match Claude Code's WebSearch and WebFetch output byte-for-byte
- **Perplexity API**: Chat Completions endpoint
- **DDG API**: DuckDuckGo Lite HTML scraping
- **Config**: `~/.config/websearch/config.json` or environment variables

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript/Node | Matches Claude Code plugin ecosystem, skill scripts run via `node` | — Pending |
| Perplexity Chat Completions | More flexible than Ask API, structured results with citations | — Pending |
| DDG Lite HTML scraping | No API key required, widely used pattern, reliable fallback | — Pending |
| Exponential + jitter retry | Standard best practice for rate-limited APIs, prevents thundering herd | — Pending |
| Hybrid CLI input (flags + stdin) | Flags for simple queries, JSON stdin for complex structured input matching tool schema | — Pending |
| Markdown stdout + stderr errors | Matches Claude Code output format directly, clean separation of results vs diagnostics | — Pending |
| Readability + Turndown for WebFetch | Standard HTML content extraction + markdown conversion pipeline | — Pending |
| Optional configurable caching | Saves API credits on repeat queries, disabled by default to keep simple | — Pending |

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
*Last updated: 2026-05-20 after initialization*
