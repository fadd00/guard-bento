import './style.css';

const api = (import.meta.env.VITE_GUARD_API as string | undefined) ?? (import.meta.env.DEV ? 'http://localhost:8787' : '');
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Dashboard root missing');

app.innerHTML = `
  <header><span class="eyebrow">GUARD / TRAFFIC LAB</span><h1>See the limit think.</h1><p>Three algorithms. One request stream. Live evidence.</p></header>
  <section class="controls"><label>Algorithm<select id="algo"><option value="token-bucket">Token Bucket</option><option value="sliding-counter">Sliding Counter</option><option value="sliding-log">Sliding Window Log</option></select></label><label>Limit<input id="limit" type="number" min="1" max="100" value="10" /></label><label>Window (s)<input id="window" type="number" min="1" max="60" value="10" /></label><label>Failure<select id="fail"><option value="open">Fail open</option><option value="closed">Fail closed</option></select></label><button id="burst">Run burst <span>80 max</span></button></section>
  <section class="grid"><article class="gauge"><span class="eyebrow">QUOTA</span><strong id="quota">--</strong><small>remaining</small><div class="ring" id="ring"></div></article><article><div class="panel-heading"><span class="eyebrow">LAST 60 SEC</span><span id="updated">waiting for stream</span></div><div class="bars"><div><b id="allowed">0</b><span>allowed</span></div><div><b id="limiter">0</b><span>limiter drops</span></div><div><b id="edge">0</b><span>edge drops</span></div></div></article><article><div class="panel-heading"><span class="eyebrow">EVENT FEED</span><span>masked keys only</span></div><ol id="events"></ol></article><article><div class="panel-heading"><span class="eyebrow">SHADOW READOUT</span><span>vs sliding log</span></div><div id="shadow" class="shadow">No decisions yet.</div></article></section>
`;

const $ = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector) as T;
const update = (state: { allowed: number; dropped_limiter: number; dropped_edge: number; events: Array<{ key: string; outcome: string; shadows?: Array<{ algorithm: string; allowed: boolean }> }>; updatedAt: number }) => {
  $('#allowed').textContent = String(state.allowed); $('#limiter').textContent = String(state.dropped_limiter); $('#edge').textContent = String(state.dropped_edge); $('#updated').textContent = state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString() : 'waiting';
  $('#events').innerHTML = state.events.slice(-8).reverse().map((event) => `<li><span>${event.outcome.replace('_', ' ')}</span><code>${event.key}</code></li>`).join('');
  const latest = state.events.at(-1); $('#shadow').textContent = latest?.shadows?.map((item) => `${item.algorithm}: ${item.allowed ? 'allow' : 'drop'}`).join('  ·  ') ?? 'No decisions yet.';
};

async function state(): Promise<void> { const response = await fetch(`${api}/api/state`); if (response.ok) update(await response.json() as Parameters<typeof update>[0]); }
$('#burst').addEventListener('click', async () => { const count = Math.min(80, 80); const query = new URLSearchParams({ enforce: ($('#algo') as HTMLSelectElement).value, limit: ($('#limit') as HTMLInputElement).value, window: ($('#window') as HTMLInputElement).value, fail: ($('#fail') as HTMLSelectElement).value }); await Promise.all(Array.from({ length: count }, () => fetch(`${api}/api/hit?${query}`))); await state(); });
const streamBase = api || `${window.location.protocol}//${window.location.host}`;
const stream = new WebSocket(streamBase.replace(/^http/, 'ws') + '/api/stream'); stream.onmessage = (event) => update(JSON.parse(event.data) as Parameters<typeof update>[0]);
void state();
