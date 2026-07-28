import dns from 'dns/promises';
import net from 'net';
import { URL } from 'url';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.google',
  'metadata',
  '169.254.169.254',
  '0.0.0.0',
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b, c] = parts;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8 Private
  if (a === 127) return true; // 127.0.0.0/8 Loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 Link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 Private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 Private
  if (a === 192 && b === 0 && c === 2) return true; // 192.0.2.0/24 TEST-NET-1
  if (a === 198 && b === 51 && c === 100) return true; // 198.51.100.0/24 TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // 203.0.113.0/24 TEST-NET-3
  if (a >= 224) return true; // 224.0.0.0/4 Multicast & Reserved
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('::ffff:127.') ||
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

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
    throw new Error(`URL hostname "${hostname}" is not allowed.`);
  }

  // Block octal/hex/integer IP notations (e.g. 0177.0.0.1, 2130706433, 0x7f000001)
  if (/^(0x[0-9a-f]+|\d+)$/i.test(hostname) || /^(0[0-7]+\.|\d+\.0)/.test(hostname)) {
    throw new Error('Numeric or encoded IP hostname representations are not allowed.');
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
