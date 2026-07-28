import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Overview } from './overview';

describe('Overview', () => {
  let fixture: ComponentFixture<Overview>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Overview] }).compileComponents();
    fixture = TestBed.createComponent(Overview);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('renders one tile per headline stat', () => {
    expect(el.querySelectorAll('app-stat-tile').length).toBe(4);
  });

  it('shows the fleet totals', () => {
    expect(el.textContent).toContain('Requests (1h)');
    expect(el.textContent).toContain('Avg p95 latency');
    expect(el.textContent).toContain('Error rate');
    expect(el.textContent).toContain('Services offline');
  });

  it('starts the page with a single h1', () => {
    expect(el.querySelectorAll('h1').length).toBe(1);
  });
});
