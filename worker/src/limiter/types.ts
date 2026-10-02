export type Algorithm = 'token-bucket' | 'sliding-counter' | 'sliding-log';

export interface LimiterConfig {
  limit: number;
  windowMs: number;
}

export interface Decision {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export interface ReplayDecision extends Decision {
  algorithm: Algorithm;
}
