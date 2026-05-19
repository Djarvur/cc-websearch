import { describe, it, expect } from 'vitest';
import { WebSearchInputSchema } from '../src/lib/input.js';

describe('WebSearchInputSchema', () => {
  it('should parse valid input with query only', () => {
    const result = WebSearchInputSchema.parse({ query: 'hello world' });
    expect(result.query).toBe('hello world');
    expect(result.allowed_domains).toBeUndefined();
    expect(result.blocked_domains).toBeUndefined();
  });

  it('should reject query shorter than 2 characters', () => {
    expect(() => WebSearchInputSchema.parse({ query: 'a' })).toThrow();
  });

  it('should parse input with both allowed_domains and blocked_domains', () => {
    const result = WebSearchInputSchema.parse({
      query: 'test query',
      allowed_domains: ['example.com'],
      blocked_domains: ['spam.com'],
    });
    expect(result.query).toBe('test query');
    expect(result.allowed_domains).toEqual(['example.com']);
    expect(result.blocked_domains).toEqual(['spam.com']);
  });

  it('should reject input with unknown extra fields', () => {
    expect(() =>
      WebSearchInputSchema.parse({ query: 'test', extra: 'field' })
    ).toThrow();
  });

  it('should reject input missing query field', () => {
    expect(() => WebSearchInputSchema.parse({})).toThrow();
  });
});
