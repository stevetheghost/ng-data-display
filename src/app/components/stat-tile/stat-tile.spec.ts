import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Stat } from '../../models/service-metric.model';
import { StatTile } from './stat-tile';

describe('StatTile', () => {
  let fixture: ComponentFixture<StatTile>;

  async function render(stat: Stat): Promise<HTMLElement> {
    fixture.componentRef.setInput('stat', stat);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatTile] }).compileComponents();
    fixture = TestBed.createComponent(StatTile);
  });

  it('renders the label and value', async () => {
    const el = await render({ label: 'Requests', value: '1.2M' });

    expect(el.textContent).toContain('Requests');
    expect(el.textContent).toContain('1.2M');
  });

  it('omits the delta line when no delta is given', async () => {
    const el = await render({ label: 'Offline', value: '1' });

    expect(el.textContent).not.toContain('vs last week');
  });

  it('treats a rising delta as good by default', async () => {
    const el = await render({ label: 'Requests', value: '1.2M', delta: 0.084 });

    expect(el.textContent).toContain('up 8.4%');
    expect(el.querySelector('.text-emerald-700')).toBeTruthy();
  });

  it('treats a rising delta as bad when lower is better', async () => {
    const el = await render({
      label: 'Latency',
      value: '42 ms',
      delta: 0.121,
      lowerIsBetter: true,
    });

    expect(el.textContent).toContain('up 12.1%');
    expect(el.querySelector('.text-rose-700')).toBeTruthy();
  });
});
