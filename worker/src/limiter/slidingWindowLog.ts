import type { Decision, LimiterConfig } from './types';

export class SlidingWindowLog {
  private timestamps: number[] = [];

  check(now: number, config: LimiterConfig): Decision {
    const cutoff = now - config.windowMs;
    while (this.timestamps.length > 0 && (this.timestamps[0] ?? 0) <= cutoff) this.timestamps.shift();
    const allowed = this.timestamps.length < config.limit;
    if (allowed) this.timestamps.push(now);
    const oldest = this.timestamps[0] ?? now;
    return {
      allowed,
      remaining: Math.max(0, config.limit - this.timestamps.length),
      resetMs: this.timestamps.length === 0 ? 0 : Math.max(0, oldest + config.windowMs - now),
    };
  }
}
