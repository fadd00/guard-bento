# Decisions

## Milestone plan

- M1: pure algorithms, in-memory LimiterDO, `/api/hit`, headers, SQLite-backed DO migration, tests.
- M2: validation and Layer 0 pre-filter with isolate-local coarse cache, Rate Limiting binding, daily cap, degraded mode.
- M3: batched stats, hibernating WebSocket stream, state endpoint, minimal dashboard.
- M4: shadow replay, failure simulation, controls, presets, burst test, comparison feed.
- M5: benchmark scripts, idle-gap measurement, README architecture and measured results.

## Assumptions and verification items

- The installed `@cloudflare/workers-types` verifies the Rate Limiting runtime call as `limit({ key }): Promise<{ success: boolean }>`; Wrangler 4.147.0 verifies the binding as `[[ratelimits]]` with `name`, `namespace_id`, and `simple = { limit = 100, period = 10 }`.
- Wrangler-generated runtime types accept `locationHint: 'apac'` on the Durable Object stub options.
- Wrangler-generated runtime types accept `acceptWebSocket`, `getWebSockets`, `webSocketMessage`, and `webSocketClose` for the hibernation implementation.
- The PRD names the source file `docs/PRD.md`, but the supplied workspace contains `PRD_ guard.hutamalabs.dev.md`; the latter is copied as the source of truth for this implementation.
- No production secrets or deploy commands are used.
- Layer 0 remains configurable in code and defaults to 100 requests per 10 seconds, above the burst cap of 80.
- Stats are intentionally approximate because flushes are opportunistic and isolate-local.
- Cloudflare's current unified Workers model is used: `dashboard/dist` is uploaded through the Worker `[assets]` configuration, so one custom domain serves both UI and API.

## Status

- M1 implementation in progress.
- Local M1-M4 implementation and M5 scaffolding validated with strict typecheck, five tests, Wrangler type generation, and dashboard build.
- Unified static-assets deployment validated with Wrangler 4.147.0 dry-run; `/` serves dashboard assets and `/api/*` remains Worker-owned.
