import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  contentChildren,
  input,
  signal,
} from '@angular/core';
import { CellTemplate } from './cell-template';

export type SortDirection = 'asc' | 'desc';

export interface Column<T> {
  /** Property read for sorting, and for the default cell text. */
  readonly key: keyof T & string;
  readonly header: string;
  readonly align?: 'start' | 'end';
  /** Sortable unless explicitly disabled. */
  readonly sortable?: boolean;
  /** Overrides the displayed text. The raw value is still used for sorting. */
  readonly format?: (row: T) => string;
}

/**
 * Sortable table over a list of rows and a column config.
 *
 * Filtering deliberately lives with the caller: this component owns presentation
 * and sort order only, so the same table can back a search box, a date range, or
 * nothing at all.
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.html',
})
export class DataTable<T extends { id: string }> {
  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<readonly Column<T>[]>();
  /** Screen-reader description of the table. */
  readonly caption = input.required<string>();
  readonly emptyMessage = input('No rows match the current filters.');

  private readonly cellTemplates = contentChildren<CellTemplate<T>>(CellTemplate);

  private readonly sortKey = signal<string | null>(null);
  private readonly sortDirection = signal<SortDirection>('asc');

  protected readonly sortedRows = computed(() => {
    const rows = this.rows();
    const key = this.sortKey();
    if (!key) return rows;

    const factor = this.sortDirection() === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => factor * compare(a[key as keyof T], b[key as keyof T]));
  });

  protected ariaSort(column: Column<T>): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== column.key) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  protected sortIndicator(column: Column<T>): string {
    if (this.sortKey() !== column.key) return '↕';
    return this.sortDirection() === 'asc' ? '▲' : '▼';
  }

  protected templateFor(column: Column<T>): TemplateRef<{ $implicit: T }> | null {
    return this.cellTemplates().find((t) => t.appCellTemplate() === column.key)?.templateRef ?? null;
  }

  protected cell(row: T, column: Column<T>): string {
    return column.format ? column.format(row) : String(row[column.key as keyof T] ?? '');
  }

  protected isSortable(column: Column<T>): boolean {
    return column.sortable !== false;
  }

  protected toggleSort(column: Column<T>): void {
    if (!this.isSortable(column)) return;

    if (this.sortKey() === column.key) {
      this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.sortKey.set(column.key);
    this.sortDirection.set('asc');
  }
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}
