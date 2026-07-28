import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders a link for every showcase page', async () => {
    const el = await render();
    const links = el.querySelectorAll('nav a');

    expect(links.length).toBe(4);
    expect(el.textContent).toContain('Stat tiles');
    expect(el.textContent).toContain('Data table');
    expect(el.textContent).toContain('Data list');
    expect(el.textContent).toContain('Card grid');
  });

  it('offers a skip link to the main landmark', async () => {
    const el = await render();

    expect(el.querySelector('a[href="#main"]')).toBeTruthy();
    expect(el.querySelector('main')?.id).toBe('main');
  });

  it('names the navigation landmark', async () => {
    const el = await render();

    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Component showcase');
  });
});
