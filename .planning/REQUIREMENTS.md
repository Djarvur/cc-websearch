# Requirements: cc-websearch

**Defined:** 2026-05-20
**Core Value:** Exact drop-in replacement for Claude Code's WebSearch and WebFetch — same interface, same output format, no behavior changes for the user.

## v1 Requirements

### Plugin Structure

- [ ] **PLUG-01**: Plugin installs via `claude plugin add` with correct `.claude-plugin/plugin.json` manifest
- [ ] **PLUG-02**: WebSearch skill defined in `skills/websearch/SKILL.md`, invokes script via `node "${CLAUDE_SKILL_DIR}/../scripts/websearch.js"` using Bash tool
- [ ] **PLUG-03**: WebFetch skill defined in `skills/webfetch/SKILL.md`, invokes script via `node "${CLAUDE_SKILL_DIR}/../scripts/webfetch.js"` using Bash tool
- [ ] **PLUG-04**: Scripts accept JSON on stdin matching exact Claude Code tool schemas
- [ ] **PLUG-05**: Scripts output results to stdout, errors and logs to stderr

### WebSearch

- [ ] **SRCH-01**: Script accepts `{query: string (required, >= 2 chars), allowed_domains?: string[], blocked_domains?: string[]}`
- [ ] **SRCH-02**: Script outputs `<search_results>` XML format with `<result>`, `<title>`, `<url>` tags matching Claude Code exactly
- [x] **SRCH-03**: `allowed_domains` and `blocked_domains` cannot be combined in same call — returns error if both provided
- [ ] **SRCH-04**: Perplexity Chat Completions API as primary search provider — extracts results from response citations and content
- [x] **SRCH-05**: DuckDuckGo Lite HTML scraping as fallback when Perplexity unavailable, no API key, or credits exhausted
- [x] **SRCH-06**: Domain filtering applied post-results for DDG, via `search_domain_filter` API param for Perplexity
- [x] **SRCH-07**: Exponential backoff with full jitter retry on rate limit (429) responses from either provider
- [x] **SRCH-08**: Two-tier fallback: Perplexity → DDG → fail cleanly with error message to stderr

### WebFetch

- [x] **FTEC-01**: Script accepts `{url: string (required), prompt: string (required)}`
- [x] **FTEC-02**: URL normalization: HTTP auto-upgraded to HTTPS
- [ ] **FTEC-03**: HTML-to-Markdown conversion using Readability (content extraction) + Turndown (HTML→MD), with fallback to raw Turndown when Readability returns null
- [ ] **FTEC-04**: LLM summarization via Perplexity Chat Completions — sends extracted markdown + user prompt, returns summarized answer (not raw content)
- [x] **FTEC-05**: Same-host redirects followed automatically; cross-host redirects return redirect metadata instead of following

### Config & Infrastructure

- [ ] **CONF-01**: API keys read from environment variables (`PPLX_API_KEY`, etc.) as primary config source
- [ ] **CONF-02**: Config file at `~/.config/websearch/config.json` with env variable override (env > file > defaults)
- [ ] **CONF-03**: Config file supports: API keys, retry params (max retries, base delay, max delay), Perplexity model selection, log level
- [ ] **CONF-04**: Configurable logging levels (debug, info, warn, error) output to stderr

## v2 Requirements

### Caching

- **CACH-01**: Optional result caching with configurable cache directory, disabled by default
- **CACH-02**: Cache TTL configurable per-provider (search results vs fetched pages)

### Developer Experience

- **DEVX-01**: CLI flags for testing outside Claude Code (`--query`, `--url`, `--prompt`, `--allowed-domains`, `--blocked-domains`)

## Out of Scope

| Feature | Reason |
|---------|--------|
| MCP server implementation | Skills invoke CLI scripts directly — simpler, no transport layer needed |
| Additional search providers (Google, Bing) | Two-tier fallback covers use cases; adding providers is scope creep |
| Auto-following links from search results | Violates WebSearch/WebFetch separation of concerns |
| Raw content return from WebFetch | Built-in WebFetch never returns raw content; breaking contract breaks Claude's expectations |
| Three-tier or deeper fallback chains | Adds complexity without proportional value |
| Streaming results | Architecturally different from CLI script output; future consideration |
| Custom search backend configuration | Increases testing burden and config complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLUG-01 | Phase 1 | Pending |
| PLUG-02 | Phase 1 | Pending |
| PLUG-03 | Phase 1 | Pending |
| PLUG-04 | Phase 1 | Pending |
| PLUG-05 | Phase 1 | Pending |
| SRCH-01 | Phase 1 | Pending |
| SRCH-02 | Phase 1 | Pending |
| SRCH-03 | Phase 2 | Done |
| SRCH-04 | Phase 1 | Pending |
| SRCH-05 | Phase 2 | Complete |
| SRCH-06 | Phase 2 | Done |
| SRCH-07 | Phase 2 | Complete |
| SRCH-08 | Phase 2 | Complete |
| FTEC-01 | Phase 3 | Done |
| FTEC-02 | Phase 3 | Done |
| FTEC-03 | Phase 3 | Pending |
| FTEC-04 | Phase 3 | Pending |
| FTEC-05 | Phase 3 | Done |
| CONF-01 | Phase 1 | Pending |
| CONF-02 | Phase 4 | Pending |
| CONF-03 | Phase 4 | Pending |
| CONF-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-05-20*
*Last updated: 2026-05-20 after roadmap creation*
