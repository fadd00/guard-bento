export interface StatsEvent {
  at: number;
  key: string;
  outcome: 'allowed' | 'dropped_limiter' | 'dropped_edge';
  algorithm?: string;
  shadows?: Array<{ algorithm: string; allowed: boolean }>;
}

export interface StatsSnapshot {
  allowed: number;
  dropped_limiter: number;
  dropped_edge: number;
  events: StatsEvent[];
  updatedAt: number;
}

export class StatsDO {
  private snapshot: StatsSnapshot = { allowed: 0, dropped_limiter: 0, dropped_edge: 0, events: [], updatedAt: 0 };

  constructor(private readonly state: DurableObjectState, private readonly env: Env) {}

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      const pair = new WebSocketPair();
      this.state.acceptWebSocket(pair[1]);
      pair[1].send(JSON.stringify(this.snapshot));
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    if (request.method === 'POST') {
      const events = await request.json() as StatsEvent[];
      for (const event of events) this.record(event);
      this.broadcast();
      return Response.json({ ok: true });
    }
    if (request.method === 'GET') return Response.json(this.snapshot);
    return Response.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
  }

  webSocketMessage(_webSocket: WebSocket, _message: string | ArrayBuffer): void {}

  webSocketClose(_webSocket: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {}

  private record(event: StatsEvent): void {
    this.snapshot[event.outcome] += 1;
    this.snapshot.events = [...this.snapshot.events.slice(-19), event];
    this.snapshot.updatedAt = event.at;
  }

  private broadcast(): void {
    const payload = JSON.stringify(this.snapshot);
    for (const socket of this.state.getWebSockets()) {
      try { socket.send(payload); } catch { /* disconnected hibernated clients are discarded by the runtime */ }
    }
  }
}
