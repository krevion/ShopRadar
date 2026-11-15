import { Injectable } from '@nestjs/common';

type CacheEntry = {
  expiresAt: number;
  value: Promise<unknown>;
};

@Injectable()
export class ResponseCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly maxEntries = 1_000;

  async getOrSet<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > now) return cached.value as Promise<T>;
    if (cached) this.entries.delete(key);

    this.removeExpired(now);
    while (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }

    const value = Promise.resolve().then(load);
    const entry: CacheEntry = { expiresAt: now + ttlMs, value };
    this.entries.set(key, entry);
    try {
      return await value;
    } catch (error) {
      if (this.entries.get(key) === entry) this.entries.delete(key);
      throw error;
    }
  }

  private removeExpired(now: number) {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }
}
