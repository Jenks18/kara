/**
 * In-memory sliding-window rate limiter.
 *
 * Each bucket (keyed by IP or userId) stores recent request timestamps.
 * If requests exceed the limit within the window, the call is rejected.
 *
 * For a single Vercel serverless instance this is best-effort — each cold
 * start resets the map.  For stricter guarantees at scale, swap in
 * Upstash Redis (@upstash/ratelimit), but this covers the 1 000-user
 * tier without adding a dependency.
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitBucket {
  timestamps: number[]
}

const buckets = new Map<string, RateLimitBucket>()

// Evict stale buckets every 5 minutes to prevent unbounded memory growth
const EVICTION_INTERVAL_MS = 5 * 60 * 1000
let lastEviction = Date.now()

function evictStale(windowMs: number) {
  const now = Date.now()
  if (now - lastEviction < EVICTION_INTERVAL_MS) return
  lastEviction = now
  const cutoff = now - windowMs
  buckets.forEach((bucket, key) => {
    bucket.timestamps = bucket.timestamps.filter((t: number) => t > cutoff)
    if (bucket.timestamps.length === 0) buckets.delete(key)
  })
}

/**
 * Returns `null` if the request is within limits, or a 429 NextResponse
 * if the rate limit has been exceeded.
 *
 * @param req       incoming request (used for IP extraction)
 * @param userId    authenticated userId (preferred key, prevents IP-sharing conflicts)
 * @param limit     max requests allowed within the window  (default 10)
 * @param windowMs  sliding window duration in ms            (default 60 000 = 1 min)
 */
export function rateLimit(
  req: NextRequest,
  userId: string | null,
  { limit = 10, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): NextResponse | null {
  evictStale(windowMs)

  // Prefer userId; fall back to forwarded IP → connection IP → 'unknown'
  const key =
    userId ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const now = Date.now()
  const bucket = buckets.get(key) ?? { timestamps: [] }
  bucket.timestamps = bucket.timestamps.filter((t) => t > now - windowMs)

  if (bucket.timestamps.length >= limit) {
    const retryAfterSec = Math.ceil(
      (bucket.timestamps[0] + windowMs - now) / 1000
    )
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  bucket.timestamps.push(now)
  buckets.set(key, bucket)
  return null
}
