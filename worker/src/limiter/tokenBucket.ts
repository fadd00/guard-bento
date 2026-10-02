import type { Decision, LimiterConfig } from './types';

export class TokenBucket {
  private tokens: number;
  private lastRefillMs: number;

  constructor() {
    this.tokens = 0;
    this.lastRefillMs = 0;
  }

  check(now: number, config: LimiterConfig): Decision {
    const rate = config.limit / config.windowMs;
    if (this.lastRefillMs === 0) {
      this.tokens = config.limit;
      this.lastRefillMs = now;
    } else {
      this.tokens = Math.min(config.limit, this.tokens + Math.max(0, now - this.lastRefillMs) * rate);
      this.lastRefillMs = now;
    }

    const allowed = this.tokens >= 1;
    if (allowed) this.tokens -= 1;
    const remaining = Math.max(0, Math.floor(this.tokens));
    const resetMs = allowed || rate === 0 ? 0 : Math.ceil((1 - this.tokens) / rate);
    return { allowed, remaining, resetMs };
  }
}
