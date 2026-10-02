const base = process.env.GUARD_URL ?? 'http://localhost:8787';
const result = { generated_at: new Date().toISOString(), target: base, metrics: { decision_p50_ms: null, decision_p95_ms: null, do_rtt_p50_ms: null, do_rtt_p95_ms: null, e2e_p50_ms: null, e2e_p95_ms: null }, note: 'TBD: run against a live local Worker and collect Server-Timing plus client timings.' };
await Bun.write('bench/results/latest.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
