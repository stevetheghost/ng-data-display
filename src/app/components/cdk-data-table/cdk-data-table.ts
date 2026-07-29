import { NgTemplateOutlet } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import {
  ChangeDetectionStrategy,
  Component,
  TrackByFunction,
  computed,
  input,
} from '@angular/core';
import { MultiSelectFilter } from '../data-table/multi-select-filter';
import { Paginator } from '../data-table/paginator';
import { QueryDrivenTable } from '../data-table/query-driven-table';
import { Column } from '../data-table/table-query';

/** Column-def name for a column's filter cell, which lives in its own header row. */
const FILTER_PREFIX = 'filter_';

/**
 * Sortable, filterable, paged table built on `@angular/cdk/table`.
 *
 * Same inputs and same `query` contract as `DataTable` — both extend
 * {@link QueryDrivenTable}, so the two are drop-in swaps; what differs is who
 * assembles the rows. Here each column contributes a `cdkColumnDef` holding its
 * header, cell and footer templates, and the row defs name the columns they
 * want — so the header, the filter row, the body and the footer all read their
 * cells from one definition instead of repeating the column loop four times.
 * That structure is what buys the extras the hand-rolled table has no cheap way
 * to get: sticky headers, a pinned totals row, and CDK's own empty-state row.
 *
 * A column grows a footer by setting `Column.footer`; the row appears as soon as
 * any column defines one.
 *
 * ```html
 * <app-cdk-data-table [rows]="all()" [columns]="columns" caption="…" />
 * ```
 */
@Component({
  selector: 'app-cdk-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkTableModule, NgTemplateOutlet, MultiSelectFilter, Paginator],
  templateUrl: './cdk-data-table.html',
})
export class CdkDataTable<T extends { id: string }> extends QueryDrivenTable<T> {
  /** Header rows stay put while the body scrolls under them. */
  readonly stickyHeader = input(true);
  /** Keeps the totals in view, on the tables that have them. */
  readonly stickyFooter = input(true);
  /**
   * Height at which the body starts scrolling, as a CSS length. Sticky headers
   * need a scroll container to stick to, so `stickyHeader` does nothing without
   * one; pass an empty string to let the table run as long as its rows. A column
   * filter list opens inside that container, so keep it taller than the list.
   */
  readonly maxHeight = input('32rem');

  /** The column names each row def renders, in order. */
  protected readonly columnKeys = computed(() => this.columns().map((column) => column.key));

  protected readonly filterColumnKeys = computed(() =>
    this.columns().map((column) => this.filterKey(column)),
  );

  /**
   * Footer text per column. The summaries are the caller's own reductions over
   * the rendered rows, so they run once per page rather than once per change
   * detection cycle — the footer cells exist even when the row is hidden.
   */
  private readonly footers = computed(() => {
    const rows = this.visibleRows();
    const text = new Map<string, string>();
    for (const column of this.columns()) {
      if (column.footer) text.set(column.key, column.footer(rows));
    }
    return text;
  });

  protected readonly hasFooter = computed(() => this.footers().size > 0);

  /** CDK renders rows itself, so identity has to come from us rather than a `track`. */
  protected readonly trackById: TrackByFunction<T> = (_index, row) => row.id;

  protected filterKey(column: Column<T>): string {
    return FILTER_PREFIX + column.key;
  }

  protected footerText(column: Column<T>): string {
    return this.footers().get(column.key) ?? '';
  }
}
