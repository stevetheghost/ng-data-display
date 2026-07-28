import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CellTemplate } from '../data-table/cell-template';
import { DataList, ListField, TableMode, TableQuery, emptyQuery } from './data-list';

interface Row {
  id: string;
  name: string;
  region: string;
  score: number;
}

const FIELDS: readonly ListField<Row>[] = [
  { key: 'name', header: 'Name', slot: 'title', filter: 'text' },
  { key: 'region', header: 'Region', slot: 'meta' },
  { key: 'score', header: 'Score', align: 'end', format: (row) => `${row.score} pts` },
];

const THREE: readonly Row[] = [
  { id: 'b', name: 'Beta', region: 'eu', score: 20 },
  { id: 'a', name: 'Alpha', region: 'us', score: 30 },
  { id: 'c', name: 'Gamma', region: 'eu', score: 10 },
];

/** Twelve rows named Row 01…Row 12, so two pages of ten fall out naturally. */
const TWELVE: readonly Row[] = Array.from({ length: 12 }, (_, i) => ({
  id: `r${i}`,
  name: `Row ${String(i + 1).padStart(2, '0')}`,
  region: 'us',
  score: i,
}));

@Component({
  imports: [DataList, CellTemplate],
  template: `
    <app-data-list
      [rows]="rows()"
      [fields]="fields()"
      [mode]="mode()"
      [total]="total()"
      [loading]="loading()"
      [searchDebounceMs]="debounce()"
      [(query)]="query"
      label="Test rows"
    >
      <ng-template appCellTemplate="score" let-row>
        <span data-testid="custom">custom {{ row.score }}</span>
      </ng-template>
    </app-data-list>
  `,
})
class Host {
  readonly fields = signal<readonly ListField<Row>[]>(FIELDS);
  readonly rows = signal<readonly Row[]>(THREE);
  readonly mode = signal<TableMode>('client');
  readonly total = signal<number | null>(null);
  readonly loading = signal(false);
  readonly debounce = signal(0);
  readonly query = signal<TableQuery>(emptyQuery());
}

describe('DataList', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  const titles = () =>
    [...el.querySelectorAll('.list-row .list-col-grow p:first-child')].map((p) =>
      p.textContent?.trim(),
    );

  const buttonFor = (label: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(label))!;

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

  const sortBy = (key: string) => choose('select[id^="list-sort"]', key);

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  describe('rendering', () => {
    it('renders rows in source order until a sort is picked', () => {
      expect(titles()).toEqual(['Beta', 'Alpha', 'Gamma']);
    });

    it('places each field in its slot', () => {
      const row = el.querySelector('.list-row')!;

      expect(row.querySelector('.list-col-grow p:first-child')?.textContent).toContain('Beta');
      expect(row.querySelector('.list-col-grow p:nth-child(2)')?.textContent).toContain('eu');
      expect(row.querySelector('dl dt')?.textContent).toContain('Score');
    });

    it('renders a projected template instead of the formatted value', () => {
      const cell = el.querySelector('[data-testid="custom"]');

      expect(cell?.textContent).toContain('custom 20');
      expect(el.textContent).not.toContain('20 pts');
    });

    it('shows the empty message when there are no rows', async () => {
      host.rows.set([]);
      await fixture.whenStable();

      expect(el.textContent).toContain('No items match the current filters.');
      expect(el.querySelector('.list-row')).toBeNull();
    });

    it('names the list for assistive tech', () => {
      expect(el.querySelector('ul.list')?.getAttribute('aria-label')).toBe('Test rows');
    });
  });

  describe('sorting', () => {
    it('offers every sortable field, plus an unsorted option', () => {
      const options = [...el.querySelectorAll<HTMLOptionElement>('select[id^="list-sort"] option')];

      expect(options.map((o) => o.value)).toEqual(['', 'name', 'region', 'score']);
      expect(options[0].textContent?.trim()).toBe('Unsorted');
    });

    it('omits a field that opts out of sorting', async () => {
      host.fields.set([
        { key: 'name', header: 'Name', slot: 'title' },
        { key: 'score', header: 'Score', sortable: false },
      ]);
      await fixture.whenStable();

      const values = [...el.querySelectorAll<HTMLOptionElement>('select[id^="list-sort"] option')] //
        .map((o) => o.value);

      expect(values).toEqual(['', 'name']);
    });

    it('sorts ascending on the picked field', async () => {
      await sortBy('name');

      expect(titles()).toEqual(['Alpha', 'Beta', 'Gamma']);
      expect(host.query()).toMatchObject({ sortKey: 'name', sortDirection: 'asc' });
    });

    it('reverses on the direction toggle', async () => {
      await sortBy('name');
      await click('Sort descending');

      expect(titles()).toEqual(['Gamma', 'Beta', 'Alpha']);
      expect(host.query().sortDirection).toBe('desc');
    });

    it('starts a newly picked field at ascending', async () => {
      await sortBy('name');
      await click('Sort descending');
      await sortBy('score');

      expect(host.query()).toMatchObject({ sortKey: 'score', sortDirection: 'asc' });
    });

    it('restores source order when the sort is cleared', async () => {
      await sortBy('name');
      await sortBy('');

      expect(titles()).toEqual(['Beta', 'Alpha', 'Gamma']);
      expect(host.query().sortKey).toBeNull();
    });

    it('sorts numbers numerically rather than lexically', async () => {
      await sortBy('score');

      expect(titles()).toEqual(['Gamma', 'Beta', 'Alpha']);
    });

    it('disables the direction toggle while unsorted', async () => {
      expect(buttonFor('Sort descending').disabled).toBe(true);

      await sortBy('name');
      expect(buttonFor('Sort descending').disabled).toBe(false);
    });
  });

  describe('filtering', () => {
    it('narrows rows by the global search', async () => {
      await type('input[type="search"]:not([aria-label])', 'al');

      expect(titles()).toEqual(['Alpha']);
      expect(host.query().search).toBe('al');
    });

    it('narrows rows by a per-field filter', async () => {
      await type('[aria-label="Filter by Name"]', 'gam');

      expect(titles()).toEqual(['Gamma']);
      expect(host.query().columnFilters).toEqual({ name: ['gam'] });
    });

    it('renders a select filter with derived options', async () => {
      host.fields.set([
        { key: 'name', header: 'Name', slot: 'title' },
        { key: 'region', header: 'Region', filter: 'select' },
      ]);
      await fixture.whenStable();

      const options = [
        ...el.querySelectorAll<HTMLOptionElement>('select[aria-label="Filter by Region"] option'),
      ].map((o) => o.value);

      expect(options).toEqual(['', 'eu', 'us']);

      await choose('select[aria-label="Filter by Region"]', 'us');
      expect(titles()).toEqual(['Alpha']);
    });

    it('keeps rows matching any ticked value of a multiselect', async () => {
      host.fields.set([
        { key: 'name', header: 'Name', slot: 'title' },
        { key: 'region', header: 'Region', filter: 'multiselect' },
      ]);
      await fixture.whenStable();

      const check = async (option: string) => {
        const box = [...el.querySelectorAll<HTMLInputElement>('.dropdown input[type="checkbox"]')] //
          .find((input) => input.closest('label')?.textContent?.trim() === option)!;
        box.click();
        await fixture.whenStable();
      };

      await check('eu');
      expect(titles()).toEqual(['Beta', 'Gamma']);
      expect(host.query().columnFilters).toEqual({ region: ['eu'] });

      await check('us');
      expect(titles()).toEqual(['Beta', 'Alpha', 'Gamma']);
    });

    it('omits the toolbar filters when no field asks for one', async () => {
      host.fields.set([{ key: 'name', header: 'Name', slot: 'title' }]);
      await fixture.whenStable();

      expect(el.querySelector('[aria-label^="Filter by"]')).toBeNull();
    });

    it('returns to the first page when a filter changes', async () => {
      host.rows.set(TWELVE);
      await fixture.whenStable();

      await click('Next page');
      expect(host.query().pageIndex).toBe(1);

      await type('input[type="search"]:not([aria-label])', 'Row 0');
      expect(host.query().pageIndex).toBe(0);
    });
  });

  describe('client-side paging', () => {
    beforeEach(async () => {
      host.rows.set(TWELVE);
      await fixture.whenStable();
    });

    it('shows only the first page by default', () => {
      expect(titles()).toHaveLength(10);
      expect(titles().at(0)).toBe('Row 01');
      expect(el.textContent).toContain('1–10 of 12');
    });

    it('advances to the next page', async () => {
      await click('Next page');

      expect(titles()).toEqual(['Row 11', 'Row 12']);
      expect(el.textContent).toContain('Page 2 of 2');
    });

    it('re-pages on a new page size and returns to the first page', async () => {
      await click('Next page');
      await choose('select[id^="page-size"]', '25');

      expect(host.query()).toMatchObject({ pageSize: 25, pageIndex: 0 });
      expect(titles()).toHaveLength(12);
    });

    it('pages over the filtered set, not the raw rows', async () => {
      await type('input[type="search"]:not([aria-label])', 'Row 1');

      expect(el.textContent).toContain('1–3 of 3');
      expect(titles()).toEqual(['Row 10', 'Row 11', 'Row 12']);
    });

    it('falls back to the last page when the match count shrinks', async () => {
      await click('Next page');
      host.rows.set(TWELVE.slice(0, 4));
      await fixture.whenStable();

      expect(titles()).toHaveLength(4);
      expect(el.textContent).toContain('1–4 of 4');
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
      await type('input[type="search"]:not([aria-label])', 'nothing-matches-this');

      expect(titles()).toHaveLength(10);
    });

    it('sizes paging from the reported total, not the rows it holds', () => {
      expect(el.textContent).toContain('1–10 of 57');
      expect(el.textContent).toContain('Page 1 of 6');
    });

    it('reports the sort instead of applying it', async () => {
      await sortBy('name');

      expect(host.query()).toMatchObject({ sortKey: 'name', sortDirection: 'asc' });
      expect(titles()).toEqual(TWELVE.slice(0, 10).map((row) => row.name));
    });

    it('debounces the search so a burst of keystrokes costs one query', async () => {
      host.debounce.set(20);
      await fixture.whenStable();

      await type('input[type="search"]:not([aria-label])', 'ga');
      await type('input[type="search"]:not([aria-label])', 'gat');
      expect(host.query().search).toBe('');

      await new Promise((resolve) => setTimeout(resolve, 40));
      await fixture.whenStable();
      expect(host.query().search).toBe('gat');
    });

    it('blocks paging and dims the rows while a page is in flight', async () => {
      host.loading.set(true);
      await fixture.whenStable();

      expect(buttonFor('Next page').disabled).toBe(true);
      expect(el.querySelector('ul.list')?.className).toContain('opacity-60');
      expect(el.querySelector('[aria-busy="true"]')).not.toBeNull();
    });
  });
});
