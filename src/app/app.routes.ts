import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'stat-tiles' },
  {
    path: 'stat-tiles',
    title: 'Stat tiles · ng-data-display',
    loadComponent: () => import('./pages/overview/overview').then((m) => m.Overview),
  },
  {
    path: 'data-table',
    title: 'Data table · ng-data-display',
    loadComponent: () => import('./pages/table-demo/table-demo').then((m) => m.TableDemo),
  },
  {
    path: 'cdk-data-table',
    title: 'CDK data table · ng-data-display',
    loadComponent: () => import('./pages/cdk-table-demo/cdk-table-demo').then((m) => m.CdkTableDemo),
  },
  {
    path: 'data-list',
    title: 'Data list · ng-data-display',
    loadComponent: () => import('./pages/list-demo/list-demo').then((m) => m.ListDemo),
  },
  {
    path: 'card-grid',
    title: 'Card grid · ng-data-display',
    loadComponent: () => import('./pages/cards-demo/cards-demo').then((m) => m.CardsDemo),
  },
  { path: '**', redirectTo: 'stat-tiles' },
];
