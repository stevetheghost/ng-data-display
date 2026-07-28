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
} from '@angular/core';
import { CellTemplate } from '../data-table/cell-template';
import { MultiSelectFilter } from '../data-table/multi-select-filter';
import { Paginator } from '../data-table/paginator';
import {
  Column,
  DEFAULT_PAGE_SIZE,
  SortDirection,
  TableMode,
  TableQuery,
  applyQuery,
  cellText,
  clampPageIndex,
  emptyQuery,
  filterOptionsFor,
} from '../data-table/table-query';

export type { SortDirection, TableMode, TableQuery, TablePage } from '../data-table/table-query';
export { DEFAULT_PAGE_SIZE, emptyQuery } from '../data-table/table-query';

let nextId = 0;

/** Shared empty list, so an unfiltered field returns a stable reference. */
const EMPTY: readonly string[] = [];

/** Where a field renders inside a row. */
export type ListSlot = 'lead' | 'title' | 'meta' | 'detail';

/**
 * A field of the row, and where it goes.
 *
 * Everything `DataTable` needs from a column applies here too — the query engine
 * is shared — so this is `Column` plus the one thing a list has and a table does
 * not: no header row to put a value under, hence `slot`.
 */
export interface ListField<T> extends Column<T> {
  /**
   * `lead` sits at the start of the row, `title` and `meta` stack in the middle,
   * `detail` is a labelled value at the end. Defaults to `detail`.
   */
  readonly slot?: ListSlot;
}

/**
 * Sortable, filterable, paged list over a set of rows and a field config.
 *
 * The row-shaped counterpart to `DataTable`: same `TableQuery`, same two modes,
 * same filter/sort/page order, so a page holds the same rows either way. What
 * differs is the chrome — with no header row to hang controls off, sorting moves
 * to a select beside the search box and filters sit in the toolbar above.
 *
 * ```html
 * <!-- client -->
 * <app-data-list [rows]="all()" [fields]="fields" label="…" />
 *
 * <!-- server -->
 * <app-data-list
 *   mode="server"
 *   [rows]="page().rows"
 *   [total]="page().total"
 *   [loading]="resource.isLoading()"
 *   [(query)]="query"
 *   [fields]="fields"
 *   label="…"
 * />
 * ```
 */
@Component({
  selector: 'app-data-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, MultiSelectFilter, Paginator],
  templateUrl: './data-list.html',
})
export class DataList<T extends { id: string }> {
  /** Every row in `client` mode; the current page in `server` mode. */
  readonly rows = input.required<readonly T[]>();
  readonly fields = input.required<readonly ListField<T>[]>();
  /** Names the list for assistive tech. */
  readonly label = input.required<string>();
  readonly emptyMessage = input('No items match the current filters.');

  readonly mode = input<TableMode>('client');
  /** Rows matching the query across every page. Server mode only; derived otherwise. */
  readonly total = input<number | null>(null);
  /** Server mode only: dims the rows and blocks paging while a fetch is in flight. */
  readonly loading = input(false);

  readonly searchable = input(true);
  readonly searchLabel = input('Search list');
  readonly searchPlaceholder = input('Search…');
  readonly sortLabel = input('Sort by');
  readonly pageSizeOptions = input<readonly number[]>([10, 25, 50]);
  /**
   * Delay before a keystroke reaches `query`. Only applied in server mode, where
   * every change costs a request; client-side filtering stays instant.
   */
  readonly searchDebounceMs = input(250);

  /** The list drives this; bind it two-way to fetch pages yourself. */
  readonly query = model<TableQuery>(emptyQuery(DEFAULT_PAGE_SIZE));

  private readonly cellTemplates = contentChildren<CellTemplate<T>>(CellTemplate);

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  protected readonly searchId = `list-search-${nextId}`;
  protected readonly sortId = `list-sort-${nextId++}`;

  private readonly clientPage = computed(() =>
    applyQuery(this.rows(), this.query(), this.fields()),
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

  protected readonly paged = computed(() => this.query().pageSize > 0);

  private readonly inSlot = (slot: ListSlot) =>
    computed(() => this.fields().filter((field) => (field.slot ?? 'detail') === slot));

  protected readonly leadFields = this.inSlot('lead');
  protected readonly titleFields = this.inSlot('title');
  protected readonly metaFields = this.inSlot('meta');
  protected readonly detailFields = this.inSlot('detail');

  protected readonly filterFields = computed(() => this.fields().filter((field) => field.filter));

  protected readonly sortFields = computed(() =>
    this.fields().filter((field) => field.sortable !== false),
  );

  protected readonly ascending = computed(() => this.query().sortDirection === 'asc');

  /** Spelled out rather than shown as an arrow, since the arrow is decorative. */
  protected readonly directionLabel = computed(() =>
    this.ascending() ? 'Sorted ascending. Sort descending' : 'Sorted descending. Sort ascending',
  );

  protected optionsFor(field: ListField<T>): readonly string[] {
    return filterOptionsFor(this.rows(), field);
  }

  /** Single-value view of a filter, for the `text` and `select` controls. */
  protected filterValue(field: ListField<T>): string {
    return this.filterValues(field)[0] ?? '';
  }

  protected filterValues(field: ListField<T>): readonly string[] {
    return this.query().columnFilters[field.key] ?? EMPTY;
  }

  protected filterLabel(field: ListField<T>): string {
    return `Filter by ${field.header}`;
  }

  protected templateFor(field: ListField<T>): TemplateRef<{ $implicit: T }> | null {
    return this.cellTemplates().find((t) => t.appCellTemplate() === field.key)?.templateRef ?? null;
  }

  protected value(row: T, field: ListField<T>): string {
    return cellText(row, field);
  }

  protected onSortKey(event: Event): void {
    const key = (event.target as HTMLSelectElement).value;
    this.query.update((q) => ({
      ...q,
      sortKey: key || null,
      // A fresh key starts ascending; re-picking the current one leaves it alone.
      sortDirection: key && key !== q.sortKey ? 'asc' : q.sortDirection,
      pageIndex: 0,
    }));
  }

  protected setDirection(direction: SortDirection): void {
    if (direction === this.query().sortDirection) return;
    this.query.update((q) => ({ ...q, sortDirection: direction, pageIndex: 0 }));
  }

  protected toggleDirection(): void {
    this.setDirection(this.ascending() ? 'desc' : 'asc');
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

  protected onFieldFilter(field: ListField<T>, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.setFieldFilter(field, value ? [value] : []);
  }

  protected setFieldFilter(field: ListField<T>, values: readonly string[]): void {
    this.query.update((q) => ({
      ...q,
      columnFilters: { ...q.columnFilters, [field.key]: values },
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
