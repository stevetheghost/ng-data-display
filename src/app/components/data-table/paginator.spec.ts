import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Paginator } from './paginator';

@Component({
  imports: [Paginator],
  template: `
    <app-paginator
      [pageIndex]="pageIndex()"
      [pageSize]="pageSize()"
      [total]="total()"
      [disabled]="disabled()"
      (pageIndexChange)="pageIndex.set($event)"
      (pageSizeChange)="pageSize.set($event)"
    />
  `,
})
class Host {
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly total = signal(57);
  readonly disabled = signal(false);
}

describe('Paginator', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  const buttonFor = (label: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(label))!;

  async function click(label: string): Promise<void> {
    buttonFor(label).click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('describes the current slice and page position', () => {
    expect(el.textContent).toContain('1–10 of 57');
    expect(el.textContent).toContain('Page 1 of 6');
  });

  it('shortens the range on the final, partial page', async () => {
    await click('Last page');

    expect(host.pageIndex()).toBe(5);
    expect(el.textContent).toContain('51–57 of 57');
  });

  it('steps one page at a time', async () => {
    await click('Next page');
    expect(host.pageIndex()).toBe(1);

    await click('Previous page');
    expect(host.pageIndex()).toBe(0);
  });

  it('disables backward controls on the first page', () => {
    expect(buttonFor('First page').disabled).toBe(true);
    expect(buttonFor('Previous page').disabled).toBe(true);
    expect(buttonFor('Next page').disabled).toBe(false);
  });

  it('disables every control while disabled', async () => {
    host.disabled.set(true);
    await fixture.whenStable();

    expect(buttonFor('Next page').disabled).toBe(true);
    expect(buttonFor('Last page').disabled).toBe(true);
  });

  it('reports a new page size without changing it itself', async () => {
    const select = el.querySelector('select')!;
    select.value = '25';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(host.pageSize()).toBe(25);
  });

  it('renders a position it was given past the end as the last page', async () => {
    host.pageIndex.set(99);
    await fixture.whenStable();

    expect(el.textContent).toContain('Page 6 of 6');
  });

  it('says so when there is nothing to page through', async () => {
    host.total.set(0);
    await fixture.whenStable();

    expect(el.textContent).toContain('No rows');
    expect(buttonFor('Next page').disabled).toBe(true);
  });

  it('names the region and its controls for assistive tech', () => {
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Pagination');
    expect(el.querySelector('label')?.textContent?.trim()).toBe('Rows per page');
    expect(buttonFor('Next page').querySelector('.sr-only')?.textContent).toBe('Next page');
  });
});
