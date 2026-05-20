import { z } from 'zod';

export const WebSearchInputSchema = z.strictObject({
  query: z.string().min(2, 'Query must be at least 2 characters'),
  allowed_domains: z.array(z.string()).optional(),
  blocked_domains: z.array(z.string()).optional(),
});

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

export async function readStdin<T>(schema: z.ZodType<T>): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  const parsed = JSON.parse(raw);
  return schema.parse(parsed);
}

export function validateDomainExclusivity(input: {
  allowed_domains?: string[];
  blocked_domains?: string[];
}): void {
  const hasAllowed = input.allowed_domains && input.allowed_domains.length > 0;
  const hasBlocked = input.blocked_domains && input.blocked_domains.length > 0;

  if (hasAllowed && hasBlocked) {
    throw new Error('Cannot specify both allowed_domains and blocked_domains in the same request.');
  }
}
