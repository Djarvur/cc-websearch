# Pitfalls Research

**Domain:** Replacing built-in Claude Code WebSearch/WebFetch tools with plugin skills
**Researched:** 2026-05-22
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Built-in WebSearch Uses Anthropic's Server-Side Backend -- It Simply Does Not Exist on Non-Anthropic Providers

**What goes wrong:**
The built-in `WebSearch` tool routes queries to Anthropic's proprietary web search backend (the same one used by claude.ai chat). When using a non-Anthropic provider (Bedrock, Vertex, Foundry, OpenAI-compatible endpoint, self-hosted), Claude Code hides `WebSearch` entirely. The model receives no `WebSearch` tool definition and cannot call it. The user gets no web search capability at all.

**Why it happens:**
Per the official tools reference: "WebSearch runs a query against Anthropic's web search backend." The mikhail.io investigation confirms: "The server-side search tool is available on Anthropic's first-party API but it isn't supported on Bedrock/Vertex. If Claude Code is configured to use those platforms, Claude Code hides the WebSearch tool entirely." This is a platform-level decision, not a configuration issue.

**How to avoid:**
This is not a pitfall to avoid -- it is the core problem the plugin exists to solve. The plugin must provide its own web search that works independently of Anthropic's backend. The critical design decision is ensuring the plugin's skill is visible and usable even when the built-in tool is hidden.

**Warning signs:**
User switches provider from Anthropic to OpenAI-compatible and suddenly loses web search. Model says "I don't have access to web search" or simply fails to search.

**Phase to address:**
Phase 1 (investigation/mechanism discovery) -- understand this is a hard platform limitation, not something that can be overridden.

---

### Pitfall 2: WebFetch Calls api.anthropic.com for Domain Safety Checks Even on Third-Party Providers

**What goes wrong:**
The built-in `WebFetch` tool makes a call to `https://claude.ai/api/web/domain_info?domain=${hostname}` (or `api.anthropic.com` equivalent) for every URL before fetching it. On non-Anthropic providers or restricted network environments, this call may fail or be blocked, causing WebFetch to break even though the actual URL fetching would work fine.

**Why it happens:**
The official network-config docs state: "the WebFetch tool still communicates with api.anthropic.com for its domain safety check, unless skipWebFetchPreflight: true is configured in settings." The settings docs confirm: "skipWebFetchPreflight: true should be set in environments that block traffic to Anthropic, such as Bedrock, Vertex AI, or Foundry deployments with restrictive egress."

**How to avoid:**
The plugin's WebFetch skill does not need to call Anthropic's domain safety endpoint because it operates outside the built-in tool system. The plugin should implement its own domain safety if needed (or skip it entirely since DDG search results are already somewhat curated). Do not replicate Anthropic's preflight check pattern.

**Warning signs:**
WebFetch works on Anthropic provider but fails on Bedrock/Vertex with network errors before even reaching the target URL.

**Phase to address:**
Phase 1 -- confirm the plugin's fetch implementation is fully independent of Anthropic infrastructure.

---

### Pitfall 3: Skills and Built-in Tools Are Fundamentally Different Mechanisms -- Skills Cannot "Shadow" Built-in Tool Names

**What goes wrong:**
Developer assumes that creating a skill named `WebSearch` or `WebFetch` will override the built-in tool of the same name. In reality, skills are invoked through the `Skill` tool, not as top-level tools. The built-in `WebSearch` and `WebFetch` tools have their own separate definitions in the tool list sent to the model. A plugin skill named "websearch" appears as `/websearch` in the slash command list and is invoked via the `Skill` tool -- it does not replace or shadow `WebSearch` in the tool list.

**Why it happens:**
Claude Code's tool system distinguishes between built-in tools (WebSearch, WebFetch, Bash, Read, etc.) and skills. Skills are prompt-based workflows that run through the existing `Skill` tool. The tools reference explicitly states: "To extend Claude with reusable prompt-based workflows, write a skill, which runs through the existing Skill tool rather than adding a new tool entry." The model sees both the built-in `WebSearch` tool definition AND the skill's description as separate entries.

**How to avoid:**
Do not rely on name shadowing. Instead, use one of these actual override mechanisms:
1. `--disallowedTools "WebSearch" "WebFetch"` CLI flag to remove built-in tools from model context
2. `permissions.deny: ["WebSearch", "WebFetch"]` in settings.json
3. PreToolUse hooks with matcher `WebSearch|WebFetch` that deny the call and provide a reason directing the model to use the plugin skill instead

**Warning signs:**
Model uses built-in WebSearch/WebFetch instead of the plugin skill. Or model uses both -- calling built-in WebSearch AND the plugin skill for the same query.

**Phase to address:**
Phase 1 (mechanism discovery) -- this is the foundational architectural decision.

---

### Pitfall 4: DisallowedTools Removes the Tool Definition Entirely -- The Model May Not Know the Plugin Skill Exists

**What goes wrong:**
When using `--disallowedTools "WebSearch" "WebFetch"` or `permissions.deny`, the built-in tool definitions are removed from the model's context. The model no longer sees WebSearch or WebFetch as available tools. However, the model may not automatically know to use the plugin's skill instead. The model needs to discover the skill through its description in the skill listing, which depends on the skill description being written to clearly communicate "use this when you would normally use WebSearch."

**Why it happens:**
Tool definitions and skill descriptions are separate context. Removing a tool definition removes the model's knowledge that such a capability exists. The skill description must bridge this gap by explicitly stating it provides web search/fetch capability.

**How to avoid:**
Write skill descriptions that are self-contained and do not assume the model knows about built-in WebSearch/WebFetch. The current skill descriptions say "Search the web using DuckDuckGo" and "Fetch and summarize web page content" -- these are good because they describe the capability independently. But they should also be strong enough that the model chooses them when the user asks for web information.

**Warning signs:**
User asks "search the web for X" and the model says it cannot perform web searches because the built-in tool is gone and it does not realize the plugin skill can do it.

**Phase to address:**
Phase 2 (implementation) -- skill description tuning and testing across providers.

---

### Pitfall 5: The Built-in WebFetch Uses a Haiku Pass to Summarize Content -- The Plugin Returns Raw Markdown

**What goes wrong:**
The built-in WebFetch does NOT return raw page content. It fetches the page, converts to Markdown, truncates to 100KB, then runs a Haiku model pass to answer the user's prompt question. The plugin's WebFetch skill returns raw Markdown without any LLM summarization. This means the output format and content are fundamentally different, which changes the model's behavior when consuming the results.

**Why it happens:**
The mikhail.io investigation reveals the built-in pipeline: "HTML is converted to Markdown using the Turndown library. The result is truncated to 100 KB of text with a warning if necessary. A small, fast model runs with an empty system prompt and a user prompt template." The plugin skips the LLM summarization step because it has no access to Haiku and does not want to require an API key.

**How to avoid:**
This is a deliberate design difference, not a bug. The project CLAUDE.md states "WebFetch is pure fetch-extract-markdown." However:
1. Ensure the skill description makes clear that it returns full content, not summaries
2. The model must be able to handle large Markdown outputs without token overflow
3. Consider adding a character limit or truncation with a warning, matching the built-in's 100KB limit

**Warning signs:**
Token overflow errors when fetching large pages. Model behavior changes between built-in and plugin WebFetch (built-in gives concise answers, plugin dumps raw content).

**Phase to address:**
Phase 2 -- implement content truncation matching the built-in's behavior.

---

### Pitfall 6: PreToolUse Hook Denial Reason Influences Model Behavior Unpredictably

**What goes wrong:**
Using a PreToolUse hook to deny `WebSearch`/`WebFetch` calls and providing a reason like "Use the /websearch skill instead" should redirect the model to the plugin skill. However, the model may: (a) retry the built-in tool, (b) ask the user for help, (c) use Bash+curl as a workaround instead of the skill, or (d) simply fail. The denial reason becomes a prompt injection into the model's context, and its effect on behavior is not fully deterministic.

**Why it happens:**
When a PreToolUse hook denies a tool call, the model receives the denial reason in its context. The model then decides what to do next based on all available context (other tools, skill descriptions, conversation history). There is no guaranteed "redirect to skill" behavior -- it is probabilistic.

**How to avoid:**
1. Test the denial reason text carefully across multiple interaction patterns
2. Use explicit, directive language in the denial reason: "WebSearch is disabled. Use the Bash tool to run: echo '{\"query\":\"YOUR_QUERY\"}' | node \"${CLAUDE_PLUGIN_ROOT}/skills/websearch/scripts/websearch.cjs\""
3. Combine hook denial with `disallowedTools` for belt-and-suspenders approach
4. The most reliable approach is `disallowedTools` (removes tool entirely) + strong skill descriptions

**Warning signs:**
Model falls back to Bash+curl instead of using the plugin skill. Model asks user for permission to use web search. Model retries the denied tool repeatedly.

**Phase to address:**
Phase 2 -- implement and test hook-based interception if chosen as the override mechanism.

---

### Pitfall 7: Built-in WebFetch Has a 15-Minute Cache -- The Plugin Has No Equivalent

**What goes wrong:**
The built-in WebFetch caches responses for 15 minutes. Repeated fetches of the same URL return instantly. The plugin's WebFetch has no caching (caching is deferred in PROJECT.md). This means the plugin makes a new network request every time, which is slower and more resource-intensive.

**Why it happens:**
The built-in tool has caching built into its server-side infrastructure. The plugin's caching was explicitly deferred as a future feature. Without caching, the model may appear "slower" when using the plugin compared to the built-in tool.

**How to avoid:**
This is acceptable for MVP. The PROJECT.md already lists "Optional caching" as a deferred item. Ensure performance is reasonable without cache. If users report slowness, prioritize caching implementation.

**Warning signs:**
User notices the plugin is slower than built-in for repeated URL fetches. DDG rate limiting triggered by repeated identical searches.

**Phase to address:**
Post-MVP -- caching is explicitly deferred per PROJECT.md.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip output format parity with built-in WebSearch | Faster implementation | Model behavior differs when using plugin vs built-in; may cause subtle issues | Never -- format parity is a core requirement |
| Use PreToolUse hook denial instead of disallowedTools | Avoids requiring user to configure settings | Non-deterministic model behavior; hook may not fire in all contexts (subagents, SDK) | MVP only, with plan to migrate |
| No content truncation in WebFetch | Simpler code | Token overflow on large pages; model performance degradation | Only until truncation is implemented |
| Skill description does not mention "drop-in replacement" | Simpler description | Model may not associate plugin skill with web search capability when built-in tools are gone | Never -- description must be self-sufficient |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `--disallowedTools` flag | Assuming this works for all scopes (user/project/local) | This is a CLI flag only, not a setting. Use `permissions.deny` in settings.json for persistent configuration |
| `permissions.deny` in settings | Denying `WebSearch` but forgetting `WebFetch` | Deny both: `["WebSearch", "WebFetch"]` |
| PreToolUse hook matcher | Using `"websearch"` (lowercase) | Tool names are case-sensitive: use `"WebSearch\|WebFetch"` |
| Skill `allowed-tools` | Forgetting to allow `Bash(node *)` in skill frontmatter | The skill needs Bash permission to invoke `node` on the bundled script |
| `${CLAUDE_PLUGIN_ROOT}` path | Hardcoding absolute paths in skill definitions | Always use `${CLAUDE_PLUGIN_ROOT}` -- path changes on every plugin update |
| Plugin hooks in `hooks/hooks.json` | Assuming hooks fire for subagent tool calls | PreToolUse hooks fire for all tool calls including subagents, but the hook must be in the plugin's hooks configuration, not user settings |
| Cross-provider testing | Only testing with Anthropic provider | Must test with OpenAI-compatible endpoint to verify built-in tools are actually replaced |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| DDG Lite rate limiting | 429 errors, search failures | Exponential backoff with jitter (already implemented); respect retry-after headers | Aggressive automated search workflows |
| Large page content overflows context | Model truncates or ignores fetched content | Implement 100KB truncation matching built-in behavior | Fetching documentation sites, GitHub READMEs of large repos |
| Bundle size blowout | Slow plugin load, high memory | Monitor esbuild bundle sizes; current bundles are ~1.2MB and ~2.9MB which is already large | Adding more dependencies without tree-shaking |
| Skill token overhead | Every session pays ~100-200 tokens for skill descriptions regardless of usage | Keep skill descriptions concise; the plugin details command shows projected token cost | Many plugins installed simultaneously |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Plugin skill executes arbitrary URLs without validation | SSRF attacks if model is tricked into fetching internal URLs | Validate URL scheme (https only), reject private IP ranges, match built-in's domain deny-list behavior |
| Exposing API keys in skill output | If Perplexity or other paid API keys are logged to stderr | Never log full API keys; mask in error messages; use stderr for diagnostics only |
| Allowing the model to inject arbitrary JSON into stdin | Malformed or malicious input crashing the script | Use Zod validation (already implemented); reject unexpected fields |
| Plugin hooks running arbitrary commands | Compromise if hook scripts are modified | Use `chmod` and file permissions; hooks run unsandboxed at hook trust level |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Requiring manual `--disallowedTools` configuration | User forgets to configure, both built-in and plugin tools are active | Plugin should auto-configure via settings.json on install, or provide clear setup instructions |
| Different search result format from built-in | Model behaves differently, confuses users who switch between providers | Match built-in output format byte-for-byte (already the design goal) |
| Plugin skill not invoked automatically | User has to type `/websearch` manually instead of model using it automatically | Ensure `disable-model-invocation` is NOT set (current skills correctly omit this field, allowing model invocation) |
| Error messages leak implementation details | Users see "DDG Lite returned 403" instead of "Search temporarily unavailable" | Sanitize error messages for user-facing output; keep details in stderr for debugging |

## "Looks Done But Isn't" Checklist

- [ ] **Built-in tool disabled:** Verify with `--debug` that WebSearch/WebFetch are not in the tool list, not just "disabled" but actually removed from model context
- [ ] **Plugin skill invoked:** Verify model uses `/websearch` or `/webfetch` slash command (or auto-invokes the skill) when user asks for web information
- [ ] **Output format matches:** Compare built-in WebSearch output XML with plugin output XML -- verify element names, escaping, and structure are identical
- [ ] **Cross-provider tested:** Test with at least Anthropic AND one non-Anthropic provider (OpenAI-compatible) to verify behavior is consistent
- [ ] **Subagent compatibility:** Verify plugin skills work when invoked by subagents, not just the main conversation
- [ ] **Permission model:** Verify the skill's `allowed-tools: Bash(node *)` works without prompting the user on every invocation
- [ ] **Plugin update path:** Verify that after a plugin update (which changes `${CLAUDE_PLUGIN_ROOT}`), skills still work without session restart
- [ ] **Hook installation:** If using hooks, verify the hook fires on SessionStart (npm install) and on every tool call (PreToolUse interception)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Model ignores plugin skill, falls back to curl | LOW | Improve skill description; test with different phrasing; add explicit instruction in denial reason |
| Output format mismatch causes model confusion | MEDIUM | Diff built-in vs plugin output; adjust XML structure; add integration tests that compare formats |
| PreToolUse hook does not fire | MEDIUM | Verify hook configuration in hooks/hooks.json; check matcher pattern; test with `--debug` |
| Plugin breaks after Claude Code update | HIGH | Pin to stable Claude Code version; test against pre-release; maintain compatibility matrix |
| disallowedTools does not persist across sessions | LOW | Move from CLI flag to settings.json permissions.deny configuration |
| Both built-in and plugin tools are active simultaneously | MEDIUM | Model may call either; test behavior; if inconsistent, enforce denial via hook as backup |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Built-in WebSearch non-existent on non-Anthropic providers | Phase 1 (investigation) | Confirm by testing with OpenAI-compatible endpoint |
| WebFetch preflight check requires api.anthropic.com | Phase 1 (investigation) | Confirm plugin does not call Anthropic endpoints |
| Skills cannot shadow built-in tool names | Phase 1 (mechanism discovery) | Test with `claude --debug` to see tool list |
| disallowedTools removes tool from model context | Phase 2 (implementation) | Verify tool is absent from model context with `--debug` |
| Skill description must be self-sufficient | Phase 2 (implementation) | Test: with built-in tools disabled, model still knows to use skill |
| Output format parity | Phase 2 (implementation) | Diff test: compare built-in output XML with plugin output |
| PreToolUse hook denial behavior is non-deterministic | Phase 2 (implementation) | Test across 10+ interaction patterns to find failure modes |
| Content truncation for large pages | Phase 2 (implementation) | Test with pages > 100KB; verify truncation works |
| Cross-provider compatibility | Phase 3 (testing) | E2E test suite with multiple provider configurations |
| Subagent skill invocation | Phase 3 (testing) | Test skill works when invoked by a subagent |
| Caching parity with built-in | Post-MVP | Performance benchmarks comparing built-in vs plugin latency |

## Sources

- [Claude Code Tools Reference](https://code.claude.com/docs/en/tools-reference) -- Built-in tool definitions, permission rule format, tool behavior details. HIGH confidence.
- [Claude Code Plugins Reference](https://code.claude.com/docs/en/plugins-reference) -- Plugin manifest schema, skill definitions, hooks, path variables. HIGH confidence.
- [Claude Code CLI Reference --disallowedTools](https://code.claude.com/docs/en/cli-reference) -- CLI flags for tool restriction. HIGH confidence.
- [Claude Code Network Config](https://code.claude.com/docs/en/network-config) -- WebFetch preflight check, skipWebFetchPreflight setting. HIGH confidence.
- [Claude Code Settings](https://code.claude.com/docs/en/settings) -- skipWebFetchPreflight, permissions.deny configuration. HIGH confidence.
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks) -- PreToolUse hook event, matcher patterns for WebSearch/WebFetch, permissionDecision deny. HIGH confidence.
- [Inside Claude Code's Web Tools](https://mikhail.io/2025/10/claude-code-web-tools/) -- Reverse-engineered details of WebFetch pipeline (domain check, Turndown, Haiku pass, 15-min cache) and WebSearch (Anthropic backend only, hidden on Bedrock/Vertex). MEDIUM confidence (reverse-engineered, not official docs, but highly detailed and consistent with official docs).
- [Claude Code Skills](https://code.claude.com/docs/en/skills) -- Skill definition, disable-model-invocation, allowed-tools. HIGH confidence.
- [Reddit: WebSearch/Fetch on Z.ai](https://www.reddit.com/r/opencodeCLI/comments/1r432g6/help_web_searchfetch_works_with_official_claude/) -- Community report of WebSearch not working on non-Anthropic providers. LOW confidence (community source, Reddit blocked content).

---
*Pitfalls research for: Replacing built-in Claude Code WebSearch/WebFetch tools with plugin skills*
*Researched: 2026-05-22*
