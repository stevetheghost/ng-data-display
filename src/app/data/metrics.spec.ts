import { TestBed } from '@angular/core/testing';

import { Metrics } from './metrics';

describe('Metrics', () => {
  let service: Metrics;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Metrics);
  });

  it('exposes sample services', () => {
    expect(service.services().length).toBeGreaterThan(0);
  });

  it('derives a sorted, de-duplicated region list', () => {
    const regions = service.regions();

    expect(new Set(regions).size).toBe(regions.length);
    expect([...regions].sort()).toEqual(regions);
  });

  it('counts offline services in the headline stats', () => {
    const offline = service.services().filter((s) => s.status === 'offline').length;
    const stat = service.headline().find((s) => s.label === 'Services offline');

    expect(stat?.value).toBe(String(offline));
  });

  it('excludes offline services from average latency', () => {
    const live = service.services().filter((s) => s.status !== 'offline');
    const expected = Math.round(live.reduce((sum, s) => sum + s.latencyMs, 0) / live.length);
    const stat = service.headline().find((s) => s.label === 'Avg p95 latency');

    expect(stat?.value).toBe(`${expected} ms`);
  });

  it('marks latency and error rate as lower-is-better', () => {
    const stats = service.headline();

    expect(stats.find((s) => s.label === 'Avg p95 latency')?.lowerIsBetter).toBe(true);
    expect(stats.find((s) => s.label === 'Error rate')?.lowerIsBetter).toBe(true);
  });
});
