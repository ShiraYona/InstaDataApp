import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

/** אפשרות לתפריטי הבחירה */
export interface FilterOption {
  label: string;
  value: string;
}

/** ערכי הסינון הנוכחיים — נשלחים להורה בעת שינוי או רענון */
export interface FilterState {
  period: string;
  cardsPerRow: string;
  searchText: string;
}

@Component({
  selector: 'app-control-panel-filters',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './control-panel-filters.component.html',
  styleUrl: './control-panel-filters.component.scss'
})
export class ControlPanelFiltersComponent {
  /** נשלח בכל שינוי סינון ובכל לחיצה על "רענון" */
  @Output() filtersChanged = new EventEmitter<FilterState>();
  @Output() refreshRequested = new EventEmitter<FilterState>();

  /** ברירת המחדל זהה לזו שבמערכת הניהול והבקרה: "כל התקופה" */
  period: string = 'all';
  cardsPerRow: string = '4';
  searchText: string = '';

  /** תקופות הנתונים — תואמות ל-state.period של מערכת הניהול והבקרה */
  readonly periodOptions: FilterOption[] = [
    { label: 'כל התקופה', value: 'all' },
    { label: '7 ימים אחרונים', value: 'week' },
    { label: '30 ימים אחרונים', value: 'month' },
    { label: '90 ימים אחרונים', value: 'quarter' }
  ];

  /** מספר הכרטיסים בשורה — תואם ל-state.cols (2 / 3 / 4) */
  readonly cardsPerRowOptions: FilterOption[] = [
    { label: '2 כרטיסים', value: '2' },
    { label: '3 כרטיסים', value: '3' },
    { label: '4 כרטיסים', value: '4' }
  ];

  private get state(): FilterState {
    return {
      period: this.period,
      cardsPerRow: this.cardsPerRow,
      searchText: this.searchText.trim()
    };
  }

  onFilterChange(): void {
    this.filtersChanged.emit(this.state);
  }

  refresh(): void {
    this.refreshRequested.emit(this.state);
    this.filtersChanged.emit(this.state);
  }
}
