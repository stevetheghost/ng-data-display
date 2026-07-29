import { NgTemplateOutlet } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  TemplateRef,
  TrackByFunction,
  computed,
  contentChildren,
  inject,
  input,
  model,
} from '@angular/core';
import { CellTemplate } from '../data-table/cell-template';
import { MultiSelectFilter } from '../data-table/multi-select-filter';
import { Paginator } from '../data-table/paginator';
import {
  Column,
  DEFAULT_PAGE_SIZE,
  TableMode,
  TableQuery,
  applyQuery,
  cellText,
  clampPageIndex,
  emptyQuery,
  filterOptionsFor,
} from '../data-table/table-query';

export type {
  Column,
  SortDirection,
  TableMode,
  TableQuery,
  TablePage,
} from '../data-table/table-query';
export { DEFAULT_PAGE_SIZE, emptyQuery } from '../data-table/table-query';

let nextId = 0;

/** Shared empty list, so an unfiltered column returns a stable reference. */
const EMPTY: readonly string[] = [];

/** Column-def name for a column's filter cell, which lives in its own header row. */
const FILTER_PREFIX = 'filter_';

export interface CdkColumn<T> extends Column<T> {
  /**
   * Summary for the footer row, over the rows currently rendered — the page in
   * view, not the whole result set. A footer row appears as soon as any column
   * defines one; the rest stay blank.
   */
  readonly footer?: (rows: readonly T[]) => string;
}

/**
 * Sortable, filterable, paged table built on `@angular/cdk/table`.
 *
 * Same inputs and same `query` contract as `DataTable`, so the two are drop-in
 * swaps; what differs is who assembles the rows. Here each column contributes a
 * `cdkColumnDef` holding its header, cell and footer templates, and the row defs
 * name the columns they want — so the header, the filter row, the body and the
 * footer all read their cells from one definition instead of repeating the
 * column loop four times. That structure is what buys the extras the
 * hand-rolled table has no cheap way to get: sticky headers, a pinned totals
 * row, and CDK's own empty-state row.
 *
 * ```html
 * <app-cdk-data-table [rows]="all()" [columns]="columns" caption="…" />
 * ```
 */
@Component({
  selector: 'app-cdk-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkTableModule, NgTemplateOutlet, MultiSelectFilter, Paginator],
  templateUrl: './cdk-data-table.html',
})
export class CdkDataTable<T extends { id: string }> {
  /** Every row in `client` mode; the current page in `server` mode. */
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly CdkColumn<T>[]>();
  /** Screen-reader description of the table. */
  readonly caption = input.required<string>();
  readonly emptyMessage = input('No rows match the current filters.');

  readonly mode = input<TableMode>('client');
  /** Rows matching the query across every page. Server mode only; derived otherwise. */
  readonly total = input<number | null>(null);
  /** Server mode only: dims the body and blocks paging while a fetch is in flight. */
  readonly loading = input(false);

  readonly searchable = input(true);
  readonly searchLabel = input('Search table');
  readonly searchPlaceholder = input('Search…');
  readonly pageSizeOptions = input<readonly number[]>([10, 25, 50]);
  /**
   * Delay before a keystroke reaches `query`. Only applied in server mode, where
   * every change costs a request; client-side filtering stays instant.
   */
  readonly searchDebounceMs = input(250);

  /** Header rows stay put while the body scrolls under them. */
  readonly stickyHeader = input(true);
  /** Keeps the totals in view, on the tables that have them. */
  readonly stickyFooter = input(true);
  /**
   * Height at which the body starts scrolling, as a CSS length. Sticky headers
   * need a scroll container to stick to, so `stickyHeader` does nothing without
   * one; pass an empty string to let the table run as long as its rows. A column
   * filter list opens inside that container, so keep it taller than the list.
   */
  readonly maxHeight = input('32rem');

  /** The table drives this; bind it two-way to fetch pages yourself. */
  readonly query = model<TableQuery>(emptyQuery(DEFAULT_PAGE_SIZE));

  private readonly cellTemplates = contentChildren<CellTemplate<T>>(CellTemplate);

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected readonly searchId = `cdk-table-search-${nextId++}`;

  private readonly clientPage = computed(() =>
    applyQuery(this.rows(), this.query(), this.columns()),
  );

  protected readonly isServer = computed(() => this.mode() === 'server');

  protected readonly visibleRows = computed(() =>
    this.isServer() ? this.rows() : this.clientPage().rows,
  );

  protected readonly totalRows = computed(() =>
    this.isServer() ? (this.total() ?? this.rows().length) : this.clientPage().total,
  );

  protected readonly pageIndex = computed(() =>
    clampPageIndex(this.query().pageIndex, this.totalRows(), this.query().pageSize),
  );

  /** The column names each row def renders, in order. */
  protected readonly columnKeys = computed(() => this.columns().map((column) => column.key));

  protected readonly filterColumnKeys = computed(() =>
    this.columns().map((column) => FILTER_PREFIX + column.key),
  );

  protected readonly hasColumnFilters = computed(() =>
    this.columns().some((column) => column.filter),
  );

  protected readonly hasFooter = computed(() => this.columns().some((column) => column.footer));

  protected readonly paged = computed(() => this.query().pageSize > 0);

  /** CDK renders rows itself, so identity has to come from us rather than a `track`. */
  protected readonly trackById: TrackByFunction<T> = (_index, row) => row.id;

  protected filterKey(column: CdkColumn<T>): string {
    return FILTER_PREFIX + column.key;
  }

  protected optionsFor(column: CdkColumn<T>): readonly string[] {
    return filterOptionsFor(this.rows(), column);
  }

  /** Single-value view of a filter, for the `text` and `select` controls. */
  protected filterValue(column: CdkColumn<T>): string {
    return this.filterValues(column)[0] ?? '';
  }

  protected filterValues(column: CdkColumn<T>): readonly string[] {
    return this.query().columnFilters[column.key] ?? EMPTY;
  }

  protected filterLabel(column: CdkColumn<T>): string {
    return `Filter by ${column.header}`;
  }

  protected ariaSort(column: CdkColumn<T>): 'ascending' | 'descending' | 'none' {
    if (this.query().sortKey !== column.key) return 'none';
    return this.query().sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIndicator(column: CdkColumn<T>): string {
    if (this.query().sortKey !== column.key) return '↕';
    return this.query().sortDirection === 'asc' ? '▲' : '▼';
  }

  protected templateFor(column: CdkColumn<T>): TemplateRef<{ $implicit: T }> | null {
    return this.cellTemplates().find((t) => t.appCellTemplate() === column.key)?.templateRef ?? null;
  }

  protected cell(row: T, column: CdkColumn<T>): string {
    return cellText(row, column);
  }

  protected footerText(column: CdkColumn<T>): string {
    return column.footer ? column.footer(this.visibleRows()) : '';
  }

  protected isSortable(column: CdkColumn<T>): boolean {
    return column.sortable !== false;
  }

  /**
   * Cycles the column through ascending, descending, then off — so the third
   * click puts the rows back in source order, which nothing else offers once a
   * sort has been applied.
   */
  protected toggleSort(column: CdkColumn<T>): void {
    if (!this.isSortable(column)) return;

    this.query.update((q) => {
      const repeat = q.sortKey === column.key;
      if (repeat && q.sortDirection === 'desc') {
        return { ...q, sortKey: null, sortDirection: 'asc', pageIndex: 0 };
      }

      return {
        ...q,
        sortKey: column.key,
        sortDirection: repeat ? 'desc' : 'asc',
        pageIndex: 0,
      };
    });
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimer);

    const delay = this.isServer() ? this.searchDebounceMs() : 0;
    if (delay <= 0) {
      this.setSearch(value);
      return;
    }
    this.searchTimer = setTimeout(() => this.setSearch(value), delay);
  }

  protected onColumnFilter(column: CdkColumn<T>, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.setColumnFilter(column, value ? [value] : []);
  }

  protected setColumnFilter(column: CdkColumn<T>, values: readonly string[]): void {
    this.query.update((q) => ({
      ...q,
      columnFilters: { ...q.columnFilters, [column.key]: values },
      pageIndex: 0,
    }));
  }

  protected setPageIndex(pageIndex: number): void {
    this.query.update((q) => ({ ...q, pageIndex }));
  }

  protected setPageSize(pageSize: number): void {
    this.query.update((q) => ({ ...q, pageSize, pageIndex: 0 }));
  }

  private setSearch(search: string): void {
    this.query.update((q) => ({ ...q, search, pageIndex: 0 }));
  }
}
