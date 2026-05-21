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

describe('SKILL.md script path references', () => {
  const skillFiles: { name: string; path: string }[] = [
    { name: 'websearch', path: resolve(ROOT, 'skills', 'websearch', 'SKILL.md') },
    { name: 'webfetch', path: resolve(ROOT, 'skills', 'webfetch', 'SKILL.md') },
  ];

  for (const { name, path } of skillFiles) {
    it(`${name} SKILL.md should reference a valid compiled script file`, () => {
      const content = readFileSync(path, 'utf8');
      const scriptPattern = /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/([^"]+)/;
      const match = content.match(scriptPattern);

      expect(match).not.toBeNull();
      expect(match).toBeDefined();
      /* v8 ignore next 3 — TypeScript narrowing guard; match is always non-null after expect above */
      const extractedFilename = match ? match[1] : '';
      expect(extractedFilename.length).toBeGreaterThan(0);

      const scriptPath = resolve(ROOT, 'scripts', extractedFilename);
      expect(existsSync(scriptPath)).toBe(true);
    });
  }
});

describe('Hooks directory', () => {
  it('should NOT exist (hooks/absence is intentional)', () => {
    const hooksPath = resolve(ROOT, 'hooks');
    expect(existsSync(hooksPath)).toBe(false);
  });
});

describe('Plugin manifest description', () => {
  it('should have a non-empty description field', () => {
    const manifestPath = resolve(ROOT, '.claude-plugin', 'plugin.json');
    const raw = readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    expect(manifest.description).toBeDefined();
    expect(typeof manifest.description).toBe('string');
    expect(manifest.description.length).toBeGreaterThan(0);
  });
});
