import type { Decision, LimiterConfig } from './types';

export class SlidingWindowCounter {
  private previousCount = 0;
  private currentCount = 0;
  private windowStartMs = 0;

  check(now: number, config: LimiterConfig): Decision {
    if (this.windowStartMs === 0) this.windowStartMs = now;
    const elapsed = now - this.windowStartMs;
    if (elapsed >= config.windowMs) {
      const windows = Math.floor(elapsed / config.windowMs);
      this.previousCount = windows === 1 ? this.currentCount : 0;
      this.currentCount = 0;
      this.windowStartMs += windows * config.windowMs;
    }

    const progress = (now - this.windowStartMs) / config.windowMs;
    const estimated = this.previousCount * (1 - progress) + this.currentCount;
    const allowed = estimated < config.limit;
    if (allowed) this.currentCount += 1;
    const nextReset = this.windowStartMs + config.windowMs;
    return {
      allowed,
      remaining: Math.max(0, Math.floor(config.limit - estimated - (allowed ? 1 : 0))),
      resetMs: allowed ? Math.max(0, nextReset - now) : Math.max(1, Math.ceil((estimated - config.limit + 1) * config.windowMs / Math.max(1, this.previousCount))),
    };
  }
}
