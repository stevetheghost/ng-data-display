import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ServiceStatus } from '../../models/service-metric.model';

const STYLES: Record<ServiceStatus, { label: string; badge: string }> = {
  healthy: { label: 'Healthy', badge: 'badge-success' },
  degraded: { label: 'Degraded', badge: 'badge-warning' },
  offline: { label: 'Offline', badge: 'badge-error' },
};

/**
 * Status pill. Colour is decorative only — the label carries the meaning, so the
 * badge stays legible without colour perception.
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge badge-sm gap-1.5 font-medium" [class]="style().badge">
      <!-- bg-current tracks the badge's own *-content colour, so the dot stays
           visible on every theme without a second colour to keep in sync. -->
      <span class="size-1.5 rounded-full bg-current opacity-80" aria-hidden="true"></span>
      {{ style().label }}
    </span>
  `,
})
export class StatusBadge {
  readonly status = input.required<ServiceStatus>();

  protected readonly style = computed(() => STYLES[this.status()]);
}
