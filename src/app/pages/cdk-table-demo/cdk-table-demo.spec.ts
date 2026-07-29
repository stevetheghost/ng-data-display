import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FLEET } from '../../data/fleet';
import { CdkTableDemo } from './cdk-table-demo';

describe('CdkTableDemo', () => {
  let fixture: ComponentFixture<CdkTableDemo>;
  let el: HTMLElement;

  const footerValues = () =>
    [...el.querySelectorAll('tfoot td')].map((td) => td.textContent?.trim());

  async function type(selector: string, value: string): Promise<void> {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CdkTableDemo] }).compileComponents();
    fixture = TestBed.createComponent(CdkTableDemo);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('shows the first page of the fleet', () => {
    expect(el.querySelectorAll('tbody tr')).toHaveLength(25);
    expect(el.textContent).toContain(`of ${FLEET.length}`);
  });

  it('renders a status badge rather than the raw value', () => {
    expect(el.querySelector('app-status-badge')).toBeTruthy();
  });

  it('totals the rows on show', () => {
    expect(footerValues()?.[0]).toBe('25 shown');
    expect(footerValues()?.[1]).toBe('');
  });

  it('retotals as the search narrows the page', async () => {
    await type('input[type="search"]', 'gateway');

    const shown = el.querySelectorAll('tbody tr').length;
    expect(shown).toBeGreaterThan(0);
    expect(footerValues()?.[0]).toBe(`${shown} shown`);
  });
});
