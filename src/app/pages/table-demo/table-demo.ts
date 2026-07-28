import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CellTemplate } from '../../components/data-table/cell-template';
import { Column, DataTable } from '../../components/data-table/data-table';
import { StatusBadge } from '../../components/status-badge/status-badge';
import { Metrics } from '../../data/metrics';
import { ServiceMetric } from '../../models/service-metric.model';

const COLUMNS: readonly Column<ServiceMetric>[] = [
  { key: 'name', header: 'Service' },
  { key: 'region', header: 'Region' },
  { key: 'status', header: 'Status' },
  {
    key: 'requests',
    header: 'Requests (1h)',
    align: 'end',
    format: (row) => row.requests.toLocaleString('en-US'),
  },
  {
    key: 'latencyMs',
    header: 'p95 latency',
    align: 'end',
    format: (row) => `${row.latencyMs.toLocaleString('en-US')} ms`,
  },
  {
    key: 'errorRate',
    header: 'Error rate',
    align: 'end',
    format: (row) => `${(row.errorRate * 100).toFixed(2)}%`,
  },
];

@Component({
  selector: 'app-table-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DataTable, CellTemplate, StatusBadge],
  templateUrl: './table-demo.html',
})
export class TableDemo {
  private readonly metrics = inject(Metrics);

  protected readonly columns = COLUMNS;
  protected readonly regions = this.metrics.regions;

  protected readonly filters = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
    region: new FormControl('', { nonNullable: true }),
  });

  private readonly filterValue = toSignal(this.filters.valueChanges, {
    initialValue: this.filters.getRawValue(),
  });

  protected readonly rows = computed(() => {
    const { query = '', region = '' } = this.filterValue();
    const needle = query.trim().toLowerCase();

    return this.metrics
      .services()
      .filter((s) => !region || s.region === region)
      .filter((s) => !needle || s.name.toLowerCase().includes(needle));
  });

  protected readonly resultSummary = computed(() => {
    const shown = this.rows().length;
    const total = this.metrics.services().length;
    return `Showing ${shown} of ${total} services`;
  });
}
