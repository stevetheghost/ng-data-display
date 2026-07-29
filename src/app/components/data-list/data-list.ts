import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MultiSelectFilter } from '../data-table/multi-select-filter';
import { Paginator } from '../data-table/paginator';
import { QueryDrivenTable } from '../data-table/query-driven-table';
import { Column } from '../data-table/table-query';

let nextId = 0;

/** Where a field renders inside a row. */
export type ListSlot = 'lead' | 'title' | 'meta' | 'detail';

/**
 * A field of the row, and where it goes.
 *
 * Everything `DataTable` needs from a column applies here too — the query engine
 * is shared — so this is `Column` plus the one thing a list has and a table does
 * not: no header row to put a value under, hence `slot`. It stays on this
 * subtype rather than on `Column` because the four slots name regions that only
 * exist in a list row; a table has nowhere to put them.
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
 * The row-shaped counterpart to `DataTable`: both extend {@link QueryDrivenTable},
 * so it is the same `TableQuery`, the same two modes and the same
 * filter/sort/page order, and a page holds the same rows either way. What this
 * adds is the chrome — with no header row to hang controls off, fields carry a
 * `slot` saying where in the row they render, sorting moves to a select beside
 * the search box, and filters sit in the toolbar above.
 *
 * ```html
 * <!-- client -->
 * <app-data-list [rows]="all()" [columns]="fields" caption="…" />
 *
 * <!-- server -->
 * <app-data-list
 *   mode="server"
 *   [rows]="page().rows"
 *   [total]="page().total"
 *   [loading]="resource.isLoading()"
 *   [(query)]="query"
 *   [columns]="fields"
 *   caption="…"
 * />
 * ```
 */
@Component({
  selector: 'app-data-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, MultiSelectFilter, Paginator],
  templateUrl: './data-list.html',
})
export class DataList<T extends { id: string }> extends QueryDrivenTable<T, ListField<T>> {
  /** Rows, not cells — so the empty state and the search box say so. */
  override readonly emptyMessage = input('No items match the current filters.');
  override readonly searchLabel = input('Search list');
  readonly sortLabel = input('Sort by');

  protected readonly sortId = `list-sort-${nextId++}`;

  /** Fields grouped by the slot they render in, in one pass over the config. */
  protected readonly slots = computed(() => {
    const groups: Record<ListSlot, ListField<T>[]> = { lead: [], title: [], meta: [], detail: [] };
    for (const field of this.columns()) groups[field.slot ?? 'detail'].push(field);
    return groups;
  });

  protected readonly ascending = computed(() => this.query().sortDirection === 'asc');

  /** Spelled out rather than shown as an arrow, since the arrow is decorative. */
  protected readonly directionLabel = computed(() =>
    this.ascending() ? 'Sorted ascending. Sort descending' : 'Sorted descending. Sort ascending',
  );

  protected onSortKey(event: Event): void {
    const sortKey = (event.target as HTMLSelectElement).value || null;
    // A fresh key starts ascending; re-picking the current one leaves it alone.
    this.setSort(sortKey, sortKey === this.query().sortKey ? this.query().sortDirection : 'asc');
  }

  protected toggleDirection(): void {
    this.setSort(this.query().sortKey, this.ascending() ? 'desc' : 'asc');
  }
}
