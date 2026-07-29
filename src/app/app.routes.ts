import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'data-table' },
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
  { path: '**', redirectTo: 'data-table' },
];
