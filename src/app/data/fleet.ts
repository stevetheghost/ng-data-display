import { Injectable, computed, signal } from '@angular/core';
import { ServiceMetric, ServiceStatus } from '../models/service-metric.model';
import { CURATED_SERVICES } from './metrics';

const REGIONS = [
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'eu-central-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'sa-east-1',
  'global',
] as const;

const SUBJECTS = [
  'Checkout',
  'Inventory',
  'Recommendation',
  'Session',
  'Webhook',
  'Audit',
  'Pricing',
  'Fraud',
  'Catalogue',
  'Identity',
  'Ledger',
  'Telemetry',
  'Import',
  'Export',
  'Thumbnail',
  'Geocode',
  'Feature Flag',
  'Rate Limit',
] as const;

const ROLES = ['Service', 'Worker', 'Gateway', 'Cache', 'Queue', 'Sync'] as const;

/**
 * The curated services plus enough generated ones to make paging meaningful.
 * Generation is seeded, so the fleet is identical on every load — the table demo
 * can assert against it, and server and client mode see the same 60 rows.
 */
export const FLEET: readonly ServiceMetric[] = buildFleet();

/** Backs the data table demo. Kept apart from `Metrics`, whose eight hand-written
 *  services are the right size for the tile and card grids. */
@Injectable({ providedIn: 'root' })
export class Fleet {
  private readonly all = signal<readonly ServiceMetric[]>(FLEET);

  readonly services = this.all.asReadonly();

  readonly regions = computed(() => [...new Set(this.all().map((s) => s.region))].sort());

  readonly statuses = computed(() => [...new Set(this.all().map((s) => s.status))].sort());
}

function buildFleet(): readonly ServiceMetric[] {
  const random = mulberry32(0x5eed);
  const seen = new Set(CURATED_SERVICES.map((s) => s.name));
  const generated: ServiceMetric[] = [];

  for (const subject of SUBJECTS) {
    for (const role of ROLES) {
      if (generated.length >= 52) break;
      // A sparse slice of the cross product keeps the names varied, not systematic.
      if (random() > 0.55) continue;

      const name = `${subject} ${role}`;
      if (seen.has(name)) continue;
      seen.add(name);

      const status = pickStatus(random());
      const offline = status === 'offline';

      generated.push({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        region: REGIONS[Math.floor(random() * REGIONS.length)],
        status,
        requests: offline ? 0 : Math.floor(random() * 2_400_000) + 4_000,
        latencyMs: offline ? 0 : Math.floor(random() * 900) + 12,
        errorRate: offline
          ? 0
          : Number((random() * (status === 'degraded' ? 0.06 : 0.004)).toFixed(4)),
      });
    }
  }

  return [...CURATED_SERVICES, ...generated];
}

function pickStatus(roll: number): ServiceStatus {
  if (roll > 0.88) return 'offline';
  if (roll > 0.72) return 'degraded';
  return 'healthy';
}

/** Small seeded PRNG — deterministic across runs and platforms. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
