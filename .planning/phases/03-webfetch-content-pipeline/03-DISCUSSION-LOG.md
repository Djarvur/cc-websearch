# Phase 3: WebFetch Content Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 3-WebFetch Content Pipeline
**Areas discussed:** Output Format, Summarization Approach, Redirect Edge Cases, Non-HTML Content

---

## Output Format

| Option | Description | Selected |
|--------|-------------|----------|
| Research exact format | Researcher examines real Claude Code WebFetch output to determine exact format | ✓ |
| Plain markdown summary | Return plain markdown from Perplexity's answer, fix later if format wrong | |
| XML-based format | Return XML like WebSearch with different tags | |

**User's choice:** Research exact format
**Notes:** Downstream researcher must verify actual Claude Code WebFetch output format.

| Option | Description | Selected |
|--------|-------------|----------|
| Include citations | Include Perplexity citations/links in output | ✓ |
| Answer only | Return only LLM answer text, no citation links | |
| Research this too | Let researcher determine based on Claude Code behavior | |

**User's choice:** Include citations
**Notes:** Perplexity naturally returns citations — include them in output.

| Option | Description | Selected |
|--------|-------------|----------|
| Raw answer text | Return raw Perplexity answer, no wrapper | ✓ |
| Structured wrapper | Wrap answer with source URL metadata | |
| Research this | Researcher verifies against real Claude Code | |

**User's choice:** Raw answer text
**Notes:** Keep it simple — no structural wrapper.

---

## Summarization Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Same sonar model | Reuse PPLX_MODEL config, consistent with WebSearch | ✓ |
| Different model | Use separate model for summarization | |
| Research needed | Researcher evaluates model options | |

**User's choice:** Same sonar model
**Notes:** No additional config needed. Reuse existing Perplexity client.

| Option | Description | Selected |
|--------|-------------|----------|
| Content as user msg | Page content in user message, prompt as system instruction | ✓ |
| Content as system msg | Page content in system message, prompt as user message | |
| Research needed | Researcher decides prompt structure | |

**User's choice:** Content as user message
**Notes:** Leverages Perplexity's citation system naturally.

| Option | Description | Selected |
|--------|-------------|----------|
| Hard truncate | Fixed token/char limit | |
| Head + tail extraction | First N + last N chars of article | |
| Research needed | Researcher determines based on context window limits | ✓ |

**User's choice:** Research needed
**Notes:** Perplexity context window size determines truncation strategy.

| Option | Description | Selected |
|--------|-------------|----------|
| Always summarize | Every response goes through Perplexity | |
| Conditional: raw or summarize | Raw markdown for short pages, summarize for large | ✓ |
| Research needed | Researcher determines based on real Claude Code behavior | |

**User's choice:** Conditional raw or summarize
**Notes:** Short pages can skip Perplexity overhead. No API key also triggers raw markdown path.

| Option | Description | Selected |
|--------|-------------|----------|
| Raw markdown when no key | Graceful degradation, return extracted markdown | ✓ |
| Error when no key | Require API key for WebFetch | |
| Research needed | Researcher decides | |

**User's choice:** Raw markdown when no key
**Notes:** Matches WebSearch's graceful degradation philosophy.

---

## Redirect Edge Cases

| Option | Description | Selected |
|--------|-------------|----------|
| Manual redirect loop | fetch with redirect: 'manual', check Location header | ✓ |
| HTTP client library | Use follow-redirects or similar | |
| Research needed | Researcher picks approach | |

**User's choice:** Manual redirect loop
**Notes:** Standard Node.js fetch API, no new dependencies.

| Option | Description | Selected |
|--------|-------------|----------|
| Short message | Human-readable redirect notice | ✓ |
| Structured metadata | Machine-parseable redirect data | |
| Research needed | Researcher determines | |

**User's choice:** Short message
**Notes:** Simple message like "Redirect from X to Y — cross-host not followed".

| Option | Description | Selected |
|--------|-------------|----------|
| Same-host to completion | Follow all same-host redirects until final URL | ✓ |
| Cap at 5 redirects | Limit same-host hops to 5 | |
| Research needed | Researcher picks limit | |

**User's choice:** Same-host to completion
**Notes:** But with safety cap (see next question).

| Option | Description | Selected |
|--------|-------------|----------|
| Cap at 10 hops | Safety limit prevents infinite loops | ✓ |
| No limit | Follow until non-redirect response | |
| Research needed | Researcher picks sensible default | |

**User's choice:** Cap at 10 hops
**Notes:** Prevents infinite redirect loops on broken servers.

---

## Non-HTML Content

| Option | Description | Selected |
|--------|-------------|----------|
| Error message | Return error to stderr for non-HTML content types | ✓ |
| Handle common types | JSON → formatted text, plain text → passthrough, binary → error | |
| Research needed | Researcher determines based on Claude Code behavior | |

**User's choice:** Error message
**Notes:** Clean error with Content-Type info. Only HTML proceeds.

| Option | Description | Selected |
|--------|-------------|----------|
| Turndown fallback → summarize | Raw Turndown on full HTML, send to Perplexity | ✓ |
| Warning + raw output | Show warning then raw Turndown output | |
| Research needed | Researcher determines fallback strategy | |

**User's choice:** Turndown fallback → summarize
**Notes:** Noisy but functional. Perplexity can handle noisy input.

| Option | Description | Selected |
|--------|-------------|----------|
| Error on 4xx/5xx | Return error immediately, no body processing | ✓ |
| Try to extract anyway | Fetch error page body and attempt extraction | |

**User's choice:** Error on 4xx/5xx
**Notes:** No Perplexity call for error pages. Clean exit.

| Option | Description | Selected |
|--------|-------------|----------|
| Content-Type whitelist | Only text/html and application/xhtml proceed | ✓ |
| Try-anything approach | Process any response, handle failures | |
| Research needed | Researcher determines best approach | |

**User's choice:** Content-Type whitelist
**Notes:** Early rejection for non-HTML. Simple and predictable.

---

## Claude's Discretion

- Exact Perplexity prompt wording (system message template)
- Content truncation implementation (researcher sizes based on context window)
- "Short page" threshold for raw markdown path
- Turndown configuration options
- Error message wording and formatting

## Deferred Ideas

None — discussion stayed within phase scope.
