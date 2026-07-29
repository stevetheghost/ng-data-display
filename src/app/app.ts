import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly description: string;
}

const NAV: readonly NavItem[] = [
  { path: '/data-table', label: 'Data table', description: 'Sortable, filterable rows' },
  {
    path: '/cdk-data-table',
    label: 'CDK data table',
    description: 'The same table, built on @angular/cdk/table',
  },
  { path: '/data-list', label: 'Data list', description: 'The same rows, one per line' },
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
