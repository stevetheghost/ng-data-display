import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { CellTemplate } from '../../components/data-table/cell-template';
import {
  Column,
  DataTable,
  TableMode,
  TableQuery,
  emptyQuery,
} from '../../components/data-table/data-table';
import { StatusBadge } from '../../components/status-badge/status-badge';
import { Fleet } from '../../data/fleet';
import { FleetApi, toFleetRequest } from '../../data/fleet-api';
import { ServiceMetric } from '../../models/service-metric.model';

const MODES: readonly { value: TableMode; label: string; hint: string }[] = [
  {
    value: 'client',
    label: 'Client-side',
    hint: 'The table holds all 60 rows and slices them itself.',
  },
  {
    value: 'server',
    label: 'Server-side',
    hint: 'Each change refetches one page from a simulated endpoint.',
  },
];

@Component({
  selector: 'app-table-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTable, CellTemplate, StatusBadge],
  templateUrl: './table-demo.html',
})
export class TableDemo {
  private readonly fleet = inject(Fleet);
  private readonly api = inject(FleetApi);

  protected readonly modes = MODES;
  protected readonly mode = signal<TableMode>('client');
  protected readonly query = signal<TableQuery>(emptyQuery());

  /** Select options come from the whole fleet: server mode only ever sees one page. */
  protected readonly columns = computed<readonly Column<ServiceMetric>[]>(() => [
    { key: 'name', header: 'Service', filter: 'text' },
    { key: 'region', header: 'Region', filter: 'select', filterOptions: this.fleet.regions() },
    { key: 'status', header: 'Status', filter: 'select', filterOptions: this.fleet.statuses() },
    {
      key: 'requests',
      header: 'Requests (1h)',
      align: 'end',
      searchable: false,
      format: (row) => row.requests.toLocaleString('en-US'),
    },
    {
      key: 'latencyMs',
      header: 'p95 latency',
      align: 'end',
      searchable: false,
      format: (row) => `${row.latencyMs.toLocaleString('en-US')} ms`,
    },
    {
      key: 'errorRate',
      header: 'Error rate',
      align: 'end',
      searchable: false,
      format: (row) => `${(row.errorRate * 100).toFixed(2)}%`,
    },
  ]);

  private readonly page = resource({
    // Idle in client mode: no params means the loader never runs.
    params: () => (this.mode() === 'server' ? toFleetRequest(this.query()) : undefined),
    loader: ({ params, abortSignal }) => this.api.page(params, abortSignal),
  });

  protected readonly isServer = computed(() => this.mode() === 'server');

  protected readonly rows = computed(() =>
    this.isServer() ? (this.page.value()?.rows ?? []) : this.fleet.services(),
  );

  /** Null client-side, where the table counts its own matches. */
  protected readonly total = computed(() =>
    this.isServer() ? (this.page.value()?.total ?? 0) : null,
  );

  protected readonly loading = computed(() => this.isServer() && this.page.isLoading());

  protected readonly error = computed(() => (this.isServer() ? this.page.error() : undefined));

  protected setMode(mode: TableMode): void {
    if (mode === this.mode()) return;

    this.mode.set(mode);
    // Both modes start from the same place, so the comparison is like for like.
    this.query.set(emptyQuery(this.query().pageSize));
  }
}
