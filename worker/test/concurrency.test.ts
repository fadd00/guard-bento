import { describe, expect, it } from 'vitest';
import { LimiterDO } from '../src/do/LimiterDO';

describe('LimiterDO', () => {
  it('allows exactly the configured number under parallel requests', async () => {
    const limiter = new LimiterDO({} as DurableObjectState, {} as Env);
    const requests = Array.from({ length: 100 }, () => limiter.fetch(new Request('https://limiter', {
      method: 'POST',
      body: JSON.stringify({ algorithm: 'sliding-log', limit: 10, windowMs: 10000, shadow: false }),
    })));
    const responses = await Promise.all(requests);
    const allowed = await Promise.all(responses.map(async (response) => (await response.json() as { decision: { allowed: boolean } }).decision.allowed));
    expect(allowed.filter(Boolean)).toHaveLength(10);
  });
});