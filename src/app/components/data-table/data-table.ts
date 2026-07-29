import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MultiSelectFilter } from './multi-select-filter';
import { Paginator } from './paginator';
import { QueryDrivenTable } from './query-driven-table';
import { Column } from './table-query';

/**
 * Sortable, filterable, paged table over a list of rows and a column config.
 *
 * The same component drives both modes. Client-side (the default) it takes every
 * row and applies `query` itself; server-side it takes one page plus `total` and
 * treats `query` purely as an output, leaving the fetch to the caller. Because
 * both paths run the same filter/sort/page order, switching modes does not
 * change what page 2 contains.
 *
 * All of that lives in {@link QueryDrivenTable}; what this class adds is the
 * markup — a plain `@for` over the columns — and the overflow handling that
 * markup needs.
 *
 * ```html
 * <!-- client -->
 * <app-data-table [rows]="all()" [columns]="columns" caption="…" />
 *
 * <!-- server -->
 * <app-data-table
 *   mode="server"
 *   [rows]="page().rows"
 *   [total]="page().total"
 *   [loading]="resource.isLoading()"
 *   [(query)]="query"
 *   [columns]="columns"
 *   caption="…"
 * />
 * ```
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, MultiSelectFilter, Paginator],
  templateUrl: './data-table.html',
})
export class DataTable<T extends { id: string }> extends QueryDrivenTable<T> {
  private readonly openFilters = signal<ReadonlySet<string>>(new Set());

  /**
   * The body scrolls horizontally, which also clips anything overflowing it — so
   * an open filter list would be cut off. Dropping the clip while one is open is
   * enough, since the list closes before the user can scroll again.
   */
  protected readonly anyFilterOpen = computed(() => this.openFilters().size > 0);

  protected onFilterOpen(column: Column<T>, open: boolean): void {
    this.openFilters.update((keys) => {
      const next = new Set(keys);
      if (open) next.add(column.key);
      else next.delete(column.key);
      return next;
    });
  }
}
