import type { Decision } from '../limiter/types';

export function applyLimitHeaders(headers: Headers, decision: Decision, limit: number, algorithm: string, mode: string, doRttMs: number, decisionMs: number): void {
  headers.set('RateLimit-Limit', String(limit));
  headers.set('RateLimit-Remaining', String(decision.remaining));
  headers.set('RateLimit-Reset', String(Math.ceil(decision.resetMs / 1000)));
  headers.set('Server-Timing', `decision;dur=${decisionMs.toFixed(2)}, do_rtt;dur=${doRttMs.toFixed(2)}`);
  headers.set('X-Guard-Algo', algorithm);
  headers.set('X-Guard-Mode', mode);
  if (!decision.allowed) headers.set('Retry-After', String(Math.max(1, Math.ceil(decision.resetMs / 1000))));
}
