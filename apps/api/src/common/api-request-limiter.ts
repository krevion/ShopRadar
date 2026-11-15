import { NextFunction, Request, Response } from 'express';

type RateLimit = {
  maxRequests: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const minute = 60_000;

const rateLimits: Array<{ matches: (method: string, path: string) => boolean; limit: RateLimit }> = [
  { matches: (_method, path) => path === '/api/admin/auth/login', limit: { maxRequests: 10, windowMs: 15 * minute } },
  { matches: (_method, path) => path === '/api/auth/login', limit: { maxRequests: 20, windowMs: 15 * minute } },
  { matches: (_method, path) => path === '/api/auth/register', limit: { maxRequests: 5, windowMs: 60 * minute } },
  { matches: (method, path) => method === 'POST' && path === '/api/videos', limit: { maxRequests: 6, windowMs: 15 * minute } },
  { matches: (_method, path) => path === '/api/analytics/page-view', limit: { maxRequests: 120, windowMs: minute } },
  { matches: (method) => !['GET', 'HEAD', 'OPTIONS'].includes(method), limit: { maxRequests: 60, windowMs: minute } },
  { matches: () => true, limit: { maxRequests: 300, windowMs: minute } }
];

export class ApiRequestLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly maxKeys = 20_000) {}

  middleware(request: Request, response: Response, next: NextFunction) {
    const path = new URL(request.originalUrl, 'http://localhost').pathname;
    if (!path.startsWith('/api/') || request.method === 'OPTIONS') {
      next();
      return;
    }

    const selected = rateLimits.find(({ matches }) => matches(request.method, path));
    if (!selected) {
      next();
      return;
    }

    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const key = `${ip}:${selected.limit.windowMs}:${selected.limit.maxRequests}:${rateLimitGroup(request.method, path)}`;
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.pruneExpired(now);
      if (this.buckets.size >= this.maxKeys) {
        const oldestKey = this.buckets.keys().next().value;
        if (oldestKey !== undefined) this.buckets.delete(oldestKey);
      }
      bucket = { count: 0, resetAt: now + selected.limit.windowMs };
      this.buckets.set(key, bucket);
    }

    if (bucket.count >= selected.limit.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      response.setHeader('Retry-After', String(retryAfterSeconds));
      response.setHeader('Cache-Control', 'private, no-store');
      response.status(429).json({ statusCode: 429, message: 'Too many requests. Try again later.' });
      return;
    }

    bucket.count += 1;
    next();
  }

  private pruneExpired(now: number) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

function rateLimitGroup(method: string, path: string) {
  if (path === '/api/admin/auth/login' || path === '/api/auth/login' || path === '/api/auth/register' || path === '/api/analytics/page-view') {
    return path;
  }
  if (method === 'POST' && path === '/api/videos') return path;
  return method === 'GET' || method === 'HEAD' ? 'read' : 'write';
}
