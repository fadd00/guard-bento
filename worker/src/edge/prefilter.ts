const cache = new Map<string, { count: number; windowStarted: number }>();
const WINDOW_MS = 10_000;
export const EDGE_LIMIT = 100;

export interface EdgeResult { allowed: boolean; reason?: 'cache' | 'binding' | 'daily-cap'; }

export async function prefilter(ipHash: string, env: Env): Promise<EdgeResult> {
  const now = Date.now();
  const current = cache.get(ipHash);
  const entry = !current || now - current.windowStarted >= WINDOW_MS ? { count: 0, windowStarted: now } : current;
  entry.count += 1;
  cache.set(ipHash, entry);
  if (entry.count > EDGE_LIMIT) return { allowed: false, reason: 'cache' };
  if (env.EDGE_RATE_LIMIT && !(await env.EDGE_RATE_LIMIT.limit({ key: ipHash })).success) return { allowed: false, reason: 'binding' };
  const dailyCap = Number(env.DAILY_REQUEST_CAP ?? 100000);
  if (dailyCap > 0 && entry.count > dailyCap) return { allowed: false, reason: 'daily-cap' };
  return { allowed: true };
}
