import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { StatTile } from '../../components/stat-tile/stat-tile';
import { Metrics } from '../../data/metrics';

@Component({
  selector: 'app-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatTile],
  templateUrl: './overview.html',
})
export class Overview {
  private readonly metrics = inject(Metrics);

  protected readonly stats = this.metrics.headline;
}
