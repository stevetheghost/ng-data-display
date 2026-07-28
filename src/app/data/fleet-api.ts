import { Injectable, inject, signal } from '@angular/core';
import { SortDirection, TablePage, TableQuery } from '../components/data-table/table-query';
import { ServiceMetric } from '../models/service-metric.model';
import { Fleet } from './fleet';

/**
 * What the endpoint accepts. Deliberately not `TableQuery` — a real service has
 * its own contract, and the page adapts between the two.
 */
export interface FleetRequest {
  readonly search: string;
  /** Substring match on the service name. */
  readonly name: string;
  /** Accepted regions. Empty means every region. */
  readonly regions: readonly string[];
  /** Accepted statuses. Empty means every status. */
  readonly statuses: readonly string[];
  readonly sortKey: string | null;
  readonly sortDirection: SortDirection;
  readonly pageIndex: number;
  readonly pageSize: number;
}

/** Maps the table's query onto the endpoint's parameters. */
export function toFleetRequest(query: TableQuery): FleetRequest {
  return {
    search: query.search.trim(),
    name: query.columnFilters['name']?.[0] ?? '',
    regions: query.columnFilters['region'] ?? [],
    statuses: query.columnFilters['status'] ?? [],
    sortKey: query.sortKey,
    sortDirection: query.sortDirection,
    pageIndex: query.pageIndex,
    pageSize: query.pageSize,
  };
}

/**
 * Stands in for a paged HTTP endpoint. It filters, sorts and slices in the same
 * order the client-side pipeline does, so the demo's two modes agree on what any
 * given page holds — and it honours `AbortSignal`, so superseded keystrokes drop.
 */
@Injectable({ providedIn: 'root' })
export class FleetApi {
  private readonly fleet = inject(Fleet);

  /** Simulated round trip. Tests set this to zero. */
  readonly latencyMs = signal(400);

  async page(request: FleetRequest, abortSignal?: AbortSignal): Promise<TablePage<ServiceMetric>> {
    await sleep(this.latencyMs(), abortSignal);

    const search = request.search.toLowerCase();
    const name = request.name.toLowerCase();
    const matched = this.fleet
      .services()
      .filter((s) => !name || s.name.toLowerCase().includes(name))
      .filter((s) => !request.regions.length || request.regions.includes(s.region))
      .filter((s) => !request.statuses.length || request.statuses.includes(s.status))
      .filter(
        (s) =>
          !search ||
          s.name.toLowerCase().includes(search) ||
          s.region.toLowerCase().includes(search) ||
          s.status.toLowerCase().includes(search),
      );

    const sorted = sort(matched, request.sortKey, request.sortDirection);
    const start = request.pageSize > 0 ? request.pageIndex * request.pageSize : 0;
    const rows = request.pageSize > 0 ? sorted.slice(start, start + request.pageSize) : sorted;

    return { rows, total: sorted.length };
  }
}

function sort(
  rows: readonly ServiceMetric[],
  key: string | null,
  direction: SortDirection,
): readonly ServiceMetric[] {
  if (!key) return rows;

  const factor = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = a[key as keyof ServiceMetric];
    const right = b[key as keyof ServiceMetric];
    if (typeof left === 'number' && typeof right === 'number') return factor * (left - right);
    return factor * String(left).localeCompare(String(right));
  });
}

function sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(abortSignal.reason);
      return;
    }

    const timer = setTimeout(resolve, ms);
    abortSignal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(abortSignal.reason);
      },
      { once: true },
    );
  });
}
