# Pitfalls Research

**Domain:** Claude Code plugin providing WebSearch and WebFetch via Perplexity API + DuckDuckGo Lite fallback
**Researched:** 2026-05-20
**Confidence:** HIGH (Perplexity docs, Claude Code docs, AWS architecture blog) / MEDIUM (DDG scraping, Readability edge cases)

## Critical Pitfalls

### Pitfall 1: Perplexity Rate Limits Are Tier-Based and Aggressive

**What goes wrong:**
Perplexity uses a leaky bucket rate limiter with tier-based limits. Tier 0 accounts (new, $0 spend) get only 50 requests per minute on the Sonar API. Exceeding limits returns HTTP 429 with no automatic retry. Worse, different models have different limits -- `sonar-deep-research` gets only 5 RPM at Tier 0. The rate limit applies per API key, not per user, so a shared key across a team exhausts faster.

**Why it happens:**
Developers test with low-usage accounts and assume the limits they see are universal. They do not implement retry logic because the Perplexity SDK does not include automatic retries for 429 errors (unlike some AWS SDKs). Burst traffic is allowed but sustained rate enforcement is strict.

**How to avoid:**
- Implement exponential backoff with jitter starting at 1 second, doubling up to 32 seconds max, capped at 5 retries.
- Parse rate limit response headers (`x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`) to proactively throttle.
- Distinguish retryable errors (429, 503) from non-retryable errors (401, 400, 403). Never retry 401.
- Fall back to DuckDuckGo Lite when Perplexity returns 429 after max retries, rather than failing the entire request.
- Log the tier and remaining quota for observability.

**Warning signs:**
- First 429 appears only in production or after sustained testing.
- Users report "search not working" intermittently (silent failures without fallback).
- Retry logic retries on 401 errors, wasting attempts on a permanent failure.

**Phase to address:**
Phase 1 (Core search with Perplexity) -- retry and fallback logic must be built from the start.

---

### Pitfall 2: DuckDuckGo Lite HTML Structure Changes Without Notice

**What goes wrong:**
DuckDuckGo Lite (`lite.duckduckgo.com`) has no official API contract. The HTML structure (CSS classes, table layout, element nesting) can and does change without notice. Cheerio selectors that work today break silently tomorrow, returning empty results or malformed data. DDG also employs anti-scraping measures including IP blocking and CAPTCHAs at higher request volumes.

**Why it happens:**
DDG Lite is a public-facing product page, not an API. It has no stability guarantees. Developers write brittle CSS-selector-based parsers that depend on specific class names like `.result__a` or `.result__snippet` (these are DDG HTML version classes; Lite uses a different table structure). The Lite version uses a simple HTML table, but even this table structure has changed historically. Also, DDG Lite uses POST forms for search submission, not GET query parameters, which catches developers off guard.

**How to avoid:**
- Use structural selectors (table row positions, anchor tags within table cells) rather than class-based selectors -- structural layout changes less frequently than class names.
- Build the DDG scraper as a self-contained module with its own test suite that can be updated independently.
- Set a realistic User-Agent header (mimic a real browser). Missing or bot-like User-Agents get blocked.
- Implement request throttling for DDG (at minimum 1-2 second delays between requests).
- Treat DDG as best-effort fallback, not a reliable primary. The fallback path should degrade gracefully.
- Add HTML structure validation -- if parsing returns zero results, log a warning rather than silently returning empty.

**Warning signs:**
- DDG fallback suddenly returns zero results for queries that should have results.
- Parsed results contain truncated titles or missing URLs.
- HTTP responses come back with different status codes or redirect patterns.
- HTML parsing throws exceptions on unexpected elements.

**Phase to address:**
Phase 1 (DDG fallback implementation) -- structural selectors and validation from the start.

---

### Pitfall 3: Claude Code Plugin Directory Structure Misplacement

**What goes wrong:**
The most common plugin authoring mistake is putting skills, commands, and other components inside `.claude-plugin/` alongside `plugin.json`. This causes the plugin to load but all components are silently ignored. The plugin appears installed but skills do not show up.

**Why it happens:**
Intuitively, developers put everything inside the `.claude-plugin/` directory since that is where the manifest lives. The official docs explicitly state: "All other directories (commands/, agents/, skills/, etc.) must be at the plugin root, not inside .claude-plugin/." Only `plugin.json` belongs in `.claude-plugin/`.

**How to avoid:**
Use this exact directory structure:
```
cc-websearch/
  .claude-plugin/
    plugin.json          # ONLY the manifest
  skills/
    websearch/
      SKILL.md
    webfetch/
      SKILL.md
  bin/                   # CLI scripts added to PATH
    websearch
    webfetch
```

Run `claude plugin validate` or `/plugin validate` to catch structure errors. Test with `--plugin-dir` flag during development.

**Warning signs:**
- Plugin shows as installed in `/plugin list` but skills do not appear.
- `claude --debug` shows "loading plugin" but "No commands found in plugin".
- Skills do not appear in the `/` autocomplete menu.

**Phase to address:**
Phase 1 (plugin scaffolding) -- correct structure from day one.

---

### Pitfall 4: Exponential Backoff Without Jitter Creates Thundering Herd

**What goes wrong:**
Pure exponential backoff (1s, 2s, 4s, 8s...) without randomization causes all retrying clients to fire at the same moment. When the rate limit window resets, every client that was backing off hits the API simultaneously, causing another 429 cascade. This is the "thundering herd" or "retry storm" problem documented extensively by AWS.

**Why it happens:**
Developers implement `delay = 2^attempt` which produces deterministic intervals. If 10 clients all get 429 at the same time and use the same backoff formula, they all retry at exactly the same future moments. AWS's seminal blog post "Exponential Backoff and Jitter" demonstrates mathematically why this fails.

**How to avoid:**
Use "Full Jitter" strategy (recommended by AWS):
```
delay = random(0, min(cap, base * 2 ^ attempt))
```
Or "Decorrelated Jitter":
```
delay = min(cap, random(base, delay * 3))
```

Both break synchronization. Also respect the `Retry-After` header when present -- it overrides calculated backoff. Cap max delay at 30-60 seconds and max retries at 5.

**Warning signs:**
- API usage shows burst patterns that correlate across clients.
- Retry success rate is low (retries immediately get 429 again).
- Total retry time exceeds user patience thresholds.

**Phase to address:**
Phase 1 (retry logic) -- jitter is not optional, it is essential.

---

### Pitfall 5: @mozilla/readability Returns null on Many Real-World Pages

**What goes wrong:**
`Readability.parse()` returns `null` when it cannot identify article content. This happens on SPA pages (no JS rendering in Node), pages with very little text (< ~200 characters), login screens, redirect pages, pages where content is hidden behind `display:none`, and pages whose main content is in SVG or MathML elements. The WebFetch skill appears to "fail silently" -- returning empty content without explanation.

**Why it happens:**
Readability is designed for news articles and blog posts. It uses heuristics to identify "readable" content. JSDOM does not execute JavaScript by default, so any client-rendered page appears as an empty shell. Developers assume Readability works on any URL, but it only works on server-rendered pages with substantial text content.

**How to avoid:**
- Always handle the `null` return case -- do not assume `article.content` exists.
- When `null`, fall back to raw HTML-to-markdown conversion (skip Readability, run Turndown directly on the full HTML). This gives noisy but non-empty results.
- Pass the `url` option to JSDOM (`new JSDOM(html, { url: pageUrl })`) so Readability can resolve relative URLs for images and links.
- Strip navigation, footer, and ad elements before passing to Readability for better extraction.
- Log the `null` case with the URL so users can report problematic pages.
- For WebFetch, provide a `return_format` option: `markdown` (Readability + Turndown) and `text` (just extract text nodes).

**Warning signs:**
- WebFetch returns empty content for specific URLs that load fine in a browser.
- Console shows `TypeError: Cannot read properties of null (reading 'content')`.
- Certain domains consistently return empty (SPAs, auth-walled content).

**Phase to address:**
Phase 1 (WebFetch implementation) -- null handling from the start.

---

### Pitfall 6: Turndown GFM Tables and Code Blocks Conflict

**What goes wrong:**
The `turndown-plugin-gfm` tables rule can misinterpret pipe characters (`|`) inside code blocks or inline code as table delimiters, producing malformed markdown. Similarly, code blocks containing markdown-like syntax (headings, lists, table-like pipe patterns) get incorrectly processed by Turndown's rules. The plugin registration order matters: if GFM tables runs before code block handling, code blocks with pipes break.

**Why it happens:**
Turndown processes HTML elements through rules in registration order. The GFM tables plugin adds rules for `<table>` elements. If a `<code>` or `<pre>` block contains pipe characters that look like table syntax, and the code block rule has not yet protected that content, the table rule can interfere. This is a known issue with the plugin architecture.

**How to avoid:**
- Register the GFM plugin after code block rules are in place (the default order in `turndown-plugin-gfm` handles this correctly for most cases).
- Pre-process HTML: extract `<pre>` and `<code>` blocks before Turndown conversion, replace with placeholders, convert the remaining HTML, then re-insert the code blocks.
- Add custom Turndown rules that match `pre` and `code` elements with higher priority than the table rule.
- Test with real-world pages that contain tables with code cells, code blocks with pipe characters, and nested content.

**Warning signs:**
- Converted markdown has broken table formatting (misaligned columns, extra pipes).
- Code blocks appear as table rows in the markdown output.
- Inline code with `|` characters breaks surrounding table structure.

**Phase to address:**
Phase 1 (WebFetch markdown conversion) -- test with edge case HTML early.

---

### Pitfall 7: Plugin Caching Breaks Relative File References

**What goes wrong:**
Claude Code copies marketplace plugins to `~/.claude/plugins/cache/` rather than using them in-place. Any reference to files outside the plugin directory (e.g., `../shared-utils`, absolute paths, or paths that traverse outside the plugin root) will not work after installation because those external files are not copied to the cache. This breaks at distribution time even though it works during local development.

**Why it happens:**
During development with `--plugin-dir`, the plugin runs from its actual directory, so relative paths to parent directories work. After marketplace installation, the plugin is copied in isolation. Symlinks outside the marketplace are skipped for security.

**How to avoid:**
- All files the plugin needs must be inside the plugin directory.
- Use `${CLAUDE_PLUGIN_ROOT}` variable for all path references in configs and scripts.
- Use `${CLAUDE_PLUGIN_DATA}` for generated state (node_modules, caches) that persists across updates.
- For npm dependencies, install to `${CLAUDE_PLUGIN_DATA}/node_modules` via a SessionStart hook that checks if `package.json` changed.
- Test installation from a marketplace or zip, not just `--plugin-dir`.

**Warning signs:**
- Plugin works in development but fails after installation via marketplace.
- "File not found" errors for scripts or config files.
- MCP server fails to start because command path is wrong.

**Phase to address:**
Phase 2 (plugin packaging and distribution) -- but start with correct path patterns from Phase 1.

---

### Pitfall 8: Skill Description Truncation Prevents Auto-Invocation

**What goes wrong:**
Claude Code truncates skill descriptions at 1,536 characters (combined `description` + `when_to_use`). When many skills are loaded, a context budget scales at 1% of the model's context window, and descriptions for least-invoked skills are dropped first. If the WebSearch/WebFetch skill descriptions are cut short or dropped, Claude will not know to invoke them when the user asks for web search.

**Why it happens:**
The skill listing system optimizes for context efficiency. Long descriptions waste tokens. If the key invocation triggers ("use when you need to search the web") are pushed past the truncation point or dropped entirely, Claude has no signal to invoke the skill.

**How to avoid:**
- Put the key use case first in the `description` field: "Search the web for current information. Use when you need to look up facts, find recent information, or verify claims."
- Keep descriptions under 200 characters for the core trigger phrase.
- Use `when_to_use` for additional trigger phrases, not for repeating the description.
- Consider `disable-model-invocation: false` (default) and ensure `user-invocable: true` (default).
- Test with `/doctor` to check if skill descriptions are being truncated.

**Warning signs:**
- Claude does not invoke the web search skill when users ask "search for X".
- `/doctor` shows skill listing budget overflow.
- Skill works when invoked directly (`/websearch query`) but not automatically.

**Phase to address:**
Phase 1 (skill definition) -- write concise, front-loaded descriptions from the start.

---

### Pitfall 9: Config File Precedence Causes Unexpected Behavior

**What goes wrong:**
The plugin uses `~/.config/websearch/config.json` for user configuration with environment variable fallback. But the precedence order matters: env vars should override config file values (12-factor app pattern), not the other way around. If implemented incorrectly, setting `PERPLEXITY_API_KEY` as an environment variable has no effect because the config file's empty value takes precedence. Or the config file is read from the wrong location on different platforms (XDG vs traditional paths).

**Why it happens:**
Node.js does not have a standard config library with built-in precedence. Developers often read config file first, then env vars, but merge them in the wrong order. Also, `~/.config/` is XDG convention on Linux but less standard on macOS where some users expect `~/Library/Application Support/`.

**How to avoid:**
- Precedence order (highest wins): CLI flags > Environment variables > Config file > Defaults.
- Use `XDG_CONFIG_HOME` to locate config directory, falling back to `~/.config/` if not set.
- Document the precedence clearly in the skill description and README.
- Validate config at load time -- log which source provided each value at debug level.
- Never store API keys in the config file in plain text without warning. Prefer environment variables for secrets.

**Warning signs:**
- Setting env var has no effect (config file takes precedence).
- Config file changes require restart to take effect (no file watching).
- Plugin fails silently when config file has invalid JSON.

**Phase to address:**
Phase 1 (config infrastructure) -- correct precedence from the start.

---

### Pitfall 10: Caching Stale Results When Source Content Changed

**What goes wrong:**
The plugin implements optional caching for search results and fetched pages. Without proper cache invalidation, users get stale search results that do not reflect current information. This is especially harmful for a web search tool -- the entire point is getting current data. Cached pages that have since been updated show wrong information.

**Why it happens:**
Time-based TTL caching is simple but problematic. A 1-hour TTL means results up to 1 hour stale. A 5-minute TTL means excessive cache misses. There is no way to know if a web page changed without re-fetching it. Developers set TTLs too long because shorter TTLs negate the caching benefit.

**How to avoid:**
- Cache should be disabled by default (as stated in PROJECT.md).
- When enabled, use short TTLs: 5-15 minutes for search results, 30-60 minutes for fetched pages.
- Include cache metadata in debug output (cache hit/miss, age of cached result).
- Allow users to force-refresh (e.g., a `--no-cache` flag or env var).
- Never cache error responses or empty results.
- Hash the full request parameters (including domain filters) as the cache key, not just the query string.

**Warning signs:**
- Search results do not reflect very recent events (news, current data).
- WebFetch returns outdated page content after the page has been updated.
- Cache directory grows unbounded (no eviction policy).

**Phase to address:**
Phase 2 (caching feature) -- add TTL, eviction, and force-refresh from the start.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| CSS-class-based DDG selectors | Faster to implement | Breaks when DDG changes classes | Never -- use structural selectors from the start |
| No fallback on Perplexity 429 | Simpler code path | Users see errors when rate-limited | Never -- DDG fallback is a core requirement |
| Inline retry logic in each provider | Less abstraction | Duplicated retry code, inconsistent behavior | Never -- implement shared retry utility |
| Skip Readability null check | Less error handling code | WebFetch crashes on non-article pages | Never -- always handle null |
| Hardcoded Perplexity model name | No config needed | Cannot switch models without code change | MVP only -- make configurable in Phase 2 |
| No cache eviction policy | Simpler implementation | Disk grows unbounded | MVP only -- add LRU eviction in Phase 2 |
| Skip User-Agent header on DDG requests | Simpler HTTP code | DDG blocks requests without UA | Never -- always set a realistic User-Agent |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Perplexity API | Retrying 401 authentication errors | Only retry 429 and 503; 401 means bad key, never retry |
| Perplexity API | Ignoring rate limit response headers | Parse `x-ratelimit-remaining` to proactively throttle or fallback |
| Perplexity API | Using `max_tokens` too high | Large token counts consume rate limit budget faster; use reasonable limits |
| DDG Lite | Using GET requests for search | DDG Lite uses POST form to `/lite` for search queries |
| DDG Lite | Scraping `html.duckduckgo.com` instead of `lite.duckduckgo.com` | Lite version has simpler, more stable HTML structure (~13KB vs ~133KB) |
| DDG Lite | No User-Agent header | Set a realistic browser User-Agent to avoid blocks |
| JSDOM/Readability | Not passing `url` option to JSDOM constructor | Always pass `{ url: pageUrl }` so relative URLs resolve correctly |
| JSDOM/Readability | Expecting Readability to work on SPAs | Readability only works on server-rendered HTML; handle null return |
| Turndown | Registering GFM plugin before code rules | Register plugins carefully; consider pre-processing code blocks |
| Claude Code | Putting skills/ inside .claude-plugin/ | Skills/ must be at plugin root, not inside .claude-plugin/ |
| Claude Code | Using absolute paths in plugin.json | All paths must be relative, starting with `./` |
| Claude Code | Not running `/reload-plugins` after changes | Skills have live change detection but some changes require reload |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Perplexity cold start latency | First search takes 3-5 seconds | Set reasonable timeouts (5s connect, 30s read) | Always -- Perplexity is a remote API |
| DDG parsing on large result sets | Slow parsing, high memory | Limit results parsed to first 10-20 | 100+ results from unbounded queries |
| Readability on huge HTML documents | OOM or slow conversion | Truncate very large HTML before passing to Readability | Pages > 5MB HTML |
| Cache key collisions | Wrong results returned | Use full request parameters as cache key hash input | Concurrent different queries |
| No request timeout | Process hangs indefinitely | Always set HTTP client timeouts (connect + read) | Slow or unresponsive servers |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Perplexity API key in config.json | Key exposed in plaintext file | Prefer environment variables for API keys; document this |
| Logging API keys in debug output | Key leaked to log files | Mask API keys in all log output (show last 4 chars only) |
| No input sanitization on search queries | Injection attacks via query strings | Validate and sanitize query strings before HTTP requests |
| Trusting DDG HTML without sanitization | XSS if output rendered as HTML | Output is markdown text, not HTML; Turndown produces safe markdown |
| Plugin scripts executable by other users | Permission escalation | Set restrictive file permissions on plugin directory |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent failure when both providers fail | User sees empty result with no explanation | Return error message: "Search unavailable: Perplexity rate-limited, DDG fallback failed" |
| Long delay during Perplexity retry before DDG fallback | User waits 30+ seconds with no feedback | Set aggressive timeout for Perplexity (10s), fallback fast |
| Cache returns stale results without indication | User trusts outdated information | When cache is enabled, optionally show "cached result from X minutes ago" |
| Skill does not auto-invoke when user says "search for X" | User must manually invoke /websearch | Write clear, concise skill description with trigger phrases |
| DDG results have different format than Perplexity results | Inconsistent output breaks expectations | Normalize both result formats to match Claude Code's built-in WebSearch output format exactly |

## "Looks Done But Isn't" Checklist

- [ ] **WebSearch output format:** Exactly matches Claude Code's built-in WebSearch output -- markdown with `[Title](URL)` citations, not just plain text URLs
- [ ] **WebFetch output format:** Matches Claude Code's built-in WebFetch -- includes title, content in requested format (markdown or text), handles both cases
- [ ] **Error output to stderr:** All errors go to stderr, only results go to stdout -- if errors leak to stdout, Claude Code sees them as result content
- [ ] **Perplexity citation extraction:** Citations are in the API response as `[number]` markers with URL references -- must extract and format as markdown links
- [ ] **DDG fallback triggers correctly:** Fallback on 429, 401 (no key), timeout, and network error -- not just on explicit "no key" case
- [ ] **Domain filtering:** `allowed_domains` and `blocked_domains` are applied to output formatting, not to the query itself -- Perplexity may return results from any domain
- [ ] **Plugin installs via `claude plugin install`:** Test actual marketplace installation, not just `--plugin-dir` development mode
- [ ] **Skills appear in `/` menu:** After installation, both skills should appear in the slash-command menu
- [ ] **JSON stdin input works:** Claude Code sends tool arguments as JSON on stdin -- test this path, not just CLI flags
- [ ] **Config file created on first run:** If config file does not exist, plugin should work with defaults, not crash

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| DDG HTML structure changed | LOW | Update Cheerio selectors in DDG module; structural selectors need minor adjustment |
| Perplexity API breaking change | MEDIUM | Check API changelog; update request/response schema; test with new models |
| Plugin structure wrong | LOW | Move directories to correct positions; run `claude plugin validate` |
| Readability fails on new site pattern | LOW | Add site-specific pre-processing or fall back to raw Turndown |
| Cache corruption | LOW | Delete cache directory; cached results regenerate on next request |
| Skill description too long | LOW | Edit SKILL.md frontmatter; `/reload-plugins` picks up changes |
| Config precedence bug | LOW | Fix merge order in config loader; add precedence logging |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Perplexity rate limits (P1) | Phase 1: Core search | Send 60+ requests in 1 minute; verify fallback to DDG |
| DDG HTML changes (P2) | Phase 1: DDG fallback | Test with structural selectors; add result-count validation |
| Plugin directory structure (P3) | Phase 1: Scaffolding | Run `claude plugin validate`; test skills appear in `/` menu |
| Backoff without jitter (P4) | Phase 1: Retry logic | Unit test backoff intervals include randomization |
| Readability null return (P5) | Phase 1: WebFetch | Test with SPA pages, login pages, empty pages |
| Turndown code/table conflict (P6) | Phase 1: WebFetch | Test with HTML containing tables with code cells |
| Plugin caching paths (P7) | Phase 2: Distribution | Install from marketplace; verify all paths resolve |
| Skill description truncation (P8) | Phase 1: Skill definition | Run `/doctor`; verify descriptions are not truncated |
| Config precedence (P9) | Phase 1: Config system | Set env var and config file; verify env var wins |
| Stale caching (P10) | Phase 2: Caching | Fetch, wait for TTL expiry, fetch again; verify fresh results |

## Sources

- Perplexity API rate limits and tiers: https://docs.perplexity.ai/docs/admin/rate-limits-usage-tiers (HIGH confidence -- official docs)
- Perplexity error handling and backoff: https://docs.perplexity.ai/docs/sdk/error-handling (HIGH confidence -- official docs)
- Claude Code plugin creation: https://code.claude.com/docs/en/plugins (HIGH confidence -- official docs)
- Claude Code plugins reference: https://code.claude.com/docs/en/plugins-reference (HIGH confidence -- official docs)
- Claude Code skills documentation: https://code.claude.com/docs/en/skills (HIGH confidence -- official docs)
- AWS exponential backoff and jitter: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ (HIGH confidence -- seminal reference)
- AWS timeouts, retries, and backoff: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/ (HIGH confidence)
- DuckDuckGo Lite architecture: https://guessless.dev/blog/service-level-architecture/lite.duckduckgo.com (MEDIUM confidence -- community blog)
- DuckDuckGo scraping challenges: https://crawlbase.com/scrape-duckduckgo (MEDIUM confidence -- scraping service provider)
- Thundering herd and jitter: https://dev.to/biomousavi/understanding-jitter-backoff-a-beginners-guide-2gc (MEDIUM confidence -- community)

---
*Pitfalls research for: cc-websearch Claude Code plugin (WebSearch + WebFetch via Perplexity + DDG)*
*Researched: 2026-05-20*
