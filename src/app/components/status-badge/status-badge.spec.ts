import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceStatus } from '../../models/service-metric.model';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  let fixture: ComponentFixture<StatusBadge>;

  async function render(status: ServiceStatus): Promise<HTMLElement> {
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatusBadge] }).compileComponents();
    fixture = TestBed.createComponent(StatusBadge);
  });

  it.each<[ServiceStatus, string]>([
    ['healthy', 'Healthy'],
    ['degraded', 'Degraded'],
    ['offline', 'Offline'],
  ])('labels %s in text', async (status, label) => {
    const el = await render(status);

    expect(el.textContent?.trim()).toBe(label);
  });

  it('hides the colour dot from assistive tech', async () => {
    const el = await render('degraded');

    expect(el.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});
