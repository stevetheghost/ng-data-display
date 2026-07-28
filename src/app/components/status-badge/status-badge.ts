import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ServiceStatus } from '../../models/service-metric.model';

const STYLES: Record<ServiceStatus, { label: string; classes: string; dot: string }> = {
  healthy: {
    label: 'Healthy',
    classes: 'bg-emerald-50 text-emerald-900 ring-emerald-600/30',
    dot: 'bg-emerald-600',
  },
  degraded: {
    label: 'Degraded',
    classes: 'bg-amber-50 text-amber-900 ring-amber-600/30',
    dot: 'bg-amber-600',
  },
  offline: {
    label: 'Offline',
    classes: 'bg-rose-50 text-rose-900 ring-rose-600/30',
    dot: 'bg-rose-700',
  },
};

/**
 * Status pill. Colour is decorative only — the label carries the meaning, so the
 * badge stays legible without colour perception.
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset"
      [class]="style().classes"
    >
      <span class="size-1.5 rounded-full" [class]="style().dot" aria-hidden="true"></span>
      {{ style().label }}
    </span>
  `,
})
export class StatusBadge {
  readonly status = input.required<ServiceStatus>();

  protected readonly style = computed(() => STYLES[this.status()]);
}
