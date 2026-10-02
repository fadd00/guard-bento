import { SlidingWindowCounter } from '../limiter/slidingWindowCounter';
import { SlidingWindowLog } from '../limiter/slidingWindowLog';
import { TokenBucket } from '../limiter/tokenBucket';
import type { Algorithm, Decision, LimiterConfig, ReplayDecision } from '../limiter/types';

export interface LimiterRequest {
  algorithm: Algorithm;
  limit: number;
  windowMs: number;
  shadow: boolean;
}

export interface LimiterResponse {
  decision: Decision;
  shadows: ReplayDecision[];
  now: number;
  decisionMs: number;
}

export class LimiterDO {
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly counters = new Map<string, SlidingWindowCounter>();
  private readonly logs = new Map<string, SlidingWindowLog>();

  constructor(private readonly state: DurableObjectState, private readonly env: Env) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
    const input = await request.json() as LimiterRequest;
    const now = Date.now();
    const config: LimiterConfig = { limit: input.limit, windowMs: input.windowMs };
    const started = performance.now();
    const decisions = this.runAll(now, config, input.algorithm, input.shadow);
    const decision = decisions.find((item) => item.algorithm === input.algorithm);
    if (!decision) return Response.json({ error: 'Invalid algorithm', code: 'INVALID_ALGORITHM' }, { status: 400 });
    const response: LimiterResponse = {
      decision,
      shadows: decisions,
      now,
      decisionMs: performance.now() - started,
    };
    return Response.json(response);
  }

  private runAll(now: number, config: LimiterConfig, enforced: Algorithm, includeShadow: boolean): ReplayDecision[] {
    const algorithms: Algorithm[] = includeShadow ? ['token-bucket', 'sliding-counter', 'sliding-log'] : [enforced];
    return algorithms.map((algorithm) => ({ algorithm, ...this.algorithm(algorithm).check(now, config) }));
  }

  private algorithm(name: Algorithm): TokenBucket | SlidingWindowCounter | SlidingWindowLog {
    if (name === 'token-bucket') {
      const value = this.buckets.get(name) ?? new TokenBucket();
      this.buckets.set(name, value);
      return value;
    }
    if (name === 'sliding-counter') {
      const value = this.counters.get(name) ?? new SlidingWindowCounter();
      this.counters.set(name, value);
      return value;
    }
    const value = this.logs.get(name) ?? new SlidingWindowLog();
    this.logs.set(name, value);
    return value;
  }
}
