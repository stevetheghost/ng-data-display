import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly description: string;
}

const NAV: readonly NavItem[] = [
  { path: '/stat-tiles', label: 'Stat tiles', description: 'Headline numbers with deltas' },
  { path: '/data-table', label: 'Data table', description: 'Sortable, filterable rows' },
  { path: '/data-list', label: 'Data list', description: 'The same rows, one per line' },
  { path: '/card-grid', label: 'Card grid', description: 'Scannable card layout' },
];

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App {
  protected readonly nav = NAV;
}
