import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

function parseYamlFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const result: Record<string, string> = {};
  for (const line of yaml.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      result[key] = value;
    }
  }
  return result;
}

describe('WebSearch SKILL.md', () => {
  const skillPath = resolve(ROOT, 'skills', 'websearch', 'SKILL.md');

  it('should exist and have description key in YAML frontmatter', () => {
    const content = readFileSync(skillPath, 'utf8');
    const frontmatter = parseYamlFrontmatter(content);
    expect(frontmatter['description']).toBeDefined();
    expect(frontmatter['description'].length).toBeGreaterThan(0);
  });

  it('should have allowed-tools containing Bash', () => {
    const content = readFileSync(skillPath, 'utf8');
    const frontmatter = parseYamlFrontmatter(content);
    expect(frontmatter['allowed-tools']).toContain('Bash');
  });

  it('should contain "node" and "${CLAUDE_PLUGIN_ROOT}" in body', () => {
    const content = readFileSync(skillPath, 'utf8');
    expect(content).toContain('node');
    expect(content).toContain('${CLAUDE_PLUGIN_ROOT}');
  });
});

describe('WebFetch SKILL.md', () => {
  const skillPath = resolve(ROOT, 'skills', 'webfetch', 'SKILL.md');

  it('should exist and have description key in YAML frontmatter', () => {
    const content = readFileSync(skillPath, 'utf8');
    const frontmatter = parseYamlFrontmatter(content);
    expect(frontmatter['description']).toBeDefined();
    expect(frontmatter['description'].length).toBeGreaterThan(0);
  });

  it('should contain usage instructions with node and CLAUDE_PLUGIN_ROOT', () => {
    const content = readFileSync(skillPath, 'utf8');
    expect(content).toContain('node');
    expect(content).toContain('${CLAUDE_PLUGIN_ROOT}');
  });

  it('should NOT contain "not yet implemented"', () => {
    const content = readFileSync(skillPath, 'utf8');
    expect(content.toLowerCase()).not.toContain('not yet implemented');
  });
});

describe('Compiled bundle existence', () => {
  it('scripts/websearch.cjs should exist at the path referenced by SKILL.md', () => {
    const websearchCjsPath = resolve(ROOT, 'scripts', 'websearch.cjs');
    expect(existsSync(websearchCjsPath)).toBe(true);
  });

  it('scripts/webfetch.cjs should exist at the path referenced by SKILL.md', () => {
    const webfetchCjsPath = resolve(ROOT, 'scripts', 'webfetch.cjs');
    expect(existsSync(webfetchCjsPath)).toBe(true);
  });
});
