import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

describe('Plugin Manifest', () => {
  const manifestPath = resolve(ROOT, '.claude-plugin', 'plugin.json');

  it('should be valid JSON with name "cc-websearch"', () => {
    const raw = readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    expect(manifest.name).toBe('cc-websearch');
  });

  it('should have a version field matching semver pattern', () => {
    const raw = readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
