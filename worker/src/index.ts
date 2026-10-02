import { Hono } from 'hono';
import { prefilter } from './edge/prefilter';
import { LimiterDO } from './do/LimiterDO';
import { StatsDO } from './do/StatsDO';
import { applyLimitHeaders } from './lib/headers';
import { hashClientIp, maskHash } from './lib/hash';
import { flushStats, queueStat } from './lib/stats-buffer';
import { parseCheckBody, parseHitParams } from './lib/validate';
import type { Algorithm } from './limiter/types';

export { LimiterDO, StatsDO };

type Bindings = {
  LIMITER_DO: DurableObjectNamespace;
  STATS_DO: DurableObjectNamespace;
  EDGE_RATE_LIMIT: RateLimit;
  DAILY_REQUEST_CAP: string;
  HASH_SALT?: string;
};

type AppEnv = { Bindings: Bindings };
const app = new Hono<AppEnv>();

app.get('/api/hit', async (c) => {
  const parsed = parseHitParams(new URL(c.req.url), c.req.raw.headers);
  if ('error' in parsed) return c.json(parsed, 400);
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const ipHash = await hashClientIp(ip, c.env.HASH_SALT ?? 'guard-local-salt');
  const edge = await prefilter(ipHash, c.env);
  if (!edge.allowed) {
    queueStat({ at: Date.now(), key: maskHash(ipHash), outcome: 'dropped_edge' });
    flushStats(c.env, c.executionCtx.waitUntil.bind(c.executionCtx));
    return c.json({ error: 'Edge protection limit reached', code: 'EDGE_LIMIT' }, 429, { 'X-Guard-Mode': 'edge' });
  }
  const clientKey = `${ipHash}:${parsed.userKey}`;
  const id = c.env.LIMITER_DO.idFromName(clientKey);
  const stub = c.env.LIMITER_DO.get(id, { locationHint: 'apac' });
  const started = performance.now();
  let response: Response;
  try {
    if (parsed.simulateFailure) throw new Error('simulated DO failure');
    response = await stub.fetch('https://limiter/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ algorithm: parsed.algorithm, limit: parsed.limit, windowMs: parsed.windowMs, shadow: parsed.shadow }) });
  } catch {
    const mode = parsed.failMode === 'open' ? 'fail-open' : 'fail-closed';
    const headers = new Headers({ 'X-Guard-Mode': mode, 'Retry-After': '1' });
    queueStat({ at: Date.now(), key: maskHash(ipHash), outcome: mode === 'fail-open' ? 'allowed' : 'dropped_limiter' });
    flushStats(c.env, c.executionCtx.waitUntil.bind(c.executionCtx));
    return new Response(JSON.stringify({ allowed: mode === 'fail-open', mode }), { status: mode === 'fail-open' ? 200 : 503, headers: { ...Object.fromEntries(headers), 'content-type': 'application/json' } });
  }
  const doRttMs = performance.now() - started;
  const result = await response.json() as { decision: { allowed: boolean; remaining: number; resetMs: number }; shadows: Array<{ algorithm: Algorithm; allowed: boolean }>; decisionMs: number };
  const headers = new Headers();
  applyLimitHeaders(headers, result.decision, parsed.limit, parsed.algorithm, 'enforced', doRttMs, result.decisionMs);
  queueStat({ at: Date.now(), key: maskHash(ipHash), outcome: result.decision.allowed ? 'allowed' : 'dropped_limiter', algorithm: parsed.algorithm, shadows: result.shadows });
  flushStats(c.env, c.executionCtx.waitUntil.bind(c.executionCtx));
  return new Response(JSON.stringify({ allowed: result.decision.allowed, remaining: result.decision.remaining, reset_ms: result.decision.resetMs, shadows: result.shadows }), { status: result.decision.allowed ? 200 : 429, headers: { ...Object.fromEntries(headers), 'content-type': 'application/json' } });
});

app.post('/v1/check', async (c) => {
  const parsed = parseCheckBody(await c.req.json().catch(() => null));
  if ('error' in parsed) return c.json(parsed, 400);
  const ipHash = await hashClientIp(c.req.header('CF-Connecting-IP') ?? 'unknown', c.env.HASH_SALT ?? 'guard-local-salt');
  const clientKey = `${ipHash}:${parsed.key}`;
  const stub = c.env.LIMITER_DO.get(c.env.LIMITER_DO.idFromName(clientKey), { locationHint: 'apac' });
  const response = await stub.fetch('https://limiter/check', { method: 'POST', body: JSON.stringify({ algorithm: parsed.algorithm, limit: parsed.limit, windowMs: parsed.windowMs, shadow: false }) });
  const result = await response.json() as { decision: { allowed: boolean; remaining: number; resetMs: number } };
  return c.json({ allowed: result.decision.allowed, remaining: result.decision.remaining, reset_ms: result.decision.resetMs });
});

app.get('/api/state', async (c) => {
  const response = await c.env.STATS_DO.get(c.env.STATS_DO.idFromName('global')).fetch('https://stats');
  return new Response(await response.text(), { headers: { 'content-type': 'application/json' } });
});

app.get('/api/stream', async (c) => {
  const response = await c.env.STATS_DO.get(c.env.STATS_DO.idFromName('global')).fetch('https://stats', { headers: { Upgrade: 'websocket' } });
  return response;
});

app.get('/health', (c) => c.json({ ok: true }));

export default app;
