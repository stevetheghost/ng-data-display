import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardsDemo } from './cards-demo';

describe('CardsDemo', () => {
  let fixture: ComponentFixture<CardsDemo>;
  let el: HTMLElement;

  const filterButton = (label: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

  const cards = () => el.querySelectorAll('app-card-grid li');

  async function clickFilter(label: string): Promise<void> {
    filterButton(label).click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CardsDemo] }).compileComponents();
    fixture = TestBed.createComponent(CardsDemo);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('shows every service under the default filter', () => {
    expect(cards().length).toBe(8);
  });

  it('narrows the grid to the selected status', async () => {
    await clickFilter('Offline');

    expect(cards().length).toBe(1);
    expect(el.textContent).toContain('Billing Worker');
  });

  it('tracks the active filter with aria-pressed', async () => {
    expect(filterButton('All').getAttribute('aria-pressed')).toBe('true');

    await clickFilter('Degraded');

    expect(filterButton('Degraded').getAttribute('aria-pressed')).toBe('true');
    expect(filterButton('All').getAttribute('aria-pressed')).toBe('false');
  });

  it('restores the full list when All is reselected', async () => {
    await clickFilter('Healthy');
    await clickFilter('All');

    expect(cards().length).toBe(8);
  });

  it('groups the filters with an accessible name', () => {
    expect(el.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Filter by status');
  });
});
