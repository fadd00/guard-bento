import { describe, expect, it } from 'vitest';
import { prefilter } from '../src/edge/prefilter';

describe('Layer 0 prefilter', () => {
  it('drops coarse over-limit traffic without a limiter DO call', async () => {
    let bindingCalls = 0;
    const env = {
      DAILY_REQUEST_CAP: '100000',
      EDGE_RATE_LIMIT: { limit: async () => { bindingCalls += 1; return { success: true }; } },
    } as unknown as Env;
    for (let index = 0; index < 101; index += 1) await prefilter('same-client', env);
    expect(bindingCalls).toBe(100);
  });
});