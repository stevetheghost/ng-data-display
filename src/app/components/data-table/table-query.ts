export type SortDirection = 'asc' | 'desc';

/**
 * Who applies the query.
 *
 * `client` — the table receives every row and does the work itself.
 * `server` — the table receives one page and reports the query it wants filled.
 */
export type TableMode = 'client' | 'server';

export interface Column<T> {
  /** Property read for sorting, and for the default cell text. */
  readonly key: keyof T & string;
  readonly header: string;
  readonly align?: 'start' | 'end';
  /** Sortable unless explicitly disabled. */
  readonly sortable?: boolean;
  /** Overrides the displayed text. The raw value is still used for sorting. */
  readonly format?: (row: T) => string;
  /** Renders a per-column filter control beneath the header. */
  readonly filter?: 'text' | 'select';
  /**
   * Choices for `filter: 'select'`. Derived from the rows when omitted, which
   * only works client-side — a server-driven table sees one page, so it must
   * pass the full list.
   */
  readonly filterOptions?: readonly string[];
  /** Excluded from the global search when false. */
  readonly searchable?: boolean;
}

/** Everything the table knows about what it wants to show. */
export interface TableQuery {
  /** Global search, matched against every searchable column. */
  readonly search: string;
  /** Per-column filter values, keyed by column key. Empty string means inactive. */
  readonly columnFilters: Readonly<Record<string, string>>;
  readonly sortKey: string | null;
  readonly sortDirection: SortDirection;
  readonly pageIndex: number;
  /** Rows per page. Zero or less disables paging. */
  readonly pageSize: number;
}

/** One page of rows, plus the size of the full match so paging can be sized. */
export interface TablePage<T> {
  readonly rows: readonly T[];
  readonly total: number;
}

export const DEFAULT_PAGE_SIZE = 10;

export function emptyQuery(pageSize = DEFAULT_PAGE_SIZE): TableQuery {
  return {
    search: '',
    columnFilters: {},
    sortKey: null,
    sortDirection: 'asc',
    pageIndex: 0,
    pageSize,
  };
}

/** The text a cell renders — what filtering matches against. */
export function cellText<T>(row: T, column: Column<T>): string {
  return column.format ? column.format(row) : String(row[column.key] ?? '');
}

export function pageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Keeps the index inside the range a shrinking result set still has. */
export function clampPageIndex(pageIndex: number, total: number, pageSize: number): number {
  return Math.min(Math.max(0, pageIndex), pageCount(total, pageSize) - 1);
}

export function filterRows<T>(
  rows: readonly T[],
  query: TableQuery,
  columns: readonly Column<T>[],
): readonly T[] {
  const search = query.search.trim().toLowerCase();
  const active = Object.entries(query.columnFilters).filter(([, value]) => value !== '');
  if (!search && active.length === 0) return rows;

  const byKey = new Map(columns.map((column) => [column.key as string, column]));

  return rows.filter((row) => {
    for (const [key, value] of active) {
      const column = byKey.get(key);
      if (!column) continue;

      const cell = cellText(row, column).toLowerCase();
      const needle = value.toLowerCase();
      // A select offers whole values, so anything but an exact hit is a mis-click.
      const hit = column.filter === 'select' ? cell === needle : cell.includes(needle);
      if (!hit) return false;
    }

    if (!search) return true;
    return columns.some(
      (column) =>
        column.searchable !== false && cellText(row, column).toLowerCase().includes(search),
    );
  });
}

export function sortRows<T>(rows: readonly T[], query: TableQuery): readonly T[] {
  const key = query.sortKey;
  if (!key) return rows;

  const factor = query.sortDirection === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => factor * compare(a[key as keyof T], b[key as keyof T]));
}

export function pageRows<T>(rows: readonly T[], query: TableQuery): readonly T[] {
  if (query.pageSize <= 0) return rows;

  const index = clampPageIndex(query.pageIndex, rows.length, query.pageSize);
  const start = index * query.pageSize;
  return rows.slice(start, start + query.pageSize);
}

/**
 * Filter, then sort, then page — the order a server would use, so the two modes
 * agree on what page 2 contains.
 */
export function applyQuery<T>(
  rows: readonly T[],
  query: TableQuery,
  columns: readonly Column<T>[],
): TablePage<T> {
  const matched = sortRows(filterRows(rows, query, columns), query);
  return { rows: pageRows(matched, query), total: matched.length };
}

/** Distinct cell values for a select filter, in display order. */
export function filterOptionsFor<T>(
  rows: readonly T[],
  column: Column<T>,
): readonly string[] {
  if (column.filterOptions) return column.filterOptions;
  return [...new Set(rows.map((row) => cellText(row, column)).filter(Boolean))].sort();
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}
