# Roadmap: cc-websearch

## Overview

Build a Claude Code plugin that replaces the built-in WebSearch and WebFetch tools with Perplexity API as primary search provider and DuckDuckGo Lite as fallback. The journey starts with a working plugin skeleton and primary search capability, adds resilience through DDG fallback and domain filtering, delivers the independent WebFetch content pipeline, and finishes with config file support and configurable logging.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Plugin Foundation and Primary Search** - Installable plugin with Perplexity-powered WebSearch producing Claude Code output format (completed 2026-05-19)
- [ ] **Phase 2: Search Resilience** - DuckDuckGo fallback, domain filtering, and retry logic for rate limits
- [ ] **Phase 3: WebFetch Content Pipeline** - Page fetching, content extraction, markdown conversion, and LLM summarization
- [ ] **Phase 4: Config File and Logging** - Config file support with env override and configurable log levels

## Phase Details

### Phase 1: Plugin Foundation and Primary Search

**Goal**: Users can install the plugin and perform web searches via Perplexity that return results in Claude Code's exact format
**Mode**: mvp
**Depends on**: Nothing (first phase)
**Requirements**: PLUG-01, PLUG-02, PLUG-03, PLUG-04, PLUG-05, CONF-01, CONF-04, SRCH-01, SRCH-02, SRCH-04
**Success Criteria** (what must be TRUE):

  1. Plugin installs via `claude plugin add` and both WebSearch and WebFetch skills appear in Claude Code
  2. WebSearch skill accepts a JSON query on stdin and outputs `<search_results>` XML with title/URL pairs to stdout
  3. WebSearch returns real search results from Perplexity API using the PPLX_API_KEY environment variable
  4. Errors and diagnostic messages go to stderr while search results go to stdout -- no cross-contamination
  5. Script accepts JSON on stdin matching Claude Code's exact WebSearch tool schema

**Plans**: 2 plans

Plans:

- [x] 01-01: Plugin scaffold -- manifest, skill definitions, shared libraries (input/output/logger), build pipeline, WebFetch stub
- [x] 01-02: Perplexity integration -- API client wrapper, WebSearch entry point, API key configuration, end-to-end wiring

### Phase 2: Search Resilience

**Goal**: WebSearch gracefully degrades when Perplexity is unavailable and supports domain filtering matching Claude Code's interface
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: SRCH-03, SRCH-05, SRCH-06, SRCH-07, SRCH-08
**Success Criteria** (what must be TRUE):

  1. When Perplexity returns a 429 or is unavailable, WebSearch automatically falls back to DuckDuckGo and still returns results
  2. When no API key is provided, WebSearch uses DuckDuckGo directly and returns working results
  3. User can pass `allowed_domains` or `blocked_domains` and results are filtered accordingly -- but passing both returns an error
  4. Rate-limited responses trigger exponential backoff with jitter before retry, not immediate re-attempts
  5. When both providers fail, the script exits cleanly with a descriptive error on stderr (no crash, no hang)

**Plans**: 3 plans

Plans:
**Wave 1**

- [x] 02-01: DDG fallback and retry -- install duck-duck-scrape, create DDG provider, exponential backoff module, two-tier fallback orchestration, provider comment output (completed 2026-05-20)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 02-02: Domain filtering -- filter module with normalization and subdomain matching, mutual exclusivity validation, Perplexity search_domain_filter integration

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 02-03: Partial merge and error polish -- partial result merging with URL deduplication, detailed failure messages, edge case tests

**Cross-cutting constraints:**

- D-19: Total failure error message includes provider name, error type, what was tried

### Phase 3: WebFetch Content Pipeline

**Goal**: Users can fetch web pages and receive summarized markdown content matching Claude Code's WebFetch behavior
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: FTEC-01, FTEC-02, FTEC-03, FTEC-04, FTEC-05
**Success Criteria** (what must be TRUE):

  1. WebFetch skill accepts `{url, prompt}` as JSON on stdin and returns a summarized answer to stdout
  2. HTTP URLs are automatically upgraded to HTTPS before fetching
  3. Article pages produce clean markdown output via Readability content extraction followed by Turndown conversion
  4. Non-article pages (where Readability returns null) still produce usable markdown via raw Turndown fallback
  5. Same-host redirects are followed automatically; cross-host redirects return redirect metadata instead of following

**Plans**: TBD

Plans:

- [ ] 03-01: WebFetch script skeleton -- input parsing for `{url, prompt}`, URL normalization, HTTP fetching with redirect handling
- [ ] 03-02: Content extraction pipeline -- Readability + Turndown with null fallback, Perplexity LLM summarization

### Phase 4: Config File and Logging

**Goal**: Users can configure the plugin via a config file with sensible precedence and control logging verbosity
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: CONF-02, CONF-03
**Success Criteria** (what must be TRUE):

  1. A config file at `~/.config/websearch/config.json` is read on startup and its values are applied to API keys, retry params, model selection, and log level
  2. Environment variables override config file values, which override defaults (env > file > defaults)
  3. Config file supports API keys, retry parameters (max retries, base delay, max delay), Perplexity model selection, and log level

**Plans**: TBD

Plans:

- [ ] 04-01: Config file loader -- read `~/.config/websearch/config.json`, merge with env vars and defaults, validate schema

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Plugin Foundation and Primary Search | 2/2 | Complete   | 2026-05-19 |
| 2. Search Resilience | 1/3 | In progress | - |
| 3. WebFetch Content Pipeline | 0/2 | Not started | - |
| 4. Config File and Logging | 0/1 | Not started | - |
