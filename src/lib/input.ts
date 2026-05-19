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
