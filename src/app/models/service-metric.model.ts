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

/** A single headline number, as rendered by `StatTile`. */
export interface Stat {
  readonly label: string;
  readonly value: string;
  /** Change versus the previous period, as a fraction of 1. Omit when unknown. */
  readonly delta?: number;
  /** When true, a negative delta is the good outcome (e.g. latency, errors). */
  readonly lowerIsBetter?: boolean;
  readonly caption?: string;
}
