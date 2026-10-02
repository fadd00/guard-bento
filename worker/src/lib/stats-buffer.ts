import type { StatsEvent } from '../do/StatsDO';

const events: StatsEvent[] = [];
let lastFlushAt = 0;
const BATCH_SIZE = 25;

export function queueStat(event: StatsEvent): void { events.push(event); }

export function flushStats(env: Env, waitUntil: (promise: Promise<unknown>) => void): void {
  const now = Date.now();
  if (events.length === 0 || (now - lastFlushAt < 1000 && events.length < BATCH_SIZE)) return;
  const batch = events.splice(0, events.length);
  lastFlushAt = now;
  const id = env.STATS_DO.idFromName('global');
  const stub = env.STATS_DO.get(id);
  waitUntil(stub.fetch('https://stats/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(batch) }));
}
