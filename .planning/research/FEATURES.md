# Feature Research

**Domain:** Claude Code plugin -- drop-in replacement for built-in WebSearch and WebFetch tools
**Researched:** 2026-05-20
**Confidence:** HIGH

## Claude Code Built-in Tool Definitions (Authoritative)

These schemas are the ground truth. The plugin MUST produce identical output for identical inputs.

### WebSearch -- Exact Input Schema

Source: wong2 gist (Claude Code tool definitions, last updated May 2026) + code.claude.com/docs/en/tools-reference

```json
{
  "query": "string (required, >= 2 chars)",
  "allowed_domains": "string[] (optional, allow-list)",
  "blocked_domains": "string[] (optional, block-list)"
}
```

**WebSearch behavioral notes from official tools reference:**

- Runs query against Anthropic's web search backend
- Returns result titles and URLs only (does NOT fetch result pages)
- May issue up to 8 backend searches per call, refining internally before returning
- `allowed_domains` and `blocked_domains` cannot be combined in a single call
- Search backend is not configurable
- Permission rule format: bare `WebSearch` (no specifier)

**WebSearch output format** (from Mikhail.io deep-dive + wong2 gist system prompt):

```
<search_results>
query: "<query text>"
<result>
title: "<page title>"
url: "<page url>"
</result>
<result>
title: "<page title>"
url: "<page url>"
</result>
...
</search_results>
```

The output uses a structured XML-like tag format with `<search_results>`, `<result>`, `<title>`, and `<url>` tags. The system prompt instructs Claude to use the results to inform responses and include markdown hyperlinks in its answer text.

### WebFetch -- Exact Input Schema

Source: wong2 gist + code.claude.com/docs/en/tools-reference

```json
{
  "url": "string (required)",
  "prompt": "string (required, question to answer from fetched content)"
}
```

**WebFetch behavioral notes from official tools reference:**

- Takes URL and prompt describing what to extract
- Fetches page, converts HTML to Markdown (non-configurable)
- Runs the prompt against content using a small, fast model (Haiku 3.5 per Mikhail.io)
- Returns model's answer, NOT raw page content
- HTTP URLs auto-upgraded to HTTPS
- Large pages truncated to fixed character limit before processing
- 15-minute cache for repeated fetches of same URL
- Cross-host redirects: returns redirect metadata instead of following (Claude must make second call)
- Same-host redirects followed automatically
- Sets User-Agent header starting with `Claude-User`
- Sets Accept header preferring Markdown over HTML
- Permission rule format: `WebFetch(domain:example.com)`

**WebFetch output format:**
A text summary answering the prompt based on fetched content. NOT raw HTML/Markdown. The answer is the Haiku model's response.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or breaks existing Claude Code workflows.

| Feature                                        | Why Expected                                                          | Complexity | Notes                                                                       |
| ---------------------------------------------- | --------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| WebSearch accepts `query` string               | This is the primary input parameter for WebSearch                     | LOW        | Must match exact schema: `query: string (required, >= 2 chars)`             |
| WebSearch returns structured results           | Claude Code's agent expects the specific output format                | MEDIUM     | XML-like `<search_results>` blocks with `<result>`, `<title>`, `<url>` tags |
| WebSearch domain filtering (`allowed_domains`) | Built-in tool supports this; agents use it to scope searches          | MEDIUM     | Cannot combine with `blocked_domains` in same call                          |
| WebSearch domain filtering (`blocked_domains`) | Built-in tool supports this; agents use it to exclude domains         | MEDIUM     | Cannot combine with `allowed_domains` in same call                          |
| WebFetch accepts `url` + `prompt`              | These are the required input parameters for WebFetch                  | LOW        | `url: string (required)`, `prompt: string (required)`                       |
| WebFetch returns summarized answer             | WebFetch does NOT return raw content, returns an AI-summarized answer | HIGH       | Requires running content through an LLM with a summarization prompt         |
| WebFetch HTML-to-Markdown conversion           | Built-in tool converts HTML to Markdown before processing             | MEDIUM     | Turndown library is standard approach                                       |
| WebFetch auto-upgrades HTTP to HTTPS           | Built-in behavior, users expect secure connections                    | LOW        | Simple URL normalization                                                    |
| Plugin installs via `claude plugin add`        | Standard Claude Code plugin distribution mechanism                    | LOW        | Plugin must follow standard directory structure                             |
| Skill invokes CLI script via `node`            | Plugin skills call Node.js scripts using `node` command               | LOW        | Scripts in skill directory, referenced via `${CLAUDE_SKILL_DIR}`            |
| JSON on stdin matching tool schema             | Claude Code calls skills with tool input as JSON on stdin             | MEDIUM     | Must parse JSON matching exact WebSearch/WebFetch schemas                   |
| Output on stdout, errors on stderr             | Clean separation so Claude gets results, not diagnostics              | LOW        | stdout = tool output, stderr = debug/error logging                          |

### Differentiators (Competitive Advantage)

Features that set the plugin apart from the built-in tools.

| Feature                                         | Value Proposition                                                       | Complexity | Notes                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------- | ---------- | ----------------------------------------------------------- |
| Perplexity Chat Completions as primary provider | Structured search results with citations, higher quality than built-in  | MEDIUM     | Chat Completions endpoint, not Ask API                      |
| DuckDuckGo Lite HTML scraping as fallback       | Works without API keys, no cost, always available                       | MEDIUM     | Scrapes HTML results, parses titles and URLs                |
| Two-tier fallback (Perplexity -> DDG -> fail)   | Resilience: works with/without API keys, handles rate limits gracefully | MEDIUM     | Clean degradation, no silent failures                       |
| Configurable caching                            | Saves API credits on repeat queries, faster responses                   | LOW        | Optional, disabled by default, cache directory configurable |
| Configurable logging levels                     | Debug rate limits, fallbacks, and errors without noise                  | LOW        | stderr logging with levels (debug, info, warn, error)       |
| CLI flag input (in addition to JSON stdin)      | Makes scripts testable outside Claude Code, developer convenience       | LOW        | `--query "..."`, `--url "..."`, `--prompt "..."`            |
| Exponential backoff with jitter                 | Prevents thundering herd on rate-limited APIs                           | LOW        | Standard retry strategy                                     |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this specific project.

| Feature                                          | Why Requested                             | Why Problematic                                                                                  | Alternative                                                  |
| ------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| MCP server implementation                        | MCP is the standard for tool integration  | PROJECT.md explicitly scopes this out; skills+CLI is simpler and sufficient                      | Use skills that invoke CLI scripts directly                  |
| Additional search providers (Google, Bing, etc.) | More providers = more resilience          | Scope creep; two-tier fallback covers the use case well                                          | Perplexity + DDG is sufficient                               |
| Auto-following links from search results         | Convenience of one-step search-to-content | Violates the WebSearch/WebFetch separation; each tool has distinct responsibility                | WebSearch returns links, WebFetch fetches them separately    |
| Returning raw HTML/Markdown from WebFetch        | Users sometimes want full page content    | Built-in WebFetch NEVER returns raw content; breaking this contract breaks Claude's expectations | Return summarized answer only, matching built-in behavior    |
| Three-tier or deeper fallback chains             | Even more resilience                      | Out of scope per PROJECT.md; adds complexity without proportional value                          | Two tiers (Perplexity -> DDG -> fail cleanly)                |
| Custom search backend configuration              | Let users choose their search engine      | Increases surface area, testing burden, and config complexity                                    | Fixed providers with env-based config for API keys           |
| Streaming results                                | Faster perceived response time            | Skills invoke CLI scripts; streaming from a script is architecturally different                  | Return complete results; streaming is a future consideration |

## Feature Dependencies

```
[Plugin installation structure]
    |
    v
[Skill definitions (SKILL.md)]
    |
    v
[CLI scripts (websearch, webfetch)]
    |
    +---> [JSON stdin parsing] --> [WebSearch schema handling]
    |                              |
    |                              +---> [Perplexity API client]
    |                              |         |
    |                              |         +---> [Exponential backoff + jitter]
    |                              |         |
    |                              |         v
    |                              |     [Result parsing -> XML output format]
    |                              |
    |                              +---> [DDG Lite scraper] (fallback)
    |                                        |
    |                                        v
    |                                    [Result parsing -> XML output format]
    |
    +---> [JSON stdin parsing] --> [WebFetch schema handling]
                                   |
                                   +---> [URL normalization (HTTP->HTTPS)]
                                   |
                                   +---> [HTML fetch + Turndown conversion]
                                   |
                                   +---> [Summarization prompt to LLM]
                                   |
                                   v
                               [Summarized text output]

[Config file support] --enhances--> [Perplexity API client]
[Config file support] --enhances--> [Caching]
[Config file support] --enhances--> [Logging]

[CLI flag input] --independent--> [Testing outside Claude Code]
```

### Dependency Notes

- **Plugin installation requires skill definitions:** Claude Code discovers tools through skills; without proper SKILL.md files, the plugin is invisible
- **Skill definitions require CLI scripts:** SKILL.md invokes scripts via `node ${CLAUDE_SKILL_DIR}/scripts/...`; scripts must exist and produce correct output
- **WebSearch requires Perplexity or DDG:** At least one provider must work; DDG is the zero-config fallback
- **WebFetch requires Turndown + a summarization model:** HTML-to-Markdown conversion is standard (Turndown), but the summarization step requires either calling an LLM or finding another approach
- **Config support enhances but is not required for launch:** API keys can come from environment variables initially
- **CLI flags are independent of JSON stdin:** Both input methods feed into the same processing pipeline

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the concept as a drop-in replacement.

- [ ] Plugin directory structure with SKILL.md for websearch and webfetch skills -- Claude Code must discover and invoke them
- [ ] WebSearch CLI script accepting JSON on stdin matching `{query, allowed_domains?, blocked_domains?}` -- matches exact Claude Code schema
- [ ] WebSearch outputting `<search_results>` XML format on stdout -- matches exact Claude Code output format
- [ ] WebSearch Perplexity Chat Completions integration -- primary search provider with structured results
- [ ] WebSearch DDG Lite HTML scraping fallback -- works without API key
- [ ] WebSearch domain filtering (`allowed_domains`, `blocked_domains`) -- must match built-in behavior
- [ ] WebFetch CLI script accepting JSON on stdin matching `{url, prompt}` -- matches exact Claude Code schema
- [ ] WebFetch URL normalization (HTTP->HTTPS) -- matches built-in behavior
- [ ] WebFetch HTML-to-Markdown conversion (Turndown) -- standard approach matching built-in
- [ ] WebFetch summarized answer output -- matches built-in behavior (NOT raw content)
- [ ] Exponential backoff with jitter for rate limits -- prevents API failures from cascading
- [ ] Environment variable config for API keys -- minimal config, works immediately

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Config file support at `~/.config/websearch/config.json` -- trigger: users want persistent config beyond env vars
- [ ] Optional caching with configurable cache directory -- trigger: users running repeated queries
- [ ] Configurable logging levels -- trigger: users need to debug rate limits or fallbacks
- [ ] CLI flag input for testing outside Claude Code -- trigger: developer convenience during development

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Streaming results -- requires architectural changes to skill -> CLI pipeline
- [ ] Additional search providers -- trigger: users specifically request a provider not covered
- [ ] WebFetch cross-domain redirect following -- trigger: users report issues with redirect chains

## Feature Prioritization Matrix

| Feature                                 | User Value | Implementation Cost | Priority |
| --------------------------------------- | ---------- | ------------------- | -------- |
| WebSearch JSON stdin + XML output       | HIGH       | MEDIUM              | P1       |
| WebSearch Perplexity integration        | HIGH       | MEDIUM              | P1       |
| WebSearch DDG Lite fallback             | HIGH       | MEDIUM              | P1       |
| WebSearch domain filtering              | MEDIUM     | LOW                 | P1       |
| WebFetch JSON stdin + URL normalization | HIGH       | LOW                 | P1       |
| WebFetch HTML-to-Markdown (Turndown)    | HIGH       | MEDIUM              | P1       |
| WebFetch summarized answer              | HIGH       | HIGH                | P1       |
| Plugin directory + SKILL.md files       | HIGH       | LOW                 | P1       |
| Exponential backoff with jitter         | MEDIUM     | LOW                 | P1       |
| Environment variable config             | HIGH       | LOW                 | P1       |
| Config file support                     | MEDIUM     | LOW                 | P2       |
| Optional caching                        | LOW        | LOW                 | P2       |
| Configurable logging                    | MEDIUM     | LOW                 | P2       |
| CLI flag input                          | LOW        | LOW                 | P2       |
| Streaming results                       | LOW        | HIGH                | P3       |

**Priority key:**

- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature                 | Built-in WebSearch/WebFetch                | Brave Search MCP        | Tavily MCP                  | cc-websearch (This Plugin)                                |
| ----------------------- | ------------------------------------------ | ----------------------- | --------------------------- | --------------------------------------------------------- |
| Search provider         | Anthropic proprietary backend              | Brave independent index | AI-optimized results        | Perplexity + DDG fallback                                 |
| Requires API key        | No (built-in)                              | Yes (2K free/month)     | Yes (1K free/month)         | Optional (DDG works without key)                          |
| Domain filtering        | Yes (`allowed_domains`, `blocked_domains`) | Yes                     | Yes                         | Yes (must match exactly)                                  |
| Returns raw content     | No (WebFetch summarizes)                   | Varies by tool          | Yes (extracts core content) | No (matches built-in: summarizes)                         |
| Works on Bedrock/Vertex | No (WebSearch hidden)                      | Yes (MCP)               | Yes (MCP)                   | Yes (plugin-based)                                        |
| Zero config             | Yes (built-in)                             | No (MCP setup)          | No (MCP setup)              | Almost (env var for API key, DDG fallback is zero-config) |
| Caching                 | 15-min built-in cache                      | No                      | No                          | Optional, configurable                                    |
| Fallback providers      | Single backend                             | Single backend          | Single backend              | Two-tier (Perplexity -> DDG)                              |

## Sources

- **wong2 gist** (Claude Code tool definitions + system prompt): https://gist.github.com/wong2/e0f34aac66caf890a332f7b6f9e2ba8f -- HIGH confidence, direct reverse-engineering of Claude Code's runtime
- **code.claude.com/docs/en/tools-reference** -- HIGH confidence, official Anthropic documentation
- **code.claude.com/docs/en/skills** -- HIGH confidence, official Anthropic documentation for skill/plugin format
- **Mikhail.io deep-dive** (Claude Code Web Tools internals): https://mikhail.io/2025/10/claude-code-web-tools/ -- HIGH confidence, detailed reverse-engineering with verified observations
- **platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool** -- HIGH confidence, official Anthropic API docs (note: API server-side tool, not identical to Claude Code client tool, but schemas align)
- **platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool** -- HIGH confidence, official Anthropic API docs
- **help.apiyi.com MCP comparison guide**: https://help.apiyi.com/en/claude-code-web-search-websearch-mcp-guide-en.html -- MEDIUM confidence, secondary analysis

---

_Feature research for: Claude Code web search plugin_
_Researched: 2026-05-20_
