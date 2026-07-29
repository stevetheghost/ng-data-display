import { Component, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CellTemplate } from '../data-table/cell-template';
import { Column, TableMode, TableQuery, emptyQuery } from '../data-table/table-query';
import { CdkDataTable } from './cdk-data-table';

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
  imports: [CdkDataTable, CellTemplate],
  template: `
    <app-cdk-data-table
      [rows]="rows()"
      [columns]="columns()"
      [mode]="mode()"
      [total]="total()"
      [loading]="loading()"
      [(query)]="query"
      caption="Test rows"
    >
      <ng-template appCellTemplate="score" let-row>
        <span data-testid="custom">custom {{ row.score }}</span>
      </ng-template>
    </app-cdk-data-table>
  `,
})
class Host {
  readonly columns = signal<readonly Column<Row>[]>(COLUMNS);
  readonly rows = signal<readonly Row[]>(THREE);
  readonly mode = signal<TableMode>('client');
  readonly total = signal<number | null>(null);
  readonly loading = signal(false);
  readonly query = signal<TableQuery>(emptyQuery());
}

interface HostInputs {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  mode: TableMode;
  total: number | null;
  loading: boolean;
  query: TableQuery;
}

describe('CdkDataTable', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  const headerFor = (name: string) =>
    [...el.querySelectorAll('th[scope="col"]')].find((th) => th.textContent?.includes(name))!;

  const firstColumnValues = () =>
    [...el.querySelectorAll('tbody tr td:first-child')].map((td) => td.textContent?.trim());

  const footerValues = () =>
    [...el.querySelectorAll('tfoot td')].map((td) => td.textContent?.trim());

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

  /** Drives the host's inputs the way a parent template would, then settles. */
  async function set(inputs: Partial<HostInputs>): Promise<void> {
    for (const [key, value] of Object.entries(inputs)) {
      (host[key as keyof HostInputs] as WritableSignal<unknown>).set(value);
    }
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
    it('renders a native table through the CDK row and column defs', () => {
      expect(el.querySelector('table.cdk-table')).toBeTruthy();
      expect(firstColumnValues()).toEqual(['Beta', 'Alpha', 'Gamma']);
    });

    it('renders one column def per column, in order', () => {
      const headers = [...el.querySelectorAll('th[scope="col"]')].map((th) =>
        th.textContent?.trim(),
      );

      expect(headers.map((header) => header?.replace(/\s+\S+$/, ''))).toEqual(['Name', 'Score']);
    });

    it('renders a projected template instead of the formatted value', () => {
      const cell = el.querySelector('[data-testid="custom"]');

      expect(cell?.textContent).toContain('custom 20');
      expect(el.textContent).not.toContain('20 pts');
    });

    it('shows the CDK no-data row when there are no rows', async () => {
      await set({ rows: [] });

      expect(el.textContent).toContain('No rows match the current filters.');
      expect(el.querySelector('tbody td')?.getAttribute('colspan')).toBe('2');
    });

    it('labels the table with a caption for assistive tech', () => {
      expect(el.querySelector('caption')?.textContent?.trim()).toBe('Test rows');
    });
  });

  describe('sticky rows', () => {
    it('sticks both header rows by default', () => {
      const stuck = el.querySelectorAll('thead th.cdk-table-sticky');

      // Two rows of two columns: the headers and the filters beneath them.
      expect(stuck).toHaveLength(4);
    });

    it('sticks the footer to the bottom of the scroll box', () => {
      expect(el.querySelectorAll('tfoot td.cdk-table-sticky')).toHaveLength(2);
    });

    it('caps the body height so there is something to stick to', () => {
      expect(el.querySelector<HTMLElement>('.overflow-auto')?.style.maxHeight).toBe('32rem');
    });
  });

  describe('footer row', () => {
    beforeEach(async () => {
      await set({
        columns: [
          { key: 'name', header: 'Name', footer: (rows) => `${rows.length} shown` },
          {
            key: 'score',
            header: 'Score',
            footer: (rows) => `${rows.reduce((total, row) => total + row.score, 0)}`,
          },
        ],
      });
    });

    it('summarises the rendered rows', () => {
      expect(footerValues()).toEqual(['3 shown', '60']);
    });

    it('follows the filtered set', async () => {
      await type('input[type="search"]', 'al');

      expect(footerValues()).toEqual(['1 shown', '30']);
    });

    it('is hidden once no column defines one', async () => {
      await set({ columns: COLUMNS });

      expect(el.querySelector('tfoot tr')?.classList.contains('hidden')).toBe(true);
      expect(footerValues()).toEqual(['', '']);
    });

    it('appears when a footer is added to a column set that had none', async () => {
      await set({ columns: COLUMNS });

      await set({
        columns: [{ ...COLUMNS[0], footer: (rows) => `${rows.length} shown` }, COLUMNS[1]],
      });

      expect(el.querySelector('tfoot tr')?.classList.contains('hidden')).toBe(false);
      expect(footerValues()).toEqual(['3 shown', '']);
    });
  });

  describe('sorting', () => {
    it('sorts ascending then descending on repeat clicks', async () => {
      await clickHeader('Name');
      expect(firstColumnValues()).toEqual(['Alpha', 'Beta', 'Gamma']);

      await clickHeader('Name');
      expect(firstColumnValues()).toEqual(['Gamma', 'Beta', 'Alpha']);
    });

    it('clears the sort on the third click, restoring source order', async () => {
      await clickHeader('Name');
      await clickHeader('Name');
      await clickHeader('Name');

      expect(firstColumnValues()).toEqual(['Beta', 'Alpha', 'Gamma']);
      expect(host.query()).toMatchObject({ sortKey: null });
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
      expect(host.query().columnFilters).toEqual({ name: ['gam'] });
    });

    it('renders a select filter with derived options', async () => {
      await set({
        columns: [
          { key: 'name', header: 'Name', filter: 'select' },
          { key: 'score', header: 'Score' },
        ],
      });

      const options = [...el.querySelectorAll<HTMLOptionElement>('select[aria-label] option')].map(
        (o) => o.value,
      );
      expect(options).toEqual(['', 'Alpha', 'Beta', 'Gamma']);

      await choose('select[aria-label="Filter by Name"]', 'Beta');
      expect(firstColumnValues()).toEqual(['Beta']);
    });

    it('keeps rows matching any ticked value of a multi-select', async () => {
      await set({
        columns: [
          { key: 'name', header: 'Name', filter: 'multiselect' },
          { key: 'score', header: 'Score' },
        ],
      });

      const check = async (option: string) => {
        [...el.querySelectorAll<HTMLInputElement>('.dropdown input[type="checkbox"]')]
          .find((input) => input.closest('label')?.textContent?.trim() === option)!
          .click();
        await fixture.whenStable();
      };

      await check('Beta');
      await check('Gamma');

      expect(firstColumnValues()).toEqual(['Beta', 'Gamma']);
    });

    it('hides the filter header row when no column asks for one', async () => {
      await set({ columns: [{ key: 'name', header: 'Name' }] });

      const rows = el.querySelectorAll('thead tr');
      expect(rows).toHaveLength(2);
      expect(rows[1].classList.contains('hidden')).toBe(true);
      expect(el.querySelector('thead [aria-label^="Filter by"]')).toBeNull();
    });

    it('brings the filter row back when a column asks for one again', async () => {
      await set({ columns: [{ key: 'name', header: 'Name' }] });

      await set({ columns: [{ key: 'name', header: 'Name', filter: 'text' }] });

      expect(el.querySelectorAll('thead tr')[1].classList.contains('hidden')).toBe(false);

      await type('[aria-label="Filter by Name"]', 'gam');
      expect(firstColumnValues()).toEqual(['Gamma']);
    });

    it('returns to the first page when a filter changes', async () => {
      await set({ rows: TWELVE });

      await click('Next page');
      expect(host.query().pageIndex).toBe(1);

      await type('input[type="search"]', 'Row 0');
      expect(host.query().pageIndex).toBe(0);
    });
  });

  describe('client-side paging', () => {
    beforeEach(async () => {
      await set({ rows: TWELVE });
    });

    it('shows only the first page by default', () => {
      expect(firstColumnValues()).toHaveLength(10);
      expect(el.textContent).toContain('1–10 of 12');
    });

    it('advances to the next page', async () => {
      await click('Next page');

      expect(firstColumnValues()).toEqual(['Row 11', 'Row 12']);
      expect(el.textContent).toContain('Page 2 of 2');
    });

    it('pages over the filtered set, not the raw rows', async () => {
      await type('input[type="search"]', 'Row 1');

      expect(el.textContent).toContain('1–3 of 3');
      expect(firstColumnValues()).toEqual(['Row 10', 'Row 11', 'Row 12']);
    });
  });

  describe('server mode', () => {
    beforeEach(async () => {
      await set({ mode: 'server', rows: TWELVE.slice(0, 10), total: 57 });
    });

    it('renders the given page verbatim without filtering it', async () => {
      await type('input[type="search"]', 'nothing-matches-this');

      expect(firstColumnValues()).toHaveLength(10);
    });

    it('sizes paging from the reported total, not the rows it holds', () => {
      expect(el.textContent).toContain('1–10 of 57');
      expect(el.textContent).toContain('Page 1 of 6');
    });

    it('does not re-sort the page it was handed', async () => {
      const before = firstColumnValues();
      await clickHeader('Score');

      expect(firstColumnValues()).toEqual(before);
      expect(host.query().sortKey).toBe('score');
    });

    it('marks the table busy and blocks paging while loading', async () => {
      await set({ loading: true });

      expect(el.querySelector('[aria-busy="true"]')).toBeTruthy();
      expect(buttonFor('Next page').disabled).toBe(true);
    });
  });
});
