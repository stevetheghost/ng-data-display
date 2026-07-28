import { Injectable, computed, signal } from '@angular/core';
import { ServiceMetric, Stat } from '../models/service-metric.model';

/** Hand-written services, used on their own by the tiles and card demos. */
export const CURATED_SERVICES: readonly ServiceMetric[] = [
  {
    id: 'edge-router',
    name: 'Edge Router',
    region: 'us-east-1',
    status: 'healthy',
    requests: 1_284_930,
    latencyMs: 42,
    errorRate: 0.0012,
  },
  {
    id: 'auth-service',
    name: 'Auth Service',
    region: 'us-east-1',
    status: 'healthy',
    requests: 612_400,
    latencyMs: 88,
    errorRate: 0.0004,
  },
  {
    id: 'search-index',
    name: 'Search Index',
    region: 'eu-west-1',
    status: 'degraded',
    requests: 340_118,
    latencyMs: 512,
    errorRate: 0.0271,
  },
  {
    id: 'media-transcoder',
    name: 'Media Transcoder',
    region: 'us-west-2',
    status: 'healthy',
    requests: 94_260,
    latencyMs: 1_340,
    errorRate: 0.0038,
  },
  {
    id: 'billing-worker',
    name: 'Billing Worker',
    region: 'eu-central-1',
    status: 'offline',
    requests: 0,
    latencyMs: 0,
    errorRate: 0,
  },
  {
    id: 'notification-fanout',
    name: 'Notification Fanout',
    region: 'ap-southeast-2',
    status: 'healthy',
    requests: 448_902,
    latencyMs: 61,
    errorRate: 0.0009,
  },
  {
    id: 'report-builder',
    name: 'Report Builder',
    region: 'us-east-1',
    status: 'degraded',
    requests: 12_744,
    latencyMs: 2_890,
    errorRate: 0.0412,
  },
  {
    id: 'asset-cdn',
    name: 'Asset CDN',
    region: 'global',
    status: 'healthy',
    requests: 3_902_551,
    latencyMs: 18,
    errorRate: 0.0002,
  },
];

/**
 * Sample data for the showcase. In a real app this would wrap `httpResource`
 * or `resource`; the surface below is deliberately signal-shaped so swapping
 * the source out would not change any consumer.
 */
@Injectable({ providedIn: 'root' })
export class Metrics {
  private readonly all = signal<readonly ServiceMetric[]>(CURATED_SERVICES);

  readonly services = this.all.asReadonly();

  readonly regions = computed(() => [...new Set(this.all().map((s) => s.region))].sort());

  readonly headline = computed<readonly Stat[]>(() => {
    const services = this.all();
    const live = services.filter((s) => s.status !== 'offline');
    const requests = services.reduce((sum, s) => sum + s.requests, 0);
    const weightedErrors = services.reduce((sum, s) => sum + s.errorRate * s.requests, 0);
    const latency = live.length
      ? live.reduce((sum, s) => sum + s.latencyMs, 0) / live.length
      : 0;

    return [
      {
        label: 'Requests (1h)',
        value: compact(requests),
        delta: 0.084,
        caption: `across ${services.length} services`,
      },
      {
        label: 'Avg p95 latency',
        value: `${Math.round(latency)} ms`,
        delta: 0.121,
        lowerIsBetter: true,
        caption: 'live services only',
      },
      {
        label: 'Error rate',
        value: `${((requests ? weightedErrors / requests : 0) * 100).toFixed(2)}%`,
        delta: -0.033,
        lowerIsBetter: true,
        caption: 'request-weighted',
      },
      {
        label: 'Services offline',
        value: String(services.filter((s) => s.status === 'offline').length),
        caption: 'paged on-call',
      },
    ];
  });
}

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}
