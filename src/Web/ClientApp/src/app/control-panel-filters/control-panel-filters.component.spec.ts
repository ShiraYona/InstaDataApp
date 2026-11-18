import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import { ControlPanelFiltersComponent } from './control-panel-filters.component';

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

  it('should emit a refresh request without changing period or search text', () => {
    spyOn(component.refreshRequested, 'emit');

    component.period = 7;
    component.searchMetricName = '  טקסט לדוגמה  ';

    component.refresh();

    expect(component.refreshRequested.emit).toHaveBeenCalledTimes(1);
    expect(component.period).toBe(7);
    expect(component.searchMetricName).toBe('  טקסט לדוגמה  ');
  });

  it('should ignore refresh clicks while a refresh is running', () => {
    spyOn(component.refreshRequested, 'emit');

    component.refreshing = true;
    component.refresh();

    expect(component.refreshRequested.emit).not.toHaveBeenCalled();
  });

  it('should disable the refresh button while refreshing', () => {
    component.refreshing = true;
    fixture.detectChanges();

    const button: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.refreshButton button');

    expect(button?.disabled).toBe(true);
  });

  it('should emit filtersChanged when a filter changes', () => {
    spyOn(component.filtersChanged, 'emit');

    component.cardsPerRow = 2;
    component.onFilterChange();

    expect(component.filtersChanged.emit).toHaveBeenCalledTimes(1);
  });
});
