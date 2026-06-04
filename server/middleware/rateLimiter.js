const buckets = new Map();

/**
 * Simple in-memory rate limiter for API routes.
 */
export function rateLimiter({ windowMs = 60_000, max = 120, keyPrefix = 'api' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));

    if (bucket.count > max) {
      return res.status(429).json({
        error: 'Terlalu banyak permintaan. Coba lagi sebentar.',
        retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000)
      });
    }

    next();
  };
}

export function resetRateLimitBuckets() {
  buckets.clear();
}

export default rateLimiter;