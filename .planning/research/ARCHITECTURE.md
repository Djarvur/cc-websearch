# Architecture Research

**Domain:** Claude Code web search plugin
**Researched:** 2026-05-20
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Claude Code Runtime                           │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐                          │
│  │ SKILL.md         │  │ SKILL.md          │                         │
│  │ (websearch)      │  │ (webfetch)        │                         │
│  └────────┬────────┘  └────────┬─────────┘                          │
│           │  Bash tool invocation │                                   │
│           │  node ${CLAUDE_SKILL_DIR}/../scripts/websearch.ts       │
│           ▼                       ▼                                   │
├──────────────────────────────────────────────────────────────────────┤
│                      CLI Script Layer (Node/TypeScript)              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     Input Parser                             │    │
│  │  CLI flags (simple) ──┐    ┌── JSON stdin (tool schema)     │    │
│  │                       └──►│──┘                               │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                        │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │                     Config Loader                            │    │
│  │  ~/.config/websearch/config.json ──► env vars fallback       │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                        │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │                     Cache Layer (optional)                   │    │
│  │  File-based cache ── hit? ──► return cached result           │    │
│  │                    miss? ──► continue to provider            │    │
│  └──────────────┬───────────────────────────┬──────────────────┘    │
│                 │                           │                        │
│  ┌──────────────▼──────────┐  ┌─────────────▼──────────────────┐   │
│  │  Perplexity Provider    │  │  DuckDuckGo Lite Provider      │   │
│  │  (primary)              │  │  (fallback)                    │   │
│  │  POST /v1/sonar         │  │  GET lite.duckduckgo.com       │   │
│  │  OpenAI-compatible      │  │  HTML scraping w/ cheerio      │   │
│  └──────────────┬──────────┘  └─────────────┬──────────────────┘   │
│                 │                           │                        │
│  ┌──────────────▼───────────────────────────▼──────────────────┐   │
│  │                     Output Formatter                         │    │
│  │  Markdown to stdout (results)  │  JSON to stderr (errors)    │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| SKILL.md (x2) | Define when/how Claude invokes scripts, pass arguments, declare allowed tools | YAML frontmatter + markdown instructions |
| Input Parser | Accept hybrid input: CLI flags for simple use, JSON on stdin matching Claude Code tool schema | Commander.js or manual argv/stdin parsing |
| Config Loader | Load user config, resolve env var fallbacks, validate values | Read `~/.config/websearch/config.json`, merge with `PERPLEXITY_API_KEY` etc. env vars |
| Cache Layer | Optional disk cache for repeat queries; skip when not configured | File-based: hash query params as cache key, store TTL-stamped JSON in configurable cache dir |
| Perplexity Provider | Primary search via Sonar API; OpenAI-compatible Chat Completions with citations | `POST https://api.perplexity.ai/v1/sonar` with `search_domain_filter`, `search_recency_filter` |
| DDG Lite Provider | Fallback search via DuckDuckGo Lite HTML scraping; no API key needed | `GET https://lite.duckduckgo.com/lite/` with cheerio parsing |
| WebFetch Script | Standalone page retrieval, HTML-to-markdown conversion | Readability + Turndown pipeline |
| Retry Logic | Exponential backoff with jitter for rate limit responses from any provider | Custom retry wrapper around fetch calls |
| Output Formatter | Produce exact Claude Code WebSearch/WebFetch output format on stdout | Markdown-formatted search results with citation links |

## Recommended Project Structure

```
cc-websearch/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (name, description, version)
├── skills/
│   ├── websearch/
│   │   └── SKILL.md             # WebSearch skill definition
│   └── webfetch/
│       └── SKILL.md             # WebFetch skill definition
├── scripts/
│   ├── websearch.ts             # WebSearch CLI script (invoked by skill)
│   └── webfetch.ts              # WebFetch CLI script (invoked by skill)
├── src/
│   ├── providers/
│   │   ├── perplexity.ts        # Perplexity Sonar API integration
│   │   └── duckduckgo.ts        # DuckDuckGo Lite HTML scraping
│   ├── utils/
│   │   ├── config.ts            # Config file loading and precedence
│   │   ├── cache.ts             # Optional file-based caching
│   │   ├── retry.ts             # Exponential backoff with jitter
│   │   ├── input-parser.ts      # Hybrid CLI flags + JSON stdin parsing
│   │   └── formatter.ts         # Output formatting (Claude Code format)
│   └── types.ts                 # Shared TypeScript type definitions
├── package.json                 # Dependencies and bin entries
├── tsconfig.json                # TypeScript configuration
└── README.md                    # Installation and usage docs
```

### Structure Rationale

- **`.claude-plugin/plugin.json`**: Required by Claude Code plugin system. Only this file belongs in `.claude-plugin/` -- all other components live at plugin root.
- **`skills/`**: Each skill gets its own directory with `SKILL.md`. Claude Code auto-discovers these. Plugin skills are namespaced as `cc-websearch:websearch`.
- **`scripts/`**: Top-level CLI entry points invoked by skills via Bash tool. These are the compiled TypeScript files Claude actually runs with `node`.
- **`src/`**: TypeScript source code organized by concern. Providers, utilities, and types separated for clarity.
- **`package.json`**: Declares dependencies (cheerio, turndown, readability) and any bin entries for standalone CLI use.

## Architectural Patterns

### Pattern 1: Skill-to-Script Invocation

**What:** Skills define instructions in `SKILL.md` that tell Claude to run a Node script via the Bash tool, using `${CLAUDE_SKILL_DIR}` for path resolution.

**When to use:** Every skill that needs programmatic execution (as opposed to pure prompt instructions).

**Trade-offs:** Clean separation between prompt logic and execution logic. Skills stay lean. Scripts can be tested independently.

**Example:**
```markdown
# skills/websearch/SKILL.md
---
description: This skill should be used when the user asks to "search the web",
  "look up", "find information", or needs current information beyond training data.
allowed-tools: Bash(node *)
---

# WebSearch

Execute a web search using:

```bash
node "${CLAUDE_SKILL_DIR}/../scripts/websearch.js" --query "$ARGUMENTS"
```

For structured input matching Claude Code's WebSearch tool schema:

```bash
echo '{"query":"...","allowed_domains":[...],"blocked_domains":[...]}' | node "${CLAUDE_SKILL_DIR}/../scripts/websearch.js"
```
```

### Pattern 2: Two-Tier Provider Fallback

**What:** Primary provider (Perplexity) attempts the request first. On failure (no API key, rate limit exhausted, network error), falls back to secondary provider (DuckDuckGo Lite).

**When to use:** When reliability matters more than consistency between providers.

**Trade-offs:** Results differ between providers (Perplexity returns AI-synthesized answers with citations; DDG returns raw search result snippets). The output formatter must normalize both into Claude Code's expected format.

```
websearch.ts
    │
    ├── Try Perplexity
    │   ├── Success ──► Format citations + content ──► stdout
    │   └── Failure (no key / 429 / timeout)
    │       │
    │       └── Fall back to DDG Lite
    │           ├── Success ──► Format snippets as citations ──► stdout
    │           └── Failure ──► stderr error + exit 1
    │
    └── No Perplexity key configured
        └── Go directly to DDG Lite
```

### Pattern 3: Hybrid CLI Input

**What:** Scripts accept both CLI flags (for simple direct invocation) and JSON on stdin (for structured input matching Claude Code's tool schema).

**When to use:** When the same script needs to work both as a skill backend and as a standalone CLI tool.

**Trade-offs:** Slightly more complex input parsing, but maximizes usability.

```typescript
// Pseudo-code for input parsing
async function parseInput(): Promise<SearchInput> {
  // Check if stdin has data (piped JSON from Claude)
  if (!process.stdin.isTTY) {
    const json = await readStdin();
    return JSON.parse(json); // matches Claude Code WebSearch schema
  }
  // Fall back to CLI flags
  return {
    query: argv.query,
    allowed_domains: argv['allowed-domains']?.split(','),
    blocked_domains: argv['blocked-domains']?.split(','),
  };
}
```

### Pattern 4: Config File with Env Var Fallback

**What:** Load config from `~/.config/websearch/config.json`, with environment variables as fallback for each setting.

**When to use:** When users need persistent config but also CI/scripting use cases.

**Precedence order:** CLI flags > env vars > config file > defaults.

```jsonc
// ~/.config/websearch/config.json (example)
{
  "perplexity_api_key": "pplx-...",   // or PERPLEXITY_API_KEY env var
  "perplexity_model": "sonar",        // or PERPLEXITY_MODEL env var
  "cache_dir": "~/.cache/websearch",  // or WEBCACHE_DIR env var; omit = no cache
  "cache_ttl_seconds": 3600,          // default 1 hour
  "log_level": "warn"                 // debug | info | warn | error
}
```

## Data Flow

### WebSearch Request Flow

```
User asks Claude to "search for X"
    │
    ▼
Claude Code matches websearch skill description
    │
    ▼
Claude invokes Bash tool: node "${CLAUDE_SKILL_DIR}/../scripts/websearch.js" --query "X"
    │
    ▼
websearch.js: Parse input (flags or stdin JSON)
    │
    ▼
websearch.js: Load config (~/.config/websearch/config.json + env vars)
    │
    ▼
websearch.js: Check cache (if configured)
    │── hit ──► Return cached markdown ──► stdout
    │
    └── miss
        │
        ▼
websearch.js: Try Perplexity provider
    │
    ├── Perplexity returns citations + answer
    │       │
    │       ▼
    │   Format as Claude Code WebSearch output:
    │   "Here are the search results:\n\n[Title](URL)\nSnippet...\n\nSources:\n- [1](url1)\n- [2](url2)"
    │       │
    │       ▼
    │   Write to cache (if configured) ──► stdout
    │
    └── Perplexity fails (no key / 429 / error)
            │
            ▼
        DDG Lite provider: fetch + scrape HTML
            │
            ▼
        Parse with cheerio: extract titles, URLs, snippets
            │
            ▼
        Format as Claude Code WebSearch output
            │
            ▼
        Write to cache (if configured) ──► stdout
```

### WebFetch Request Flow

```
User asks Claude to fetch a URL
    │
    ▼
Claude Code matches webfetch skill description
    │
    ▼
Claude invokes Bash tool: node "${CLAUDE_SKILL_DIR}/../scripts/webfetch.js" --url "https://..."
    │
    ▼
webfetch.js: Parse input (flags or stdin JSON with url, format)
    │
    ▼
webfetch.js: HTTP GET the URL
    │
    ▼
webfetch.js: Extract content with Readability
    │
    ▼
webfetch.js: Convert HTML to markdown with Turndown (or plain text)
    │
    ▼
webfetch.js: Output formatted content ──► stdout
```

### Config Loading Flow

```
Script starts
    │
    ▼
Read ~/.config/websearch/config.json (if exists)
    │
    ├── File found ──► Parse JSON ──► Merge with defaults
    │
    └── File not found ──► Use defaults only
    │
    ▼
Override with environment variables (PERPLEXITY_API_KEY, etc.)
    │
    ▼
Override with CLI flags (--api-key, --model, etc.)
    │
    ▼
Final config object passed to providers
```

## Plugin Directory Structure (Claude Code Specific)

### Standard Plugin Layout for cc-websearch

```
cc-websearch/
├── .claude-plugin/
│   └── plugin.json              # Manifest: name, description, version
├── skills/
│   ├── websearch/
│   │   └── SKILL.md             # WebSearch skill
│   └── webfetch/
│       └── SKILL.md             # WebFetch skill
├── scripts/                     # Compiled JS (referenced by skills)
│   ├── websearch.js
│   └── webfetch.js
├── src/                         # TypeScript source
│   ├── providers/
│   │   ├── perplexity.ts
│   │   └── duckduckgo.ts
│   ├── utils/
│   │   ├── config.ts
│   │   ├── cache.ts
│   │   ├── retry.ts
│   │   ├── input-parser.ts
│   │   └── formatter.ts
│   └── types.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Key Plugin System Rules (from official docs)

1. **Manifest location**: `.claude-plugin/plugin.json` is the only file that belongs in `.claude-plugin/`. All other components (skills, scripts, etc.) live at the plugin root level.

2. **Skills location**: `skills/<name>/SKILL.md` at plugin root. Claude Code auto-discovers these.

3. **Skill namespacing**: Plugin skills appear as `cc-websearch:websearch` and `cc-websearch:webfetch` to prevent conflicts with other plugins.

4. **Script invocation**: Skills reference scripts using `${CLAUDE_SKILL_DIR}` which resolves to the skill's subdirectory within the plugin. Use relative paths from there: `${CLAUDE_SKILL_DIR}/../scripts/websearch.js`.

5. **Environment variables available in skills**:
   - `${CLAUDE_SKILL_DIR}` -- skill's directory within the plugin
   - `${CLAUDE_PLUGIN_ROOT}` -- plugin installation root
   - `${CLAUDE_PLUGIN_DATA}` -- persistent data directory (survives updates)
   - `${CLAUDE_PROJECT_DIR}` -- project root
   - `${CLAUDE_SESSION_ID}` -- current session ID

6. **Script execution**: Scripts run via the Bash tool. Skills must declare `allowed-tools: Bash(node *)` or similar to avoid per-use permission prompts.

7. **Path stability**: After marketplace install, plugins are copied to `~/.claude/plugins/cache/`. Use `${CLAUDE_PLUGIN_ROOT}` for all path references, never relative paths that assume the source directory structure.

8. **Persistent data**: Use `${CLAUDE_PLUGIN_DATA}` for `node_modules` or cache data that survives plugin updates. The recommended pattern installs dependencies via a `SessionStart` hook that compares `package.json` hashes.

## Perplexity API Integration Architecture

### Endpoint and Protocol

- **Endpoint**: `POST https://api.perplexity.ai/v1/sonar`
- **Compatibility**: OpenAI Chat Completions format. Can use raw `fetch` or OpenAI SDK with `baseURL: "https://api.perplexity.ai"`.
- **Authentication**: `Authorization: Bearer <PERPLEXITY_API_KEY>`

### Available Models

| Model | Use Case | Cost |
|-------|----------|------|
| `sonar` | Lightweight, fast search | Lower |
| `sonar-pro` | Higher quality answers | Higher |
| `sonar-reasoning-pro` | Deep research with reasoning | Highest |
| `sonar-deep-research` | Extended research tasks | Highest |

### Domain Filtering Support

Perplexity natively supports domain filtering:

```json
{
  "search_domain_filter": ["github.com", "stackoverflow.com"],
  "search_recency_filter": "month"
}
```

For blocked domains, prefix with `!`:
```json
{
  "search_domain_filter": ["!pinterest.com", "!facebook.com"]
}
```

This maps directly to Claude Code's `allowed_domains` and `blocked_domains` parameters.

### Response Structure

```jsonc
{
  "id": "...",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Answer text with [1][2] citation markers"
    },
    "finish_reason": "stop"
  }],
  "citations": [
    "https://example.com/article1",
    "https://example.com/article2"
  ],
  "search_results": [{
    "title": "Article Title",
    "url": "https://example.com/article",
    "date": "2026-01-15",
    "snippet": "Article snippet text"
  }]
}
```

### Key Integration Notes

- Citations are returned by default (no special flag needed).
- `search_results` array contains structured results with title, URL, date, snippet.
- Citation markers `[1][2]` in content text correspond to indices in the `citations` array.
- Rate limit responses (429) should trigger fallback to DDG Lite.

## DuckDuckGo Lite Scraping Architecture

### Endpoint and Protocol

- **Endpoint**: `GET https://lite.duckduckgo.com/lite/` with query parameter `q=<search+query>`
- **No API key required**: Pure HTML scraping fallback.
- **Parsing**: cheerio for HTML traversal, extracting result links, titles, and snippets.

### HTML Structure Pattern

DDG Lite returns minimal HTML. Results follow a pattern of:
- Result title in `<a class="result__a">` or similar link elements
- URL in the `href` attribute
- Snippet in adjacent `<td>` or `<div>` elements

The actual CSS selectors depend on DDG's current HTML structure and must be verified at implementation time.

### DDG-Specific Considerations

- DDG may rate-limit aggressive scraping. The retry logic with backoff is essential.
- Results are less structured than Perplexity: no citation markers, no date filtering, no domain filtering at the API level.
- Domain filtering for DDG must be implemented client-side (filter results after scraping).
- The `duck-duck-scrape` npm package provides a ready-made scraping interface that handles HTML parsing.

## Caching Layer Architecture

### Design

- **Optional**: No cache when not configured (cache_dir absent from config).
- **File-based**: Each cache entry is a JSON file in the configured cache directory.
- **Cache key**: SHA-256 hash of normalized query + provider + domain filters.
- **TTL**: Configurable via `cache_ttl_seconds` (default 3600 = 1 hour).

### Cache File Format

```jsonc
{
  "key": "sha256hash...",
  "query": "original query",
  "provider": "perplexity",
  "created_at": "2026-05-20T10:00:00Z",
  "ttl_seconds": 3600,
  "result": "... markdown output ..."
}
```

### Cache Location

Default: `~/.cache/websearch/` (or `${CLAUDE_PLUGIN_DATA}/cache/` for plugin-scoped persistence).

Configurable via `cache_dir` in config.json or `WEBCACHE_DIR` env var.

## Scaling Considerations

| Concern | Single user (plugin) | Notes |
|---------|---------------------|-------|
| Perplexity rate limits | Standard API tier (requests/min) | Exponential backoff handles bursts; DDG fallback prevents total failure |
| DDG scraping limits | Moderate (a few req/sec) | Backoff + jitter prevents blocking; this is fallback only |
| Cache disk usage | Minimal (KB per entry) | TTL-based cleanup on read; stale entries removed |
| Config complexity | Single config file | JSON file + env vars sufficient for single-user plugin |

### Scaling Priorities

1. **First bottleneck**: Perplexity rate limits. Mitigation: DDG Lite fallback, exponential backoff, caching.
2. **Second bottleneck**: DDG scraping blocks. Mitigation: Backoff with jitter, user-agent rotation consideration.

## Anti-Patterns

### Anti-Pattern 1: Putting Skills Inside `.claude-plugin/`

**What people do:** Place skill directories inside `.claude-plugin/skills/`.
**Why it's wrong:** Claude Code only looks for `plugin.json` inside `.claude-plugin/`. All other components (skills, scripts, agents) must be at the plugin root.
**Do this instead:** `skills/` at plugin root, `.claude-plugin/` contains only `plugin.json`.

### Anti-Pattern 2: Using Absolute Paths in Skills

**What people do:** Hardcode paths like `/Users/nil/plugins/cc-websearch/scripts/...`.
**Why it's wrong:** Plugins are copied to `~/.claude/plugins/cache/` on install. Absolute paths break.
**Do this instead:** Always use `${CLAUDE_SKILL_DIR}` and `${CLAUDE_PLUGIN_ROOT}` variables.

### Anti-Pattern 3: Mixing stdout and stderr

**What people do:** Write error messages to stdout alongside results.
**Why it's wrong:** Claude Code feeds stdout back into the conversation as tool output. Errors must not pollute the result stream.
**Do this instead:** Results on stdout, diagnostics/errors on stderr. Exit code 0 for success, non-zero for failure.

### Anti-Pattern 4: Putting All Logic in SKILL.md

**What people do:** Write extensive search logic inline in the skill markdown.
**Why it's wrong:** SKILL.md content stays in context for the entire session. Bloated skills waste tokens and slow responses.
**Do this instead:** Keep SKILL.md lean (under 500 lines). Offload execution to scripts. SKILL.md should contain invocation instructions, not implementation.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Perplexity Sonar API | `POST /v1/sonar` via fetch/OpenAI SDK | OpenAI-compatible; returns citations + search_results by default |
| DuckDuckGo Lite | `GET https://lite.duckduckgo.com/lite/` + cheerio scraping | No API key; HTML may change; rate limiting applies |
| Claude Code Plugin System | `.claude-plugin/plugin.json` + `skills/*/SKILL.md` | Auto-discovery; `${CLAUDE_SKILL_DIR}` for paths |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| SKILL.md to scripts | Bash tool: `node "${CLAUDE_SKILL_DIR}/../scripts/X.js"` | `${CLAUDE_SKILL_DIR}` resolves to skill directory |
| Scripts to providers | Function calls within same Node process | Provider modules return structured data |
| Providers to output formatter | Provider returns raw results; formatter normalizes to Claude Code format | Single format contract regardless of provider |
| Config loader to all components | Config object passed at initialization | Immutable after load |

## Build Order Implications

The phase ordering must respect these dependencies:

1. **Plugin skeleton first**: `.claude-plugin/plugin.json` + `skills/` + empty `scripts/`. Without this, nothing can be tested in Claude Code.
2. **Input parsing + config**: Required by both providers. Must be built before any provider.
3. **Perplexity provider**: Primary search. Build this first since it provides the canonical output format.
4. **Output formatter**: Depends on Perplexity response structure. Format once, reuse for DDG results.
5. **DDG Lite provider**: Secondary. Can reuse formatter. Depends on input parsing and config.
6. **WebFetch script**: Independent of search providers. Can be built in parallel after core utils.
7. **Caching layer**: Optional enhancement. Built last since it wraps existing provider calls.
8. **Retry logic**: Cross-cutting concern. Built alongside providers but must be ready before integration testing.

## Sources

- [Extend Claude with skills - Claude Code Docs](https://code.claude.com/docs/en/skills) -- HIGH confidence (official docs)
- [Create plugins - Claude Code Docs](https://code.claude.com/docs/en/plugins) -- HIGH confidence (official docs)
- [Plugins reference - Claude Code Docs](https://code.claude.com/docs/en/plugins-reference) -- HIGH confidence (official docs)
- [Explore the .claude directory - Claude Code Docs](https://code.claude.com/docs/en/claude-directory) -- HIGH confidence (official docs)
- [Skill Development SKILL.md - GitHub (anthropics/claude-code)](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/skill-development/SKILL.md) -- HIGH confidence (official repo)
- [Perplexity API Quickstart](https://docs.perplexity.ai/docs/getting-started/quickstart) -- HIGH confidence (official docs)
- [Perplexity Sonar API Reference](https://docs.perplexity.ai/api-reference/sonar-post) -- HIGH confidence (official docs)
- [Perplexity OpenAI SDK Compatibility](https://docs.perplexity.ai/docs/sonar/openai-compatibility) -- HIGH confidence (official docs)
- [Perplexity Search API Quickstart](https://docs.perplexity.ai/docs/search/quickstart) -- HIGH confidence (official docs)
- [A Mental Model for Claude Code](https://levelup.gitconnected.com/a-mental-model-for-claude-code-skills-subagents-and-plugins-3dea9924bf05) -- MEDIUM confidence (community, verified against official)

---
*Architecture research for: Claude Code web search plugin (cc-websearch)*
*Researched: 2026-05-20*
