import { createLogger } from './logger.js';

const logger = createLogger('fetch');

export class CrossHostRedirectError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Cross-host redirect from ${from} to ${to}`);
  }
}

export function normalizeUrl(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (url.protocol === 'http:') {
    url.protocol = 'https:';
  }
  return url;
}

export async function fetchWithRedirects(
  url: URL,
  maxHops = 10,
): Promise<{ response: Response; finalUrl: URL }> {
  let currentUrl = url;
  const originalHost = url.hostname;

  for (let hop = 0; hop <= maxHops; hop++) {
    const response = await fetch(currentUrl.toString(), {
      redirect: 'manual',
    });

    // D-14: HTTP 4xx/5xx -> error
    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status} at ${currentUrl.href}`);
    }

    // Handle redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Redirect (${response.status}) without Location header at ${currentUrl.href}`);
      }
      const targetUrl = new URL(location, currentUrl);

      // D-10: Cross-host redirect -> message, don't follow
      if (targetUrl.hostname !== originalHost) {
        throw new CrossHostRedirectError(currentUrl.href, targetUrl.href);
      }

      // D-11: Too many hops
      if (hop === maxHops) {
        throw new Error(`Too many redirects (>${maxHops}) starting from ${url.href}`);
      }

      logger.debug(`Redirect hop ${hop + 1}: ${currentUrl.href} -> ${targetUrl.href}`);
      currentUrl = targetUrl;
      continue;
    }

    // D-15: Content-Type whitelist
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error(`Unsupported content type: ${contentType} at ${currentUrl.href}`);
    }

    return { response, finalUrl: currentUrl };
  }

  throw new Error(`Too many redirects (>${maxHops}) starting from ${url.href}`);
}
