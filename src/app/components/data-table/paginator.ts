import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { clampPageIndex, pageCount } from './table-query';

let nextId = 0;

const BUTTON = 'join-item btn btn-sm btn-square';

/**
 * Page controls for `DataTable`. Stateless: it renders the position it is given
 * and asks for a new one, which keeps the single source of truth in the table.
 */
@Component({
  selector: 'app-paginator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      aria-label="Pagination"
      class="flex flex-wrap items-center justify-between gap-4 border-t border-base-300 px-4 py-3"
    >
      <div class="flex items-center gap-2">
        <label [attr.for]="selectId" class="text-sm">Rows per page</label>
        <select
          [attr.id]="selectId"
          class="select select-sm w-20"
          [value]="pageSize()"
          (change)="onPageSize($event)"
        >
          @for (option of pageSizeOptions(); track option) {
            <option [value]="option">{{ option }}</option>
          }
        </select>
      </div>

      <p aria-live="polite" class="text-sm text-base-content/70">{{ summary() }}</p>

      <div class="flex items-center gap-3">
        <span class="text-sm text-base-content/70">Page {{ index() + 1 }} of {{ pages() }}</span>

        <div class="join">
          <button
            type="button"
            [class]="button"
            [disabled]="disabled() || onFirstPage()"
            (click)="go(0)"
          >
            <span aria-hidden="true">«</span>
            <span class="sr-only">First page</span>
          </button>
          <button
            type="button"
            [class]="button"
            [disabled]="disabled() || onFirstPage()"
            (click)="go(index() - 1)"
          >
            <span aria-hidden="true">‹</span>
            <span class="sr-only">Previous page</span>
          </button>
          <button
            type="button"
            [class]="button"
            [disabled]="disabled() || onLastPage()"
            (click)="go(index() + 1)"
          >
            <span aria-hidden="true">›</span>
            <span class="sr-only">Next page</span>
          </button>
          <button
            type="button"
            [class]="button"
            [disabled]="disabled() || onLastPage()"
            (click)="go(pages() - 1)"
          >
            <span aria-hidden="true">»</span>
            <span class="sr-only">Last page</span>
          </button>
        </div>
      </div>
    </nav>
  `,
})
export class Paginator {
  readonly pageIndex = input.required<number>();
  readonly pageSize = input.required<number>();
  /** Rows matching the query across every page. */
  readonly total = input.required<number>();
  readonly pageSizeOptions = input<readonly number[]>([10, 25, 50]);
  /** Blocks navigation while a server page is in flight. */
  readonly disabled = input(false);

  readonly pageIndexChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly button = BUTTON;
  protected readonly selectId = `page-size-${nextId++}`;

  protected readonly pages = computed(() => pageCount(this.total(), this.pageSize()));
  protected readonly index = computed(() =>
    clampPageIndex(this.pageIndex(), this.total(), this.pageSize()),
  );

  protected readonly onFirstPage = computed(() => this.index() === 0);
  protected readonly onLastPage = computed(() => this.index() >= this.pages() - 1);

  protected readonly summary = computed(() => {
    const total = this.total();
    if (total === 0) return 'No rows';

    const start = this.index() * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return `${start}–${end} of ${total}`;
  });

  protected go(index: number): void {
    const next = clampPageIndex(index, this.total(), this.pageSize());
    if (next !== this.index()) this.pageIndexChange.emit(next);
  }

  protected onPageSize(event: Event): void {
    this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
