import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  resource,
  signal,
} from '@angular/core';
import { CellTemplate } from '../../components/data-table/cell-template';
import {
  DataList,
  ListField,
  TableMode,
  TablePage,
  TableQuery,
  emptyQuery,
} from '../../components/data-list/data-list';
import { StatusBadge } from '../../components/status-badge/status-badge';
import { Fleet } from '../../data/fleet';
import { FleetApi, toFleetRequest } from '../../data/fleet-api';
import { ServiceMetric } from '../../models/service-metric.model';

const EMPTY_PAGE: TablePage<ServiceMetric> = { rows: [], total: 0 };

const MODES: readonly { value: TableMode; label: string; hint: string }[] = [
  {
    value: 'client',
    label: 'Client-side',
    hint: 'The list holds all 60 rows and slices them itself.',
  },
  {
    value: 'server',
    label: 'Server-side',
    hint: 'Each change refetches one page from a simulated endpoint.',
  },
];

@Component({
  selector: 'app-list-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataList, CellTemplate, StatusBadge],
  templateUrl: './list-demo.html',
})
export class ListDemo {
  private readonly fleet = inject(Fleet);
  private readonly api = inject(FleetApi);

  protected readonly modes = MODES;
  protected readonly mode = signal<TableMode>('client');
  protected readonly query = signal<TableQuery>(emptyQuery());

  /** Select options come from the whole fleet: server mode only ever sees one page. */
  protected readonly fields = computed<readonly ListField<ServiceMetric>[]>(() => [
    {
      key: 'status',
      header: 'Status',
      slot: 'lead',
      filter: 'select',
      filterOptions: this.fleet.statuses(),
    },
    { key: 'name', header: 'Service', slot: 'title', filter: 'text' },
    {
      key: 'region',
      header: 'Region',
      slot: 'meta',
      filter: 'multiselect',
      filterOptions: this.fleet.regions(),
    },
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

  /**
   * The last page the server returned. `resource.value()` is undefined while a
   * load is in flight, so reading it directly would empty the list on every
   * keystroke; holding the previous page lets it sit dimmed until the next lands.
   */
  private readonly loaded = linkedSignal<
    TablePage<ServiceMetric> | undefined,
    TablePage<ServiceMetric>
  >({
    source: () => this.page.value(),
    computation: (next, previous) => next ?? previous?.value ?? EMPTY_PAGE,
  });

  protected readonly isServer = computed(() => this.mode() === 'server');

  protected readonly rows = computed(() =>
    this.isServer() ? this.loaded().rows : this.fleet.services(),
  );

  /** Null client-side, where the list counts its own matches. */
  protected readonly total = computed(() => (this.isServer() ? this.loaded().total : null));

  protected readonly loading = computed(() => this.isServer() && this.page.isLoading());

  protected readonly error = computed(() => (this.isServer() ? this.page.error() : undefined));

  protected setMode(mode: TableMode): void {
    if (mode === this.mode()) return;

    this.mode.set(mode);
    // Both modes start from the same place, so the comparison is like for like.
    this.query.set(emptyQuery(this.query().pageSize));
  }
}
