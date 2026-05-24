# Phase 12: Output & Compatibility — Discussion Log

**Date:** 2026-05-24
**Mode:** Default (interactive)

## Areas Discussed

### 1. WebFetch Output Format
- **Q:** What's your hypothesis about how built-in WebFetch formats its output?
- **Selected:** Raw markdown — built-in returns raw/converted markdown text, same as plugin. Content text passed directly to Claude.
- **Follow-up Q:** Does the built-in WebFetch wrap markdown in any XML tags, or is it bare markdown to stdout?
- **Selected:** Bare markdown to stdout — plugin matches.
- **Follow-up Q:** What's the preferred approach to verify this empirically?
- **Selected:** Non-plugin session capture.
- **Revised after user note:** Built-in tools not accessible for testing — verification strategy revised to no empirical tests.

### 2. Format Reference Source
- **Q:** Without empirical access to built-in tools, what drives output format verification?
- **Selected:** Well-formedness + usability — verify plugin output is structurally valid XML/markdown and Claude can use it. Remove "matches built-in" framing.

### 3. Verification Methodology
- **Q:** Given well-formedness+usability standard and no built-in access, what form does verification take?
- **Selected:** Behavioral verification — e2e test through actual Claude Code session.
- **Follow-up Q:** Behavioral verification approach?
- **Selected:** Phase 11-style harness — automated Claude Code CLI testing.
- **Follow-up Q:** What counts as 'pass' for behavioral verification?
- **Selected:** Claude cites search results in response — proves format is readable.

### 4. Cross-Provider Scope
- **Q:** What does cross-provider verification cover?
- **Selected:** Both — code review (no provider-specific branching) + documentation check.
- **Follow-up Q:** How to verify hooks work on other providers?
- **Selected:** Assume compatibility — hooks are Claude Code framework feature, not provider-dependent. No additional verification.

### 5. Error Output Parity
- **Q:** What error output behavior should the plugin have?
- **Selected:** Current behavior is correct — errors to stderr, exit code 1. No changes needed.

### 6. Truncation Behavior
- **Q:** How to verify truncation matches built-in tool behavior?
- **Selected:** Existing unit test is sufficient — content.test.ts already covers truncation at 100KB with marker. No additional tests needed.

## Deferred Ideas
- None — discussion stayed within phase scope.

## Summary

Phase 12 is a verification phase with no code changes. Key insight: built-in WebSearch/WebFetch are not accessible for direct comparison, so verification uses well-formedness + usability standard. Existing output is functionally correct. Behavioral e2e harness (reusing Phase 11 pattern) proves Claude can consume the output.
