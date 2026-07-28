import { Directive, TemplateRef, inject, input } from '@angular/core';

/**
 * Opts one column out of default text rendering.
 *
 * ```html
 * <ng-template appCellTemplate="status" let-row>
 *   <app-status-badge [status]="row.status" />
 * </ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[appCellTemplate]' })
export class CellTemplate<T> {
  /** Column key this template renders. */
  readonly appCellTemplate = input.required<string>();

  readonly templateRef = inject<TemplateRef<{ $implicit: T }>>(TemplateRef);

  /** Types `let-row` as the row type at the call site. */
  static ngTemplateContextGuard<T>(
    _dir: CellTemplate<T>,
    ctx: unknown,
  ): ctx is { $implicit: T } {
    return true;
  }
}
