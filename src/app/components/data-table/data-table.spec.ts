import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CellTemplate } from './cell-template';
import { Column, DataTable } from './data-table';

interface Row {
  id: string;
  name: string;
  score: number;
}

const COLUMNS: readonly Column<Row>[] = [
  { key: 'name', header: 'Name' },
  { key: 'score', header: 'Score', align: 'end', format: (row) => `${row.score} pts` },
];

@Component({
  imports: [DataTable, CellTemplate],
  template: `
    <app-data-table [rows]="rows()" [columns]="columns" caption="Test rows">
      <ng-template appCellTemplate="score" let-row>
        <span data-testid="custom">custom {{ row.score }}</span>
      </ng-template>
    </app-data-table>
  `,
})
class Host {
  readonly columns = COLUMNS;
  readonly rows = signal<readonly Row[]>([
    { id: 'b', name: 'Beta', score: 20 },
    { id: 'a', name: 'Alpha', score: 30 },
    { id: 'c', name: 'Gamma', score: 10 },
  ]);
}

describe('DataTable', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;

  const headerFor = (name: string) =>
    [...el.querySelectorAll('th[scope="col"]')].find((th) => th.textContent?.includes(name))!;

  const firstColumnValues = () =>
    [...el.querySelectorAll('tbody th[scope="row"]')].map((th) => th.textContent?.trim());

  async function clickHeader(name: string): Promise<void> {
    headerFor(name).querySelector('button')!.click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('renders rows in source order until a column is sorted', () => {
    expect(firstColumnValues()).toEqual(['Beta', 'Alpha', 'Gamma']);
  });

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

  it('renders a projected template instead of the formatted value', () => {
    const cell = el.querySelector('[data-testid="custom"]');

    expect(cell?.textContent).toContain('custom 20');
    expect(el.textContent).not.toContain('20 pts');
  });

  it('shows the empty message when there are no rows', async () => {
    fixture.componentInstance.rows.set([]);
    await fixture.whenStable();

    expect(el.textContent).toContain('No rows match the current filters.');
    expect(el.querySelector('tbody td')?.getAttribute('colspan')).toBe('2');
  });

  it('labels the table with a caption for assistive tech', () => {
    expect(el.querySelector('caption')?.textContent?.trim()).toBe('Test rows');
  });
});
