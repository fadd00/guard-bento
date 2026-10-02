const base = process.env.GUARD_URL ?? 'http://localhost:8787';
const gaps = [10, 30, 60, 120];
const results: Array<{ gap_seconds: number; first_status: number; second_status: number }> = [];
for (const gap of gaps) {
  const key = `idle-${gap}`;
  const first = await fetch(`${base}/api/hit?limit=1&window=60`, { headers: { 'X-Client-Key': key } });
  await new Promise((resolve) => setTimeout(resolve, gap * 1000));
  const second = await fetch(`${base}/api/hit?limit=1&window=60`, { headers: { 'X-Client-Key': key } });
  results.push({ gap_seconds: gap, first_status: first.status, second_status: second.status });
}
await Bun.write('bench/results/idle-gap.json', `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));
