import { describe, expect, it } from 'vitest';
import { TokenBucket } from '../src/limiter/tokenBucket';
import { SlidingWindowCounter } from '../src/limiter/slidingWindowCounter';
import { SlidingWindowLog } from '../src/limiter/slidingWindowLog';

const config = { limit: 3, windowMs: 1000 };

describe('TokenBucket', () => {
  it('allows capacity then refills from the supplied clock', () => {
    const limiter = new TokenBucket();
    expect(limiter.check(1, config).allowed).toBe(true);
    expect(limiter.check(1, config).allowed).toBe(true);
    expect(limiter.check(1, config).allowed).toBe(true);
    expect(limiter.check(1, config).allowed).toBe(false);
    expect(limiter.check(335, config).allowed).toBe(true);
  });
});

describe('SlidingWindowCounter', () => {
  it('rotates at a window boundary', () => {
    const limiter = new SlidingWindowCounter();
    expect(limiter.check(100, config).allowed).toBe(true);
    expect(limiter.check(100, config).allowed).toBe(true);
    expect(limiter.check(100, config).allowed).toBe(true);
    expect(limiter.check(100, config).allowed).toBe(false);
    expect(limiter.check(1200, config).allowed).toBe(true);
  });
});

describe('SlidingWindowLog', () => {
  it('evicts timestamps at the boundary', () => {
    const limiter = new SlidingWindowLog();
    expect(limiter.check(100, config).allowed).toBe(true);
    expect(limiter.check(100, config).allowed).toBe(true);
    expect(limiter.check(100, config).allowed).toBe(true);
    expect(limiter.check(100, config).allowed).toBe(false);
    expect(limiter.check(1100, config).allowed).toBe(true);
  });
});
