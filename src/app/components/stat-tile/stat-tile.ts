import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Stat } from '../../models/service-metric.model';

/**
 * A single headline number with an optional period-over-period delta.
 *
 * `lowerIsBetter` flips which direction reads as good, so latency and error
 * rate get the same treatment as revenue without the caller re-colouring.
 */
@Component({
  selector: 'app-stat-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <p class="text-sm font-medium text-slate-600">{{ stat().label }}</p>
      <p class="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {{ stat().value }}
      </p>

      @if (delta(); as d) {
        <p class="mt-2 flex items-center gap-1.5 text-sm">
          <span class="font-medium" [class]="d.tone">
            <span aria-hidden="true">{{ d.arrow }}</span>
            {{ d.text }}
          </span>
          <span class="text-slate-500">vs last week</span>
        </p>
      }

      @if (stat().caption; as caption) {
        <p class="mt-1 text-xs text-slate-500">{{ caption }}</p>
      }
    </div>
  `,
})
export class StatTile {
  readonly stat = input.required<Stat>();

  protected readonly delta = computed(() => {
    const { delta, lowerIsBetter } = this.stat();
    if (delta === undefined) return null;

    const rising = delta > 0;
    const good = lowerIsBetter ? !rising : rising;

    return {
      arrow: rising ? '▲' : '▼',
      text: `${rising ? 'up' : 'down'} ${Math.abs(delta * 100).toFixed(1)}%`,
      tone: good ? 'text-emerald-700' : 'text-rose-700',
    };
  });
}
