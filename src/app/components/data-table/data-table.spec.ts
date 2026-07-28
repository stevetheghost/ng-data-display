import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CellTemplate } from './cell-template';
import { Column, DataTable, TableMode, TableQuery, emptyQuery } from './data-table';

interface Row {
  id: string;
  name: string;
  score: number;
}

const COLUMNS: readonly Column<Row>[] = [
  { key: 'name', header: 'Name', filter: 'text' },
  { key: 'score', header: 'Score', align: 'end', format: (row) => `${row.score} pts` },
];

const THREE: readonly Row[] = [
  { id: 'b', name: 'Beta', score: 20 },
  { id: 'a', name: 'Alpha', score: 30 },
  { id: 'c', name: 'Gamma', score: 10 },
];

/** Twelve rows named Row 01…Row 12, so two pages of ten fall out naturally. */
const TWELVE: readonly Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: `r${i}`,
  name: `Row ${String(i + 1).padStart(2, '0')}`,
  score: i,
}));

@Component({
  imports: [DataTable, CellTemplate],
  template: `
    <app-data-table
      [rows]="rows()"
      [columns]="columns()"
      [mode]="mode()"
      [total]="total()"
      [loading]="loading()"
      [searchDebounceMs]="debounce()"
      [(query)]="query"
      caption="Test rows"
    >
      <ng-template appCellTemplate="score" let-row>
        <span data-testid="custom">custom {{ row.score }}</span>
      </ng-template>
    </app-data-table>
  `,
})
class Host {
  readonly columns = signal<readonly Column<Row>[]>(COLUMNS);
  readonly rows = signal<readonly Row[]>(THREE);
  readonly mode = signal<TableMode>('client');
  readonly total = signal<number | null>(null);
  readonly loading = signal(false);
  readonly debounce = signal(0);
  readonly query = signal<TableQuery>(emptyQuery());
}

describe('DataTable', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  const headerFor = (name: string) =>
    [...el.querySelectorAll('th[scope="col"]')].find((th) => th.textContent?.includes(name))!;

  const firstColumnValues = () =>
    [...el.querySelectorAll('tbody th[scope="row"]')].map((th) => th.textContent?.trim());

  const buttonFor = (label: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(label))!;

  async function clickHeader(name: string): Promise<void> {
    headerFor(name).querySelector('button')!.click();
    await fixture.whenStable();
  }

  async function click(label: string): Promise<void> {
    buttonFor(label).click();
    await fixture.whenStable();
  }

  async function type(selector: string, value: string): Promise<void> {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function choose(selector: string, value: string): Promise<void> {
    const select = el.querySelector<HTMLSelectElement>(selector)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  describe('rendering', () => {
    it('renders rows in source order until a column is sorted', () => {
      expect(firstColumnValues()).toEqual(['Beta', 'Alpha', 'Gamma']);
    });

    it('renders a projected template instead of the formatted value', () => {
      const cell = el.querySelector('[data-testid="custom"]');

      expect(cell?.textContent).toContain('custom 20');
      expect(el.textContent).not.toContain('20 pts');
    });

    it('shows the empty message when there are no rows', async () => {
      host.rows.set([]);
      await fixture.whenStable();

      expect(el.textContent).toContain('No rows match the current filters.');
      expect(el.querySelector('tbody td')?.getAttribute('colspan')).toBe('2');
    });

    it('labels the table with a caption for assistive tech', () => {
      expect(el.querySelector('caption')?.textContent?.trim()).toBe('Test rows');
    });
  });

  describe('sorting', () => {
    it('sorts ascending then descending on repeat clicks', async () => {
      await clickHeader('Name');
      expect(firstColumnValues()).toEqual(['Alpha', 'Beta', 'Gamma']);

      await clickHeader('Name');
      expect(firstColumnValues()).toEqual(['Gamma', 'Beta', 'Alpha']);
    });

    it('sorts numbers numerically rather than lexically', async () => {
      await clickHeader('Score');
      expect(firstColumnValues()).toEqual(['Gamma', 'Beta', 'Alpha']);
    });

    it('exposes sort state through aria-sort', async () => {
      expect(headerFor('Name').getAttribute('aria-sort')).toBe('none');

      await clickHeader('Name');
      expect(headerFor('Name').getAttribute('aria-sort')).toBe('ascending');
      expect(headerFor('Score').getAttribute('aria-sort')).toBe('none');

      await clickHeader('Name');
      expect(headerFor('Name').getAttribute('aria-sort')).toBe('descending');
    });

    it('publishes the sort through the query model', async () => {
      await clickHeader('Score');

      expect(host.query()).toMatchObject({ sortKey: 'score', sortDirection: 'asc' });
    });
  });

  describe('filtering', () => {
    it('narrows rows by the global search', async () => {
      await type('input[type="search"]', 'al');

      expect(firstColumnValues()).toEqual(['Alpha']);
      expect(host.query().search).toBe('al');
    });

    it('narrows rows by a per-column filter', async () => {
      await type('[aria-label="Filter by Name"]', 'gam');

      expect(firstColumnValues()).toEqual(['Gamma']);
      expect(host.query().columnFilters).toEqual({ name: 'gam' });
    });

    it('renders a select filter with derived options', async () => {
      host.columns.set([
        { key: 'name', header: 'Name', filter: 'select' },
        { key: 'score', header: 'Score' },
      ]);
      await fixture.whenStable();

      const options = [...el.querySelectorAll<HTMLOptionElement>('select[aria-label] option')].map(
        (o) => o.value,
      );

      expect(options).toEqual(['', 'Alpha', 'Beta', 'Gamma']);

      await choose('select[aria-label="Filter by Name"]', 'Beta');
      expect(firstColumnValues()).toEqual(['Beta']);
    });

    it('omits the filter row when no column asks for one', async () => {
      host.columns.set([{ key: 'name', header: 'Name' }]);
      await fixture.whenStable();

      expect(el.querySelector('thead [aria-label^="Filter by"]')).toBeNull();
    });

    it('returns to the first page when a filter changes', async () => {
      host.rows.set(TWELVE);
      await fixture.whenStable();

      await click('Next page');
      expect(host.query().pageIndex).toBe(1);

      await type('input[type="search"]', 'Row 0');
      expect(host.query().pageIndex).toBe(0);
    });
  });

  describe('client-side paging', () => {
    beforeEach(async () => {
      host.rows.set(TWELVE);
      await fixture.whenStable();
    });

    it('shows only the first page by default', () => {
      expect(firstColumnValues()).toHaveLength(10);
      expect(firstColumnValues().at(0)).toBe('Row 01');
      expect(el.textContent).toContain('1–10 of 12');
    });

    it('advances to the next page', async () => {
      await click('Next page');

      expect(firstColumnValues()).toEqual(['Row 11', 'Row 12']);
      expect(el.textContent).toContain('11–12 of 12');
      expect(el.textContent).toContain('Page 2 of 2');
    });

    it('disables the previous and next controls at the ends', async () => {
      expect(buttonFor('Previous page').disabled).toBe(true);
      expect(buttonFor('Next page').disabled).toBe(false);

      await click('Last page');

      expect(buttonFor('Next page').disabled).toBe(true);
      expect(buttonFor('First page').disabled).toBe(false);
    });

    it('re-pages on a new page size and returns to the first page', async () => {
      await click('Next page');
      await choose('select[id^="page-size"]', '25');

      expect(host.query()).toMatchObject({ pageSize: 25, pageIndex: 0 });
      expect(firstColumnValues()).toHaveLength(12);
    });

    it('pages over the filtered set, not the raw rows', async () => {
      await type('input[type="search"]', 'Row 1');

      expect(el.textContent).toContain('1–3 of 3');
      expect(firstColumnValues()).toEqual(['Row 10', 'Row 11', 'Row 12']);
    });

    it('falls back to the last page when the match count shrinks', async () => {
      await click('Next page');
      host.rows.set(TWELVE.slice(0, 4));
      await fixture.whenStable();

      expect(firstColumnValues()).toHaveLength(4);
      expect(el.textContent).toContain('1–4 of 4');
    });

    it('announces the range politely', () => {
      expect(el.querySelector('[aria-live="polite"]')?.textContent).toContain('1–10 of 12');
    });
  });

  describe('server mode', () => {
    beforeEach(async () => {
      host.mode.set('server');
      host.rows.set(TWELVE.slice(0, 10));
      host.total.set(57);
      await fixture.whenStable();
    });

    it('renders the given page verbatim without filtering it', async () => {
      await type('input[type="search"]', 'nothing-matches-this');

      expect(firstColumnValues()).toHaveLength(10);
    });

    it('sizes paging from the reported total, not the rows it holds', () => {
      expect(el.textContent).toContain('1–10 of 57');
      expect(el.textContent).toContain('Page 1 of 6');
    });

    it('reports the requested page through the query instead of slicing', async () => {
      await click('Next page');

      expect(host.query().pageIndex).toBe(1);
      expect(firstColumnValues()).toHaveLength(10);
    });

    it('does not re-sort the page it was handed', async () => {
      const before = firstColumnValues();
      await clickHeader('Score');

      expect(firstColumnValues()).toEqual(before);
      expect(host.query().sortKey).toBe('score');
    });

    it('marks the table busy and blocks paging while loading', async () => {
      host.loading.set(true);
      await fixture.whenStable();

      expect(el.querySelector('[aria-busy="true"]')).toBeTruthy();
      expect(buttonFor('Next page').disabled).toBe(true);
    });
  });

  describe('search debounce', () => {
    const settle = async (ms: number) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      await fixture.whenStable();
    };

    it('holds a server-mode keystroke back until the delay passes', async () => {
      host.mode.set('server');
      host.debounce.set(30);
      await fixture.whenStable();

      await type('input[type="search"]', 'gam');
      expect(host.query().search).toBe('');

      await settle(60);
      expect(host.query().search).toBe('gam');
    });

    it('keeps only the last keystroke of a burst', async () => {
      host.mode.set('server');
      host.debounce.set(30);
      await fixture.whenStable();

      await type('input[type="search"]', 'g');
      await type('input[type="search"]', 'ga');
      await type('input[type="search"]', 'gam');

      await settle(60);
      expect(host.query().search).toBe('gam');
    });

    it('applies client-mode keystrokes immediately', async () => {
      host.debounce.set(30);
      await fixture.whenStable();

      await type('input[type="search"]', 'al');

      expect(host.query().search).toBe('al');
      expect(firstColumnValues()).toEqual(['Alpha']);
    });
  });
});
