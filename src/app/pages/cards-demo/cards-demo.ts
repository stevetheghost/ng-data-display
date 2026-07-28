import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CardGrid } from '../../components/card-grid/card-grid';
import { Metrics } from '../../data/metrics';
import { ServiceStatus } from '../../models/service-metric.model';

type StatusFilter = ServiceStatus | 'all';

const FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'degraded', label: 'Degraded' },
  { value: 'offline', label: 'Offline' },
];

@Component({
  selector: 'app-cards-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardGrid],
  templateUrl: './cards-demo.html',
})
export class CardsDemo {
  private readonly metrics = inject(Metrics);

  protected readonly filters = FILTERS;
  protected readonly active = signal<StatusFilter>('all');

  protected readonly services = computed(() => {
    const active = this.active();
    return this.metrics.services().filter((s) => active === 'all' || s.status === active);
  });

  protected select(value: StatusFilter): void {
    this.active.set(value);
  }
}
