import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  CdkColumn,
  CdkDataTable,
  TableQuery,
  emptyQuery,
} from '../../components/cdk-data-table/cdk-data-table';
import { CellTemplate } from '../../components/data-table/cell-template';
import { StatusBadge } from '../../components/status-badge/status-badge';
import { Fleet } from '../../data/fleet';
import { ServiceMetric } from '../../models/service-metric.model';

@Component({
  selector: 'app-cdk-table-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDataTable, CellTemplate, StatusBadge],
  templateUrl: './cdk-table-demo.html',
})
export class CdkTableDemo {
  private readonly fleet = inject(Fleet);

  protected readonly rows = this.fleet.services;
  protected readonly query = signal<TableQuery>(emptyQuery(25));

  /** Page-scoped footers: the table hands each one the rows it is rendering. */
  protected readonly columns = computed<readonly CdkColumn<ServiceMetric>[]>(() => [
    {
      key: 'name',
      header: 'Service',
      filter: 'text',
      footer: (rows) => `${rows.length} shown`,
    },
    {
      key: 'region',
      header: 'Region',
      filter: 'multiselect',
      filterOptions: this.fleet.regions(),
    },
    { key: 'status', header: 'Status', filter: 'select', filterOptions: this.fleet.statuses() },
    {
      key: 'requests',
      header: 'Requests (1h)',
      align: 'end',
      searchable: false,
      format: (row) => row.requests.toLocaleString('en-US'),
      footer: (rows) => sum(rows, (row) => row.requests).toLocaleString('en-US'),
    },
    {
      key: 'latencyMs',
      header: 'p95 latency',
      align: 'end',
      searchable: false,
      format: (row) => `${row.latencyMs.toLocaleString('en-US')} ms`,
      footer: (rows) =>
        `${Math.round(mean(rows, (row) => row.latencyMs)).toLocaleString('en-US')} ms avg`,
    },
    {
      key: 'errorRate',
      header: 'Error rate',
      align: 'end',
      searchable: false,
      format: (row) => `${(row.errorRate * 100).toFixed(2)}%`,
      footer: (rows) => `${(mean(rows, (row) => row.errorRate) * 100).toFixed(2)}% avg`,
    },
  ]);
}

function sum<T>(rows: readonly T[], value: (row: T) => number): number {
  return rows.reduce((total, row) => total + value(row), 0);
}

function mean<T>(rows: readonly T[], value: (row: T) => number): number {
  return rows.length === 0 ? 0 : sum(rows, value) / rows.length;
}
