import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableDemo } from './table-demo';

describe('TableDemo', () => {
  let fixture: ComponentFixture<TableDemo>;
  let el: HTMLElement;

  const bodyRows = () => el.querySelectorAll('tbody tr');

  async function setControl(selector: string, value: string): Promise<void> {
    const input = el.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TableDemo] }).compileComponents();
    fixture = TestBed.createComponent(TableDemo);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('lists every service before filtering', () => {
    expect(bodyRows().length).toBe(8);
    expect(el.textContent).toContain('Showing 8 of 8 services');
  });

  it('filters by name, case-insensitively', async () => {
    await setControl('#query', 'SEARCH');

    expect(bodyRows().length).toBe(1);
    expect(el.textContent).toContain('Search Index');
    expect(el.textContent).toContain('Showing 1 of 8 services');
  });

  it('filters by region', async () => {
    await setControl('#region', 'us-east-1');

    expect(bodyRows().length).toBe(3);
  });

  it('shows the table empty state when nothing matches', async () => {
    await setControl('#query', 'no-such-service');

    expect(el.textContent).toContain('No rows match the current filters.');
  });

  it('renders status as a badge rather than raw text', async () => {
    await setControl('#query', 'Billing');

    expect(el.querySelector('app-status-badge')).toBeTruthy();
    expect(el.textContent).toContain('Offline');
  });

  it('announces the result count politely', () => {
    expect(el.querySelector('[aria-live="polite"]')?.textContent).toContain('Showing 8 of 8');
  });
});
