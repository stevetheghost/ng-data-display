import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  TemplateRef,
  computed,
  contentChildren,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { CellTemplate } from './cell-template';
import { MultiSelectFilter } from './multi-select-filter';
import { Paginator } from './paginator';
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
} from './table-query';

export type { Column, SortDirection, TableMode, TableQuery, TablePage } from './table-query';
export { DEFAULT_PAGE_SIZE, emptyQuery } from './table-query';

let nextId = 0;

/** Shared empty list, so an unfiltered column returns a stable reference. */
const EMPTY: readonly string[] = [];

/**
 * Sortable, filterable, paged table over a list of rows and a column config.
 *
 * The same component drives both modes. Client-side (the default) it takes every
 * row and applies `query` itself; server-side it takes one page plus `total` and
 * treats `query` purely as an output, leaving the fetch to the caller. Because
 * both paths run the same filter/sort/page order, switching modes does not
 * change what page 2 contains.
 *
 * ```html
 * <!-- client -->
 * <app-data-table [rows]="all()" [columns]="columns" caption="…" />
 *
 * <!-- server -->
 * <app-data-table
 *   mode="server"
 *   [rows]="page().rows"
 *   [total]="page().total"
 *   [loading]="resource.isLoading()"
 *   [(query)]="query"
 *   [columns]="columns"
 *   caption="…"
 * />
 * ```
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, MultiSelectFilter, Paginator],
  templateUrl: './data-table.html',
})
export class DataTable<T extends { id: string }> {
  /** Every row in `client` mode; the current page in `server` mode. */
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly Column<T>[]>();
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

  /** The table drives this; bind it two-way to fetch pages yourself. */
  readonly query = model<TableQuery>(emptyQuery(DEFAULT_PAGE_SIZE));

  private readonly cellTemplates = contentChildren<CellTemplate<T>>(CellTemplate);

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected readonly searchId = `table-search-${nextId++}`;

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

  protected readonly hasColumnFilters = computed(() =>
    this.columns().some((column) => column.filter),
  );

  private readonly openFilters = signal<ReadonlySet<string>>(new Set());

  /**
   * The body scrolls horizontally, which also clips anything overflowing it — so
   * an open filter list would be cut off. Dropping the clip while one is open is
   * enough, since the list closes before the user can scroll again.
   */
  protected readonly anyFilterOpen = computed(() => this.openFilters().size > 0);

  protected onFilterOpen(column: Column<T>, open: boolean): void {
    this.openFilters.update((keys) => {
      const next = new Set(keys);
      if (open) next.add(column.key);
      else next.delete(column.key);
      return next;
    });
  }

  protected readonly paged = computed(() => this.query().pageSize > 0);

  protected optionsFor(column: Column<T>): readonly string[] {
    return filterOptionsFor(this.rows(), column);
  }

  /** Single-value view of a filter, for the `text` and `select` controls. */
  protected filterValue(column: Column<T>): string {
    return this.filterValues(column)[0] ?? '';
  }

  protected filterValues(column: Column<T>): readonly string[] {
    return this.query().columnFilters[column.key] ?? EMPTY;
  }

  protected filterLabel(column: Column<T>): string {
    return `Filter by ${column.header}`;
  }

  protected ariaSort(column: Column<T>): 'ascending' | 'descending' | 'none' {
    if (this.query().sortKey !== column.key) return 'none';
    return this.query().sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIndicator(column: Column<T>): string {
    if (this.query().sortKey !== column.key) return '↕';
    return this.query().sortDirection === 'asc' ? '▲' : '▼';
  }

  protected templateFor(column: Column<T>): TemplateRef<{ $implicit: T }> | null {
    return this.cellTemplates().find((t) => t.appCellTemplate() === column.key)?.templateRef ?? null;
  }

  protected cell(row: T, column: Column<T>): string {
    return cellText(row, column);
  }

  protected isSortable(column: Column<T>): boolean {
    return column.sortable !== false;
  }

  protected toggleSort(column: Column<T>): void {
    if (!this.isSortable(column)) return;

    this.query.update((q) => {
      const repeat = q.sortKey === column.key;
      return {
        ...q,
        sortKey: column.key,
        sortDirection: repeat && q.sortDirection === 'asc' ? 'desc' : 'asc',
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

  protected onColumnFilter(column: Column<T>, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.setColumnFilter(column, value ? [value] : []);
  }

  protected setColumnFilter(column: Column<T>, values: readonly string[]): void {
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
