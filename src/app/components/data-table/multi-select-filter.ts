import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

/**
 * Checkbox list in a disclosure, for a column filter that accepts several values.
 *
 * Built on `<details>` so the open/closed state, the button role and keyboard
 * activation are the browser's job rather than ours; this only adds the two
 * behaviours `<details>` lacks — close on Escape, and close on a click elsewhere.
 */
@Component({
  selector: 'app-multi-select-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'closeAndFocus()',
  },
  template: `
    <details class="dropdown w-full" [open]="open()" (toggle)="setOpen($any($event.target).open)">
      <summary
        class="input input-sm w-full flex-nowrap justify-between font-normal"
        [attr.aria-label]="accessibleLabel()"
      >
        <span class="truncate">{{ summary() }}</span>
        <span class="text-base-content/50" aria-hidden="true">▾</span>
      </summary>

      <div
        class="dropdown-content z-10 mt-1 max-h-64 w-56 overflow-y-auto rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
      >
        <fieldset>
          <legend class="sr-only">{{ label() }}</legend>

          @for (option of options(); track option) {
            <label
              class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-base-200"
            >
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                [checked]="isSelected(option)"
                (change)="toggle(option)"
              />
              <span class="text-sm">{{ option }}</span>
            </label>
          }
        </fieldset>

        @if (selected().length) {
          <button type="button" class="btn btn-ghost btn-xs mt-1 w-full" (click)="clear()">
            Clear {{ label() }}
          </button>
        }
      </div>
    </details>
  `,
})
export class MultiSelectFilter {
  /** Column name, used to name the control for assistive tech. */
  readonly label = input.required<string>();
  readonly options = input.required<readonly string[]>();
  readonly selected = input.required<readonly string[]>();

  readonly selectedChange = output<readonly string[]>();
  /** Lets the table drop its scroll clipping while the list is on screen. */
  readonly openChange = output<boolean>();

  protected readonly open = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly summary = computed(() => {
    const selected = this.selected();
    if (selected.length === 0) return 'All';
    if (selected.length === 1) return selected[0];
    return `${selected.length} selected`;
  });

  /** The visible text drops the column name once it counts, so spell it out here. */
  protected readonly accessibleLabel = computed(() => `Filter by ${this.label()}: ${this.summary()}`);

  protected isSelected(option: string): boolean {
    return this.selected().includes(option);
  }

  protected toggle(option: string): void {
    const selected = this.selected();
    this.selectedChange.emit(
      this.isSelected(option)
        ? selected.filter((value) => value !== option)
        : // Emit in the order the options are listed, not the order they were ticked.
          this.options().filter((value) => value === option || selected.includes(value)),
    );
  }

  protected clear(): void {
    this.selectedChange.emit([]);
  }

  protected setOpen(open: boolean): void {
    if (open === this.open()) return;
    this.open.set(open);
    this.openChange.emit(open);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (this.host.nativeElement.contains(event.target as Node)) return;
    this.setOpen(false);
  }

  protected closeAndFocus(): void {
    if (!this.open()) return;
    this.setOpen(false);
    this.host.nativeElement.querySelector('summary')?.focus();
  }
}
