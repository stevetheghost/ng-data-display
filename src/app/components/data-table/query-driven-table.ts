import {
  DestroyRef,
  Directive,
  TemplateRef,
  computed,
  contentChildren,
  inject,
  input,
  model,
} from '@angular/core';
import { CellTemplate } from './cell-template';
import {
  Column,
  SortDirection,
  TableMode,
  TableQuery,
  applyQuery,
  cellText,
  clampPageIndex,
  emptyQuery,
  filterOptionsFor,
} from './table-query';

let nextId = 0;

/** Shared empty list, so an unfiltered column returns a stable reference. */
const EMPTY: readonly string[] = [];

/**
 * The query layer every table view shares: the input surface, the derived page,
 * and the handlers that move `query` along.
 *
 * `table-query.ts` holds the pure half of this — filter, sort, page as plain
 * functions. This is the reactive half, so that a table component only has to
 * supply markup. Subclasses add whatever their rendering strategy needs and
 * nothing else; both `DataTable` and `CdkDataTable` answer the same questions
 * about sort state and filters, and should keep answering them identically.
 *
 * Angular needs the `@Directive()` decorator here for the signal inputs, the
 * `model` and the content query to be wired up in subclasses.
 */
@Directive()
export abstract class QueryDrivenTable<T extends { id: string }, C extends Column<T> = Column<T>> {
  /** Every row in `client` mode; the current page in `server` mode. */
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly C[]>();
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
  readonly query = model<TableQuery>(emptyQuery());

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

  /** The columns carrying a filter control, for views that render them in a list. */
  protected readonly filterColumns = computed(() => this.columns().filter((c) => c.filter));

  protected readonly hasColumnFilters = computed(() => this.filterColumns().length > 0);

  protected readonly sortableColumns = computed(() =>
    this.columns().filter((c) => this.isSortable(c)),
  );

  protected readonly paged = computed(() => this.query().pageSize > 0);

  /**
   * Filter choices per column, derived once per row change rather than per call.
   * Templates ask for these on every change detection cycle, and deriving them
   * from the rows is an O(n log n) scan — but it also has to hand back the same
   * array each time, or the `OnPush` filter controls see a new `options` input
   * and re-render their whole list for nothing.
   */
  private readonly filterOptions = computed(() => {
    const rows = this.rows();
    const options = new Map<string, readonly string[]>();
    for (const column of this.columns()) {
      if (column.filter) options.set(column.key, filterOptionsFor(rows, column));
    }
    return options;
  });

  /** Projected cell templates by column key, so a lookup doesn't scan the list. */
  private readonly templatesByKey = computed(
    () => new Map(this.cellTemplates().map((t) => [t.appCellTemplate(), t.templateRef])),
  );

  protected optionsFor(column: C): readonly string[] {
    return this.filterOptions().get(column.key) ?? EMPTY;
  }

  /** Single-value view of a filter, for the `text` and `select` controls. */
  protected filterValue(column: C): string {
    return this.filterValues(column)[0] ?? '';
  }

  protected filterValues(column: C): readonly string[] {
    return this.query().columnFilters[column.key] ?? EMPTY;
  }

  protected filterLabel(column: C): string {
    return `Filter by ${column.header}`;
  }

  protected ariaSort(column: C): 'ascending' | 'descending' | 'none' {
    if (this.query().sortKey !== column.key) return 'none';
    return this.query().sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIndicator(column: C): string {
    if (this.query().sortKey !== column.key) return '↕';
    return this.query().sortDirection === 'asc' ? '▲' : '▼';
  }

  protected templateFor(column: C): TemplateRef<{ $implicit: T }> | null {
    return this.templatesByKey().get(column.key) ?? null;
  }

  protected cell(row: T, column: C): string {
    return cellText(row, column);
  }

  protected isSortable(column: C): boolean {
    return column.sortable !== false;
  }

  /**
   * The one way sort state changes, whatever control drove it. An unsorted list
   * has no direction to speak of, so clearing the key normalises the direction
   * too — otherwise two views showing the same rows would report different
   * queries, and a server would see a sort order for a sort nobody asked for.
   */
  protected setSort(sortKey: string | null, sortDirection: SortDirection): void {
    this.query.update((q) => ({
      ...q,
      sortKey,
      sortDirection: sortKey ? sortDirection : 'asc',
      pageIndex: 0,
    }));
  }

  /**
   * Cycles the column through ascending, descending, then off — so the third
   * click puts the rows back in source order, which nothing else offers once a
   * sort has been applied.
   */
  protected toggleSort(column: C): void {
    if (!this.isSortable(column)) return;

    const { sortKey, sortDirection } = this.query();
    const repeat = sortKey === column.key;

    if (repeat && sortDirection === 'desc') this.setSort(null, 'asc');
    else this.setSort(column.key, repeat ? 'desc' : 'asc');
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

  protected onColumnFilter(column: C, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.setColumnFilter(column, value ? [value] : []);
  }

  protected setColumnFilter(column: C, values: readonly string[]): void {
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
