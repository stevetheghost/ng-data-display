export type ServiceStatus = 'healthy' | 'degraded' | 'offline';

export interface ServiceMetric {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly status: ServiceStatus;
  /** Requests handled in the last hour. */
  readonly requests: number;
  /** p95 latency in milliseconds. */
  readonly latencyMs: number;
  /** Share of requests that returned 5xx, as a fraction of 1. */
  readonly errorRate: number;
}
