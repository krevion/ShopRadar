import { HttpException, HttpStatus } from '@nestjs/common';

type AttemptBucket = {
  count: number;
  resetAt: number;
};

export class FailedLoginLimiter {
  private readonly attempts = new Map<string, AttemptBucket>();

  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000
  ) {}

  assertAllowed(key: string) {
    const now = Date.now();
    const bucket = this.attempts.get(key);
    if (bucket && bucket.resetAt > now && bucket.count >= this.maxAttempts) {
      throw new HttpException('Too many sign-in attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  recordFailure(key: string) {
    const now = Date.now();
    const bucket = this.attempts.get(key);
    if (bucket && bucket.resetAt > now) {
      bucket.count += 1;
      return;
    }

    this.removeExpired(now);
    if (this.attempts.size >= this.maxKeys) {
      throw new HttpException('Sign-in is temporarily unavailable. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
  }

  clear(key: string) {
    this.attempts.delete(key);
  }

  private removeExpired(now: number) {
    if (this.attempts.size < this.maxKeys) return;
    for (const [key, bucket] of this.attempts) {
      if (bucket.resetAt <= now) this.attempts.delete(key);
    }
  }
}
