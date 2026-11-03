import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import { ControlPanelFiltersComponent, FilterState } from './control-panel-filters.component';

describe('ControlPanelFiltersComponent', () => {
  let component: ControlPanelFiltersComponent;
  let fixture: ComponentFixture<ControlPanelFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlPanelFiltersComponent],
      providers: [
        provideNoopAnimations(),
        providePrimeNG({ theme: { preset: Aura } })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ControlPanelFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the refresh button with its label', () => {
    const actionBlock: HTMLElement | null = fixture.nativeElement.querySelector('.filter--action');
    expect(actionBlock).toBeTruthy();
    expect(actionBlock?.textContent?.trim()).toContain('רענון');
    expect(actionBlock?.querySelector('.refreshButton__label')?.textContent?.trim()).toBe('רענון');
  });

  it('should render a plain text input for "חיפוש נתון" (not a select)', () => {
    const searchBlock: HTMLElement | null = fixture.nativeElement.querySelector('.filter--search');
    expect(searchBlock).toBeTruthy();

    const label = searchBlock!.querySelector('label');
    expect(label?.textContent?.trim()).toBe('חיפוש נתון');

    const input = searchBlock!.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
    expect(searchBlock!.querySelector('p-select')).toBeNull();
  });

  it('should render the two select filters with their labels', () => {
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.filter--cards > label, .filter--period > label')
    ).map((el) => (el as HTMLElement).textContent?.trim());

    expect(labels).toEqual(['כרטיסים בשורה', 'תקופת נתונים']);
  });

  it('should lay the controls out in the demo order: period, cards, search, refresh', () => {
    const blocks = Array.from(
      fixture.nativeElement.querySelectorAll('.controlsPanel > .filter')
    ).map((el) => (el as HTMLElement).className.replace('filter ', '').trim());

    expect(blocks).toEqual(['filter--period', 'filter--cards', 'filter--search', 'filter--action']);
  });

  it('should keep the selected values in sync with the available options', () => {
    expect(component.cardsPerRowOptions.length).toBe(3);
    expect(component.periodOptions.length).toBe(4);
    expect(component.cardsPerRowOptions.map((o) => o.value)).toContain(component.cardsPerRow);
    expect(component.periodOptions.map((o) => o.value)).toContain(component.period);
  });

  it('should emit the current state on refresh, trimming the search text', () => {
    spyOn(component.refreshRequested, 'emit');

    component.period = 'month';
    component.cardsPerRow = '3';
    component.searchText = '  טקסט לדוגמה  ';

    component.refresh();

    expect(component.refreshRequested.emit).toHaveBeenCalledWith({
      period: 'month',
      cardsPerRow: '3',
      searchText: 'טקסט לדוגמה'
    } as FilterState);
  });

  it('should emit filtersChanged when a filter changes', () => {
    spyOn(component.filtersChanged, 'emit');

    component.cardsPerRow = '2';
    component.onFilterChange();

    expect(component.filtersChanged.emit).toHaveBeenCalledTimes(1);
  });
});
