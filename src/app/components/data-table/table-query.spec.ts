import {
  Column,
  TableQuery,
  applyQuery,
  clampPageIndex,
  emptyQuery,
  filterOptionsFor,
  filterRows,
  pageCount,
  pageRows,
  sortRows,
} from './table-query';

interface Row {
  id: string;
  name: string;
  region: string;
  tier: string;
  score: number;
}

const COLUMNS: readonly Column<Row>[] = [
  { key: 'name', header: 'Name', filter: 'text' },
  { key: 'region', header: 'Region', filter: 'select' },
  { key: 'score', header: 'Score', searchable: false, format: (row) => `${row.score} pts` },
];

const MULTI_COLUMNS: readonly Column<Row>[] = [
  { key: 'tier', header: 'Tier', filter: 'multiselect' },
  { key: 'region', header: 'Region', filter: 'select' },
];

const ROWS: readonly Row[] = [
  { id: 'a', name: 'Alpha', region: 'eu-west-1', tier: 'gold', score: 30 },
  { id: 'b', name: 'Beta', region: 'us-east-1', tier: 'bronze', score: 20 },
  { id: 'c', name: 'Gamma', region: 'eu-west-1', tier: 'silver', score: 100 },
  { id: 'd', name: 'Delta', region: 'us-east-1', tier: 'gold', score: 9 },
];

const query = (overrides: Partial<TableQuery> = {}): TableQuery => ({
  ...emptyQuery(),
  ...overrides,
});

const names = (rows: readonly Row[]) => rows.map((row) => row.name);

describe('filterRows', () => {
  it('returns the original array when nothing is active', () => {
    expect(filterRows(ROWS, query(), COLUMNS)).toBe(ROWS);
  });

  it('matches the global search against any searchable column', () => {
    expect(names(filterRows(ROWS, query({ search: 'us-east' }), COLUMNS))).toEqual([
      'Beta',
      'Delta',
    ]);
  });

  it('ignores case and surrounding whitespace in the search', () => {
    expect(names(filterRows(ROWS, query({ search: '  ALPHA ' }), COLUMNS))).toEqual(['Alpha']);
  });

  it('skips columns marked unsearchable', () => {
    expect(filterRows(ROWS, query({ search: '100' }), COLUMNS)).toEqual([]);
  });

  it('matches a text column filter on substrings', () => {
    expect(names(filterRows(ROWS, query({ columnFilters: { name: ['a'] } }), COLUMNS))).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
      'Delta',
    ]);
    expect(names(filterRows(ROWS, query({ columnFilters: { name: ['lt'] } }), COLUMNS))).toEqual([
      'Delta',
    ]);
  });

  it('matches a select column filter exactly', () => {
    expect(names(filterRows(ROWS, query({ columnFilters: { region: ['us-east-1'] } }), COLUMNS))) //
      .toEqual(['Beta', 'Delta']);
    expect(filterRows(ROWS, query({ columnFilters: { region: ['us-east'] } }), COLUMNS)).toEqual([]);
  });

  it('treats an empty filter value as inactive', () => {
    expect(filterRows(ROWS, query({ columnFilters: { region: [] } }), COLUMNS)).toBe(ROWS);
  });

  it('widens a column on several values rather than narrowing it', () => {
    const result = filterRows(
      ROWS,
      query({ columnFilters: { tier: ['gold', 'bronze'] } }),
      MULTI_COLUMNS,
    );

    expect(names(result)).toEqual(['Alpha', 'Beta', 'Delta']);
  });

  it('still requires every filtered column to match', () => {
    const result = filterRows(
      ROWS,
      query({ columnFilters: { tier: ['gold', 'bronze'], region: ['us-east-1'] } }),
      MULTI_COLUMNS,
    );

    expect(names(result)).toEqual(['Beta', 'Delta']);
  });

  it('matches multi-select values exactly, like a single select', () => {
    expect(filterRows(ROWS, query({ columnFilters: { tier: ['gol'] } }), MULTI_COLUMNS)).toEqual([]);
  });

  it('combines column filters and search with AND', () => {
    const result = filterRows(
      ROWS,
      query({ search: 'a', columnFilters: { region: ['eu-west-1'] } }),
      COLUMNS,
    );

    expect(names(result)).toEqual(['Alpha', 'Gamma']);
  });

  it('matches the formatted text rather than the raw value', () => {
    const columns: readonly Column<Row>[] = [{ key: 'score', header: 'Score', format: () => 'n/a' }];

    expect(filterRows(ROWS, query({ search: 'n/a' }), columns)).toHaveLength(4);
    expect(filterRows(ROWS, query({ search: '30' }), columns)).toHaveLength(0);
  });
});

describe('sortRows', () => {
  it('keeps source order without a sort key', () => {
    expect(sortRows(ROWS, query())).toBe(ROWS);
  });

  it('sorts numbers numerically rather than lexically', () => {
    expect(names(sortRows(ROWS, query({ sortKey: 'score' })))).toEqual([
      'Delta',
      'Beta',
      'Alpha',
      'Gamma',
    ]);
  });

  it('reverses on a descending direction', () => {
    expect(names(sortRows(ROWS, query({ sortKey: 'name', sortDirection: 'desc' })))).toEqual([
      'Gamma',
      'Delta',
      'Beta',
      'Alpha',
    ]);
  });

  it('does not mutate the input', () => {
    const input = [...ROWS];
    sortRows(input, query({ sortKey: 'name' }));

    expect(names(input)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
  });
});

describe('pageRows', () => {
  it('slices to the requested page', () => {
    expect(names(pageRows(ROWS, query({ pageSize: 2, pageIndex: 1 })))).toEqual(['Gamma', 'Delta']);
  });

  it('clamps a page index past the end onto the last page', () => {
    expect(names(pageRows(ROWS, query({ pageSize: 2, pageIndex: 9 })))).toEqual(['Gamma', 'Delta']);
  });

  it('returns everything when paging is disabled', () => {
    expect(pageRows(ROWS, query({ pageSize: 0 }))).toBe(ROWS);
  });
});

describe('applyQuery', () => {
  it('filters, then sorts, then pages', () => {
    const result = applyQuery(
      ROWS,
      query({ columnFilters: { region: ['eu-west-1'] }, sortKey: 'score', pageSize: 1 }),
      COLUMNS,
    );

    expect(names(result.rows)).toEqual(['Alpha']);
    expect(result.total).toBe(2);
  });

  it('reports the match count, not the page length', () => {
    expect(applyQuery(ROWS, query({ pageSize: 2 }), COLUMNS)).toMatchObject({ total: 4 });
  });
});

describe('paging arithmetic', () => {
  it('counts at least one page even when empty', () => {
    expect(pageCount(0, 10)).toBe(1);
    expect(pageCount(21, 10)).toBe(3);
  });

  it('clamps an index into the available range', () => {
    expect(clampPageIndex(5, 21, 10)).toBe(2);
    expect(clampPageIndex(-3, 21, 10)).toBe(0);
  });
});

describe('filterOptionsFor', () => {
  it('derives sorted, distinct options from the rows', () => {
    expect(filterOptionsFor(ROWS, COLUMNS[1])).toEqual(['eu-west-1', 'us-east-1']);
  });

  it('prefers explicit options, which is the only thing that works server-side', () => {
    const column: Column<Row> = { key: 'region', header: 'Region', filterOptions: ['ap-south-1'] };

    expect(filterOptionsFor(ROWS, column)).toEqual(['ap-south-1']);
  });
});
