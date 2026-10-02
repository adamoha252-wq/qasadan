/**
 * Simple in-memory rate limiter for the admin login endpoint.
 * NOTE: single-instance only — for multi-server production deploy,
 * swap for Redis/Upstash (documented in Phase 9 deployment notes).
 */

type Attempt = { count: number; firstAt: number };

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 8;

const attempts = new Map<string, Attempt>();

// Periodic cleanup to avoid unbounded growth
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [key, a] of attempts) {
    if (now - a.firstAt > WINDOW_MS) attempts.delete(key);
  }
}

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  cleanup();
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return { allowed: true, retryAfterSec: 0 };
  }

  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((entry.firstAt + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(key: string) {
  attempts.delete(key);
}
