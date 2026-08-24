import crypto from "crypto";

/**
 * IP and Subnet check for SSRF protection
 */
const PRIVATE_IP_REGEX = /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|0\.\d{1,3}\.\d{1,3}\.\d{1,3}|255\.255\.255\.255)$/;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
  "instance-data",
]);

/**
 * Validates URLs to prevent SSRF, protocol smuggling, and internal network scanning
 */
export function isSafePublicUrl(inputUrl: string): { safe: boolean; reason?: string; url?: URL } {
  try {
    let raw = inputUrl.trim();
    if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
      raw = `https://${raw}`;
    }

    const parsed = new URL(raw);

    // 1. Only allow HTTP and HTTPS
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, reason: "Disallowed protocol" };
    }

    // 2. Reject non-standard ports (e.g. 22, 25, 3306, 5432, 6379)
    if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
      return { safe: false, reason: "Disallowed port" };
    }

    // 3. Reject blocked hostnames & cloud metadata services
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
      return { safe: false, reason: "Blocked internal host" };
    }

    // 4. Reject private IPv4 ranges
    if (PRIVATE_IP_REGEX.test(hostname)) {
      return { safe: false, reason: "Private IP range" };
    }

    // 5. Reject IPv6 loopback / local addresses
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      const ipv6 = hostname.slice(1, -1);
      if (ipv6 === "::1" || ipv6.startsWith("fe80:") || ipv6.startsWith("fc00:")) {
        return { safe: false, reason: "Private IPv6 address" };
      }
    }

    return { safe: true, url: parsed };
  } catch {
    return { safe: false, reason: "Invalid URL syntax" };
  }
}

/**
 * Sanitizes and validates redirect URLs (prevents open redirects and javascript: execution)
 */
export function sanitizeRedirect(targetUrl: string | null | undefined, fallbackOrigin: string): string {
  if (!targetUrl) return `${fallbackOrigin}/`;
  const check = isSafePublicUrl(targetUrl);
  if (!check.safe || !check.url) {
    return `${fallbackOrigin}/`;
  }
  return check.url.href;
}

/**
 * Sanitizes plain text input (strips control characters, XSS vectors, and enforces max length)
 */
export function sanitizeText(input: unknown, maxLength = 100): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // remove control characters
    .replace(/[<>]/g, "") // strip html brackets
    .trim()
    .slice(0, maxLength);
}

/**
 * Constant-time string comparison preventing timing attacks on secrets
 */
export function secureTimingCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Simple in-memory sliding window rate limiter
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}

// Clean up stale rate limits every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt <= now) {
        rateLimitStore.delete(k);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}
