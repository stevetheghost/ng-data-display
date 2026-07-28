# ng-data-display

A showcase of reusable data-display components for Angular, built zoneless on Angular 21 with
Tailwind 4. Each route demos one component against the same sample dataset:

| Route          | Component          | Shows                                                             |
| -------------- | ------------------ | ----------------------------------------------------------------- |
| `/stat-tiles`  | `<app-stat-tile>`  | Headline number with a delta; `lowerIsBetter` flips the good direction |
| `/data-table`  | `<app-data-table>` | Sortable columns, `appCellTemplate` for custom cells, empty state  |
| `/card-grid`   | `<app-card-grid>`  | Scannable card layout over the same rows                          |

### Design notes

- `DataTable` owns sort order only — filtering lives with the page, so the same table backs any set
  of controls. Columns are config (`Column<T>`), and any column can opt out of text rendering with
  an `ng-template appCellTemplate="key"`.
- `StatusBadge` carries its meaning in text, not colour alone.
- State is signals throughout; `Metrics` exposes a signal-shaped surface so swapping the sample data
  for `httpResource` would not touch a single consumer.
- Accessibility is verified in the browser, not assumed: sortable headers expose `aria-sort`, the
  table has a caption and row headers, filters announce results via `aria-live`, and every text
  element on all three routes clears WCAG AA contrast.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.5.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
