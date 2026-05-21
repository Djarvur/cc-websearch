import { describe, it, expect } from 'vitest';
import { WebSearchInputSchema, validateDomainExclusivity } from '../src/lib/input.js';

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
    expect(() => WebSearchInputSchema.parse({ query: 'test', extra: 'field' })).toThrow();
  });

  it('should reject input missing query field', () => {
    expect(() => WebSearchInputSchema.parse({})).toThrow();
  });
});

describe('validateDomainExclusivity', () => {
  it('should throw when both allowed_domains and blocked_domains are provided', () => {
    expect(() =>
      validateDomainExclusivity({
        allowed_domains: ['github.com'],
        blocked_domains: ['reddit.com'],
      }),
    ).toThrow('Cannot specify both allowed_domains and blocked_domains in the same request.');
  });

  it('should not throw when only allowed_domains is provided', () => {
    expect(() => validateDomainExclusivity({ allowed_domains: ['github.com'] })).not.toThrow();
  });

  it('should not throw when only blocked_domains is provided', () => {
    expect(() => validateDomainExclusivity({ blocked_domains: ['reddit.com'] })).not.toThrow();
  });

  it('should not throw when neither is provided', () => {
    expect(() => validateDomainExclusivity({})).not.toThrow();
  });

  it('should not throw when allowed_domains is empty array', () => {
    expect(() => validateDomainExclusivity({ allowed_domains: [] })).not.toThrow();
  });

  it('should not throw when blocked_domains is empty array', () => {
    expect(() => validateDomainExclusivity({ blocked_domains: [] })).not.toThrow();
  });
});
