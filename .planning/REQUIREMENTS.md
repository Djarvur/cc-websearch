# Requirements: cc-websearch

**Defined:** 2026-05-22
**Core Value:** DDG-powered drop-in replacement for Claude Code's WebSearch and WebFetch — same interface, same output format, works on all providers.

## v1.1 Requirements (Shipped)

### Plugin Distribution

- [x] **DIST-01**: esbuild outputs bundles to `skills/websearch/scripts/websearch.cjs` and `skills/webfetch/scripts/webfetch.cjs`
- [x] **DIST-02**: SKILL.md command paths use `${CLAUDE_PLUGIN_ROOT}/skills/<name>/scripts/<bundle>.cjs`
- [x] **DIST-03**: README examples and installation instructions reflect new script locations
- [x] **DIST-04**: Path-dependent tests updated for new bundle locations
- [x] **DIST-05**: Old `scripts/` root directory removed after bundles relocated
- [x] **DIST-06**: `npm run build` and `npm run check` pass clean

## v1.2 Requirements

Requirements for replacing built-in WebSearch and WebFetch with plugin skills via PreToolUse hooks.

### Hook Infrastructure

- [ ] **HOOK-01**: Plugin registers PreToolUse hook that denies built-in WebSearch tool calls with a redirect reason instructing Claude to use the plugin skill
- [ ] **HOOK-02**: Plugin registers PreToolUse hook that denies built-in WebFetch tool calls with a redirect reason instructing Claude to use the plugin skill
- [ ] **HOOK-03**: Hook configuration is inline in plugin.json (no external shell scripts or jq dependency)
- [ ] **HOOK-04**: Hook matcher uses exact case-sensitive tool names (`WebSearch|WebFetch`)

### Redirect Reliability

- [x] **RDIR-01**: Denial reason text reliably redirects Claude to invoke the plugin's websearch skill across diverse prompt patterns
- [x] **RDIR-02**: Denial reason text reliably redirects Claude to invoke the plugin's webfetch skill across diverse prompt patterns
- [x] **RDIR-03**: WebSearch SKILL.md description reinforces skill availability and purpose when built-in tool is unavailable
- [x] **RDIR-04**: WebFetch SKILL.md description reinforces skill availability and purpose when built-in tool is unavailable

### Output & Compatibility

- [x] **OUTP-01**: WebSearch skill output format verified to match built-in tool's XML format
- [x] **OUTP-02**: WebFetch skill output format verified to match built-in tool's output (markdown content, not structured JSON)
- [x] **OUTP-03**: Plugin works identically across all Claude Code providers (Anthropic, OpenAI-compatible, self-hosted)
- [x] **OUTP-04**: WebFetch implements content truncation at 100KB to match built-in tool behavior

## Future Requirements

### Deferred to v1.x+

- **TELEM-01**: Redirect success telemetry — measure how often denial reason leads to skill invocation
- **CACHE-01**: Caching parity with built-in WebFetch's 15-minute cache
- **FALL-01**: Fallback to built-in tool if DDG is down (skip deny)

### Deferred to v2+

- **NATIVE-01**: Migrate to official tool replacement API if Claude Code adds one
- **PROVID-01**: Additional search providers beyond DDG

## Out of Scope

| Feature | Reason |
|---------|--------|
| MCP server implementation | Skills call CLI scripts directly, no MCP transport. MCP tools cannot match built-in tool names. |
| Perplexity or other search providers | DDG-only is the designed architecture since v1.0 |
| LLM summarization for WebFetch | Built-in uses Haiku pass; plugin returns raw markdown by design |
| Auto-following links from search results | WebFetch is standalone |
| Modifying user's settings.json | Plugin cannot automate `permissions.deny` — that's manual user config |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HOOK-01 | Phase 10 | Pending |
| HOOK-02 | Phase 10 | Pending |
| HOOK-03 | Phase 10 | Pending |
| HOOK-04 | Phase 10 | Pending |
| RDIR-01 | Phase 11 | Complete |
| RDIR-02 | Phase 11 | Complete |
| RDIR-03 | Phase 11 | Complete |
| RDIR-04 | Phase 11 | Complete |
| OUTP-01 | Phase 12 | Complete |
| OUTP-02 | Phase 12 | Complete |
| OUTP-03 | Phase 12 | Complete |
| OUTP-04 | Phase 12 | Complete |

**Coverage:**
- v1.2 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-05-22*
*Last updated: 2026-05-22 after v1.2 roadmap creation*
