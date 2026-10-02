interface Env {
  LIMITER_DO: DurableObjectNamespace;
  STATS_DO: DurableObjectNamespace;
  EDGE_RATE_LIMIT: RateLimit;
  DAILY_REQUEST_CAP?: string;
  HASH_SALT?: string;
}
