import type { Algorithm } from '../limiter/types';

export interface HitParams {
  algorithm: Algorithm;
  limit: number;
  windowMs: number;
  userKey: string;
  shadow: boolean;
  failMode: 'open' | 'closed';
  simulateFailure: boolean;
}

const algorithms = new Set<Algorithm>(['token-bucket', 'sliding-counter', 'sliding-log']);

export function parseHitParams(url: URL, headers: Headers): HitParams | { error: string; code: string } {
  const algorithm = (url.searchParams.get('enforce') ?? 'token-bucket') as Algorithm;
  const limit = Number(url.searchParams.get('limit') ?? 10);
  const windowSeconds = Number(url.searchParams.get('window') ?? 10);
  const userKey = headers.get('X-Client-Key') ?? 'default';
  const shadow = url.searchParams.get('shadow') !== 'false';
  const failMode = url.searchParams.get('fail') === 'closed' ? 'closed' : 'open';
  const simulateFailure = url.searchParams.get('simulate_failure') === 'true';

  if (!algorithms.has(algorithm)) return { error: 'Unsupported algorithm', code: 'INVALID_ALGORITHM' };
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return { error: 'limit must be an integer from 1 to 100', code: 'INVALID_LIMIT' };
  if (!Number.isInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 60) return { error: 'window must be an integer from 1 to 60 seconds', code: 'INVALID_WINDOW' };
  if (!/^[a-z0-9_-]{1,32}$/.test(userKey)) return { error: 'X-Client-Key is invalid', code: 'INVALID_CLIENT_KEY' };
  return { algorithm, limit, windowMs: windowSeconds * 1000, userKey, shadow, failMode, simulateFailure };
}

export function parseCheckBody(body: unknown): { key: string; algorithm: Algorithm; limit: number; windowMs: number } | { error: string; code: string } {
  if (typeof body !== 'object' || body === null) return { error: 'JSON body required', code: 'INVALID_BODY' };
  const value = body as Record<string, unknown>;
  const key = typeof value.key === 'string' ? value.key : '';
  const algorithm = typeof value.algo === 'string' ? value.algo as Algorithm : 'token-bucket';
  const limit = typeof value.limit === 'number' ? value.limit : 10;
  const window = typeof value.window === 'number' ? value.window : 10;
  if (!/^[a-z0-9_-]{1,32}$/.test(key) || !algorithms.has(algorithm) || !Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(window) || window < 1 || window > 60) {
    return { error: 'Invalid check parameters', code: 'INVALID_INPUT' };
  }
  return { key, algorithm, limit, windowMs: window * 1000 };
}
