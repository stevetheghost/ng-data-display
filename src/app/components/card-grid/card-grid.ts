import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ServiceMetric } from '../../models/service-metric.model';
import { StatusBadge } from '../status-badge/status-badge';

/**
 * Responsive card view of the same rows the table shows — the layout people
 * reach for on narrow screens or when scanning rather than comparing.
 */
@Component({
  selector: 'app-card-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadge],
  templateUrl: './card-grid.html',
})
export class CardGrid {
  readonly services = input.required<readonly ServiceMetric[]>();
  /** Labels the list for assistive tech. */
  readonly label = input.required<string>();

  protected requests(value: number): string {
    return value.toLocaleString('en-US');
  }

  protected latency(value: number): string {
    return `${value.toLocaleString('en-US')} ms`;
  }

  protected errorRate(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }
}
