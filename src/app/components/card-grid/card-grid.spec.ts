import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceMetric } from '../../models/service-metric.model';
import { CardGrid } from './card-grid';

const SERVICES: readonly ServiceMetric[] = [
  {
    id: 'edge',
    name: 'Edge Router',
    region: 'us-east-1',
    status: 'healthy',
    requests: 1284930,
    latencyMs: 42,
    errorRate: 0.0012,
  },
  {
    id: 'billing',
    name: 'Billing Worker',
    region: 'eu-central-1',
    status: 'offline',
    requests: 0,
    latencyMs: 0,
    errorRate: 0,
  },
];

describe('CardGrid', () => {
  let fixture: ComponentFixture<CardGrid>;
  let el: HTMLElement;

  async function render(services: readonly ServiceMetric[]): Promise<void> {
    fixture.componentRef.setInput('services', services);
    fixture.componentRef.setInput('label', 'Services');
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CardGrid] }).compileComponents();
    fixture = TestBed.createComponent(CardGrid);
  });

  it('renders one list item per service', async () => {
    await render(SERVICES);

    expect(el.querySelectorAll('li').length).toBe(2);
    expect(el.textContent).toContain('Edge Router');
    expect(el.textContent).toContain('Billing Worker');
  });

  it('formats requests, latency and error rate for reading', async () => {
    await render([{ ...SERVICES[0], latencyMs: 1340 }]);

    expect(el.textContent).toContain('1,284,930');
    expect(el.textContent).toContain('1,340 ms');
    expect(el.textContent).toContain('0.12%');
  });

  it('labels the list for assistive tech', async () => {
    await render(SERVICES);

    expect(el.querySelector('ul')?.getAttribute('aria-label')).toBe('Services');
  });

  it('shows status as text, not colour alone', async () => {
    await render(SERVICES);

    expect(el.textContent).toContain('Healthy');
    expect(el.textContent).toContain('Offline');
  });

  it('falls back to an empty state', async () => {
    await render([]);

    expect(el.textContent).toContain('No services match the current filters.');
  });
});
