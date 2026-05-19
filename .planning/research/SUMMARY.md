# Project Research Summary

**Project:** cc-websearch -- Claude Code plugin providing WebSearch and WebFetch tools
**Domain:** Node.js CLI plugin for Claude Code (Perplexity API + DuckDuckGo fallback)
**Researched:** 2026-05-20
**Confidence:** HIGH

## Executive Summary

cc-websearch is a Claude Code plugin that replaces the built-in WebSearch and WebFetch tools, which are unavailable on Bedrock/Vertex deployments. The plugin follows the standard Claude Code skill-and-script pattern: SKILL.md files define invocation triggers, and Node.js CLI scripts handle execution. The primary search provider is the Perplexity Sonar API (OpenAI-compatible Chat Completions with citations), with DuckDuckGo Lite HTML scraping as a zero-config fallback. WebFetch uses the standard Readability-plus-Turndown pipeline for content extraction.

The recommended approach is to build a two-tier provider architecture with a shared output formatter that normalizes both Perplexity and DDG results into Claude Code's exact XML-like `<search_results>` output format. Input arrives as JSON on stdin matching Claude Code's tool schemas. All results go to stdout; all errors go to stderr. The plugin structure must place skills at the plugin root (not inside `.claude-plugin/`), and all file references must use `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_SKILL_DIR}` variables to survive marketplace installation.

The key risks are: Perplexity rate limits (Tier 0 gets 50 RPM, requiring exponential backoff with jitter and DDG fallback from day one), DuckDuckGo HTML structure fragility (use structural selectors, not class-based), and Readability returning null on non-article pages (must fall back to raw Turndown). The output format must exactly match Claude Code's built-in tool output -- any deviation breaks the agent's expectations. WebFetch must return summarized answers (not raw content), matching the built-in behavior, which adds the complexity of routing fetched content through an LLM summarization step.

## Key Findings

### Recommended Stack

TypeScript 5.x on Node.js 20 LTS+, executed via `node --import tsx` in skill definitions to avoid a build step. The Perplexity official SDK (`@perplexity-ai/perplexity_ai@2.x`) provides typed responses with citations. DDG scraping uses `cheerio@1.x` for lightweight HTML parsing. WebFetch content extraction uses `@mozilla/readability@0.6.x` (Firefox Reader View engine) paired with `jsdom@25.x` for DOM construction, then `turndown@7.2.x` with `turndown-plugin-gfm@1.0.x` for HTML-to-Markdown conversion. Commander.js handles CLI flags; Zod validates JSON stdin input.

**Core technologies:**
- TypeScript 5.x / Node.js 20 LTS: language and runtime -- required by Claude Code plugin system
- `@perplexity-ai/perplexity_ai@2.x`: primary search provider -- official SDK with typed citations, retries, streaming
- `duck-duck-scrape@2.2.x` + `cheerio@1.x`: DDG fallback -- zero-config, no API key needed
- `@mozilla/readability@0.6.x` + `jsdom@25.x`: content extraction -- Firefox Reader View engine, proven quality
- `turndown@7.2.x` + `turndown-plugin-gfm@1.0.x`: HTML-to-Markdown -- standard converter with GFM table support
- `commander@13.x`: CLI argument parsing -- de facto standard, zero dependencies
- `zod@3.x`: schema validation -- runtime type checking for JSON stdin input

**Avoid:** Puppeteer/Playwright (too heavy), axios (native fetch exists), node-fetch (redundant in Node 20), ts-node (use tsx instead), jest (use vitest).

### Expected Features

The plugin must be a drop-in replacement for Claude Code's built-in WebSearch and WebFetch tools, producing identical output for identical inputs. The exact output format uses XML-like tags (`<search_results>`, `<result>`, `<title>`, `<url>`), not generic Markdown lists.

**Must have (table stakes):**
- WebSearch accepting `{query, allowed_domains?, blocked_domains?}` as JSON stdin -- matches exact Claude Code schema
- WebSearch outputting `<search_results>` XML format with title/URL pairs -- matches built-in output exactly
- WebSearch Perplexity integration with structured results and citations -- primary provider
- WebSearch DDG Lite fallback when Perplexity fails (429, no key, timeout) -- zero-config fallback
- WebSearch domain filtering (allowed_domains, blocked_domains, never combined) -- matches built-in behavior
- WebFetch accepting `{url, prompt}` as JSON stdin -- matches exact Claude Code schema
- WebFetch returning summarized answer (not raw content) -- matches built-in behavior
- WebFetch HTML-to-Markdown conversion via Readability + Turndown -- standard pipeline
- WebFetch HTTP-to-HTTPS auto-upgrade -- matches built-in behavior
- Plugin directory structure with SKILL.md for both skills -- Claude Code auto-discovery
- Exponential backoff with jitter for rate limits -- prevents thundering herd
- Output on stdout, errors on stderr, exit codes for success/failure -- clean Claude Code integration

**Should have (competitive):**
- Two-tier fallback (Perplexity -> DDG -> clean failure) -- resilience differentiator
- Configurable caching (disabled by default) -- saves API credits on repeat queries
- CLI flag input (in addition to JSON stdin) -- developer testability outside Claude Code
- Configurable logging levels -- debugging without noise

**Defer (v2+):**
- Streaming results -- requires architectural changes to skill-to-CLI pipeline
- Additional search providers (Google, Bing) -- scope creep, two tiers sufficient
- Config file support (`~/.config/websearch/config.json`) -- env vars sufficient for v1
- Cross-domain redirect following -- niche edge case

### Architecture Approach

The plugin uses a skill-to-script invocation pattern: SKILL.md files define when Claude should trigger the tools, and they instruct Claude to run Node.js CLI scripts via the Bash tool. The scripts share a common input parser (hybrid JSON stdin + CLI flags), config loader (env vars with defaults), and output formatter. Two independent provider modules (Perplexity, DDG) feed into the shared formatter, which normalizes results into Claude Code's expected XML output format. WebFetch is a separate, independent script with its own Readability-plus-Turndown content pipeline.

**Major components:**
1. SKILL.md definitions (x2) -- trigger matching and script invocation instructions
2. Input Parser -- hybrid JSON stdin / CLI flag parsing with Zod validation
3. Perplexity Provider -- Sonar API Chat Completions with citation extraction
4. DDG Lite Provider -- HTML scraping with cheerio, structural selectors
5. Output Formatter -- normalizes both providers into Claude Code's `<search_results>` format
6. WebFetch pipeline -- Readability content extraction + Turndown HTML-to-Markdown + LLM summarization
7. Retry utility -- exponential backoff with full jitter, shared across providers

### Critical Pitfalls

1. **Perplexity rate limits are aggressive (50 RPM at Tier 0)** -- implement exponential backoff with jitter from day one; parse rate limit headers; fall back to DDG on 429 after max retries
2. **DDG Lite HTML changes without notice** -- use structural selectors (table row positions), never class-based selectors; validate that parsed results are non-empty; treat DDG as best-effort fallback
3. **Plugin directory structure misplacement** -- only `plugin.json` goes in `.claude-plugin/`; skills, scripts, and all other components live at plugin root; test with `claude plugin validate`
4. **Readability returns null on many real-world pages** -- always handle null; fall back to raw Turndown conversion; pass URL to JSDOM for relative URL resolution
5. **Skill description truncation prevents auto-invocation** -- keep descriptions under 200 characters with key trigger phrases first; descriptions are truncated at 1,536 characters combined

## Implications for Roadmap

Based on research, the following phase structure respects dependency ordering and delivers testable increments at each step.

### Phase 1: Plugin Skeleton and Infrastructure
**Rationale:** The plugin directory structure is the foundation -- without correct structure, nothing can be tested in Claude Code. Infrastructure (config, input parsing, output formatting) is shared by all providers and must exist first.
**Delivers:** Installable plugin with correct structure, SKILL.md files, shared utilities for input parsing, config loading (env vars), output formatting, and retry logic with jitter.
**Addresses:** Plugin installation, skill discovery, JSON stdin input, env var config, error/output separation
**Avoids:** Pitfall 3 (directory misplacement), Pitfall 4 (backoff without jitter), Pitfall 8 (skill description truncation), Pitfall 9 (config precedence)

### Phase 2: WebSearch with Perplexity Provider
**Rationale:** Perplexity is the primary provider and defines the canonical output format. Building it first establishes the `<search_results>` XML format that DDG results must also match.
**Delivers:** Working WebSearch via Perplexity Sonar API with citation extraction, domain filtering, rate limit handling, and DDG fallback.
**Uses:** `@perplexity-ai/perplexity_ai@2.x`, Commander.js, Zod
**Implements:** Perplexity Provider, DDG Lite Provider, Output Formatter
**Avoids:** Pitfall 1 (Perplexity rate limits), Pitfall 2 (DDG HTML changes)

### Phase 3: WebFetch Content Pipeline
**Rationale:** WebFetch is independent of WebSearch -- it has its own script, its own data flow, and its own dependencies (Readability, Turndown). Building it separately keeps the scope tight and testable.
**Delivers:** Working WebFetch with HTML-to-Markdown conversion, URL normalization, and summarized answer output.
**Uses:** `@mozilla/readability@0.6.x`, `jsdom@25.x`, `turndown@7.2.x`, `turndown-plugin-gfm@1.0.x`
**Implements:** WebFetch pipeline (fetch -> Readability -> Turndown -> LLM summarization)
**Avoids:** Pitfall 5 (Readability null), Pitfall 6 (Turndown code/table conflict)

### Phase 4: Polish, Caching, and Distribution
**Rationale:** Caching, config file support, CLI flags, and marketplace packaging are enhancements that belong after core functionality works. Distribution testing validates that `${CLAUDE_PLUGIN_ROOT}` paths survive marketplace installation.
**Delivers:** Optional caching with TTL and eviction, config file support, CLI flag input for testing, marketplace-ready packaging.
**Avoids:** Pitfall 7 (plugin caching breaks paths), Pitfall 10 (stale cache results)

### Phase Ordering Rationale

- Phase 1 must come first because the Claude Code plugin structure is non-negotiable and shared utilities are needed by everything else
- Phase 2 (WebSearch) comes before Phase 3 (WebFetch) because WebSearch has the more complex two-tier provider architecture; establishing its output format first means WebFetch can reuse the formatter patterns
- Phase 3 (WebFetch) is independent enough to build in parallel with Phase 2 if velocity allows, since it shares only the infrastructure from Phase 1
- Phase 4 (polish) is last because caching, config files, and distribution packaging are enhancements that should not block functional validation

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2:** DDG Lite HTML structure must be verified at implementation time (community sources, not official API docs); the exact CSS selectors for cheerio parsing need live testing against current DDG Lite HTML
- **Phase 3:** WebFetch summarized answer requires deciding how to route content through an LLM -- this is the single highest-complexity feature and needs design validation (which model? local API call? Perplexity again?)
- **Phase 4:** Marketplace distribution testing requires access to Claude Code marketplace workflows; `${CLAUDE_PLUGIN_DATA}` npm install pattern needs validation

Phases with standard patterns (skip research-phase):
- **Phase 1:** Plugin structure and shared utilities are well-documented in official Claude Code docs; input parsing and retry logic are standard Node.js patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified against npm registry and official docs; exact versions confirmed. Perplexity SDK, Readability+jsdom, Turndown are battle-tested combinations. |
| Features | HIGH | Input/output schemas confirmed from multiple sources: wong2 gist (reverse-engineered Claude Code runtime), official tools reference, and Mikhail.io deep-dive. Three independent sources agree on format. |
| Architecture | HIGH | Plugin structure confirmed from official Claude Code docs (code.claude.com). Skill-to-script pattern is the documented standard. Two-tier provider fallback is a well-known pattern. |
| Pitfalls | HIGH | Perplexity rate limits from official docs; Claude Code plugin gotchas from official docs; DDG scraping fragility from community sources (MEDIUM); Readability null handling from library docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **WebFetch summarization model:** The built-in WebFetch routes content through Haiku 3.5 for summarization. The plugin needs to decide: call the same Anthropic API? Use Perplexity for summarization? Use a different approach? This is the highest-uncertainty design decision and should be validated in Phase 3 planning.
- **DDG Lite exact HTML selectors:** Community sources describe the DDG Lite table structure but the exact selectors must be verified at implementation time. Plan for a short exploration spike at the start of DDG implementation.
- **Perplexity `search_results` vs `citations`:** The Perplexity API returns both a `citations` array and a `search_results` array with structured data. The output formatter needs to map these correctly to Claude Code's `<result><title>...<url>...</result>` format -- the exact mapping should be validated with a live API call during Phase 2.
- **Marketplace installation testing:** All path patterns (`${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`) are documented but cannot be fully validated until Phase 4 distribution testing.

## Sources

### Primary (HIGH confidence)
- code.claude.com/docs/en/plugins -- Plugin manifest schema, directory structure, skill definitions, hooks
- code.claude.com/docs/en/plugins-reference -- Plugin system rules, path variables, skill namespacing
- code.claude.com/docs/en/skills -- Skill development, SKILL.md format, invocation patterns
- code.claude.com/docs/en/tools-reference -- WebSearch/WebFetch input schemas and behavior
- docs.perplexity.ai -- Sonar API reference, rate limits, error handling, OpenAI compatibility
- @perplexity-ai/perplexity_ai (GitHub) -- SDK API, typed responses, streaming
- wong2 gist (Claude Code tool definitions) -- Reverse-engineered exact WebSearch/WebFetch schemas and output formats
- Mikhail.io (Claude Code Web Tools internals) -- Verified behavioral notes on output format, Haiku summarization, caching
- AWS Architecture Blog (Exponential Backoff and Jitter) -- Full Jitter strategy, thundering herd prevention

### Secondary (MEDIUM confidence)
- guessless.dev (DDG Lite architecture) -- HTML structure, POST form submission
- crawlbase.com (DDG scraping challenges) -- Anti-scraping measures, User-Agent requirements
- help.apiyi.com (MCP comparison guide) -- Competitive feature analysis

### Tertiary (LOW confidence)
- DDG Lite exact CSS selectors -- must be verified at implementation time
- Turndown code/table conflict behavior -- anecdotal, needs testing with real HTML

---
*Research completed: 2026-05-20*
*Ready for roadmap: yes*
