import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FLEET } from '../../data/fleet';
import { FleetApi } from '../../data/fleet-api';
import { TableDemo } from './table-demo';

describe('TableDemo', () => {
  let fixture: ComponentFixture<TableDemo>;
  let el: HTMLElement;

  const bodyRows = () => el.querySelectorAll('tbody tr');
  const serviceNames = () =>
    [...el.querySelectorAll('tbody th[scope="row"]')].map((th) => th.textContent?.trim());

  const buttonFor = (label: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(label))!;

  async function click(label: string): Promise<void> {
    buttonFor(label).click();
    await settle();
  }

  async function type(selector: string, value: string): Promise<void> {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  }

  async function choose(selector: string, value: string): Promise<void> {
    const select = el.querySelector<HTMLSelectElement>(selector)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await settle();
  }

  /** Lets the debounce and the simulated round trip both land. */
  async function settle(): Promise<void> {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TableDemo] }).compileComponents();
    TestBed.inject(FleetApi).latencyMs.set(0);

    fixture = TestBed.createComponent(TableDemo);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('starts client-side, showing the first page of the fleet', () => {
    expect(bodyRows().length).toBe(10);
    expect(el.textContent).toContain(`1–10 of ${FLEET.length}`);
  });

  it('tracks the active mode with aria-pressed', async () => {
    expect(buttonFor('Client-side').getAttribute('aria-pressed')).toBe('true');

    await click('Server-side');

    expect(buttonFor('Server-side').getAttribute('aria-pressed')).toBe('true');
    expect(buttonFor('Client-side').getAttribute('aria-pressed')).toBe('false');
  });

  it('renders status as a badge rather than raw text', () => {
    expect(el.querySelector('app-status-badge')).toBeTruthy();
  });

  it('offers every region as a filter option, not just the visible page', () => {
    const options = [...el.querySelectorAll<HTMLOptionElement>('[aria-label="Filter by Region"] option')];
    const regions = new Set(FLEET.map((s) => s.region));

    expect(options.length).toBe(regions.size + 1);
  });

  describe.each(['Client-side', 'Server-side'])('%s', (mode) => {
    beforeEach(async () => {
      await click(mode);
    });

    it('filters by name, case-insensitively', async () => {
      await type('[aria-label="Filter by Service"]', 'SEARCH');

      expect(serviceNames()).toEqual(['Search Index']);
    });

    it('filters by region', async () => {
      await choose('[aria-label="Filter by Region"]', 'eu-west-1');

      const expected = FLEET.filter((s) => s.region === 'eu-west-1').length;
      expect(el.textContent).toContain(`of ${expected}`);
    });

    it('sorts by a numeric column', async () => {
      const header = [...el.querySelectorAll('th[scope="col"]')].find((th) =>
        th.textContent?.includes('p95 latency'),
      )!;
      header.querySelector('button')!.click();
      await settle();

      const fastest = Math.min(...FLEET.map((s) => s.latencyMs));
      expect(serviceNames()[0]).toBe(FLEET.find((s) => s.latencyMs === fastest)!.name);
    });

    it('pages through the fleet', async () => {
      const firstPage = serviceNames();
      await click('Next page');

      expect(serviceNames()).not.toEqual(firstPage);
      expect(el.textContent).toContain(`11–20 of ${FLEET.length}`);
    });

    it('shows the empty state when nothing matches', async () => {
      await type('input[type="search"]', 'no-such-service');

      expect(el.textContent).toContain('No rows match the current filters.');
    });
  });

  it('resets the query when the mode changes', async () => {
    await type('input[type="search"]', 'search');
    expect(bodyRows().length).toBe(1);

    await click('Server-side');

    expect(el.querySelector<HTMLInputElement>('input[type="search"]')!.value).toBe('');
    expect(bodyRows().length).toBe(10);
  });

  it('keeps the previous page on screen while the next one loads', async () => {
    await click('Server-side');
    const before = serviceNames();

    TestBed.inject(FleetApi).latencyMs.set(80);
    buttonFor('Next page').click();
    // Not whenStable(): the resource holds a pending task, so awaiting it would
    // wait out the very fetch this test needs to observe mid-flight.
    fixture.detectChanges();
    fixture.detectChanges();

    // Dimmed and busy, but still showing rows rather than blanking.
    expect(el.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(serviceNames()).toEqual(before);
    expect(el.textContent).not.toContain('No rows');

    await settle();
    expect(serviceNames()).not.toEqual(before);
  });

  it('agrees on page two across both modes', async () => {
    await click('Next page');
    const clientPage = serviceNames();

    await click('Server-side');
    await click('Next page');

    expect(serviceNames()).toEqual(clientPage);
  });
});
