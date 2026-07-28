import dns from 'dns/promises';
import net from 'net';
import { URL } from 'url';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.google',
  '169.254.169.254',
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80')
  );
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIpv4(ip);
  if (net.isIPv6(ip)) return isPrivateIpv6(ip);
  return false;
}

export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL format.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are allowed.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('URLs with embedded credentials are not allowed.');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error(`URL hostname "${hostname}" is not allowed.`);
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new Error('URLs pointing to private or local network addresses are not allowed.');
    }
    return parsed;
  }

  const addresses = await dns.lookup(hostname, { all: true });
  if (addresses.length === 0) {
    throw new Error(`Could not resolve hostname "${hostname}".`);
  }

  for (const addr of addresses) {
    if (isPrivateIp(addr.address)) {
      throw new Error('URLs pointing to private or local network addresses are not allowed.');
    }
  }

  return parsed;
}

export async function safeFetch(
  rawUrl: string,
  options: { timeoutMs?: number; maxRedirects?: number } = {}
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxRedirects = options.maxRedirects ?? 3;

  let currentUrl = (await assertSafeUrl(rawUrl)).toString();

  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ChaiBook-LLM/1.0 (+https://chaibook.app)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`Redirect response from "${currentUrl}" missing Location header.`);
        }
        if (redirect >= maxRedirects) {
          throw new Error(`Too many redirects while fetching "${rawUrl}".`);
        }
        currentUrl = new URL(location, currentUrl).toString();
        await assertSafeUrl(currentUrl);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch URL (${response.status} ${response.statusText}).`);
      }

      return response;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs / 1000}s while fetching URL.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Failed to fetch URL "${rawUrl}".`);
}
