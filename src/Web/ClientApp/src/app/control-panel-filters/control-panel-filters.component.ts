import { Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DataCatalogClient } from '../web-api-client';
import { DisplayLayoutService } from '../shared/services/display-layout.service';
import { Router } from '@angular/router';

const DEFAULT_CARDS_PER_ROW = 4;

export interface FilterOption {
  label: string;
  value: number | null;
}

export interface FilterState {
  period: number | null;
  cardsPerRow: number | null;
  searchMetricName: string;
}

@Component({
  selector: 'app-control-panel-filters',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './control-panel-filters.component.html',
  styleUrl: './control-panel-filters.component.scss'
})
export class ControlPanelFiltersComponent implements OnInit {
  /** שינוי סינון — ההורה מסנן מחדש את התצוגה */
  @Output() filtersChanged = new EventEmitter<FilterState>();

  /** בקשת ריענון — ההורה מפעיל שליפה מחדש מהשרת של כל הכרטיסים */
  @Output() refreshRequested = new EventEmitter<void>();

  /** החישוב ברקע — בזמן הזה כפתור הריענון מוצג disabled (סעיף 6.2.5.6) */
  @Input() refreshing = false;

  @Output() cardsPerRowChanged = new EventEmitter<number | null>();
  @Output() layoutManagementRequested = new EventEmitter<void>();

  private readonly dataCatalogClient = inject(DataCatalogClient);
  private readonly layoutService = inject(DisplayLayoutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  period: number = 30;
  private savedPeriod: number = 30;
  cardsPerRow: number = DEFAULT_CARDS_PER_ROW;
  private savedCardsPerRow: number | null = null;
  searchMetricName = '';
 
   periodOptions: FilterOption[] = [
  ];
  readonly cardsPerRowOptions: FilterOption[] = [
    { label: '2 כרטיסים', value: 2 },
    { label: '3 כרטיסים', value: 3 },
    { label: '4 כרטיסים', value: 4 }
  ];
    ngOnInit(): void {
    this.dataCatalogClient.getCalculationDays().subscribe({
           next: days => {
        this.periodOptions = [
          ...days
            .filter(d => d.value != null && d.name != null)
            .map(d => ({ label: d.name!, value: d.value! }))
        ];
      },

      error: () => { /* נשארת רק "כל התקופה" */ }
    });

    this.layoutService
      .loadCardsPerRow()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        this.savedCardsPerRow = value ?? DEFAULT_CARDS_PER_ROW;
        this.cardsPerRow = this.savedCardsPerRow;
        this.onFilterChange();
      });

    // תקופת נתונים של המשתמש — ברירת מחדל 30 כשאין הגדרה
    this.layoutService
      .loadPeriod()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(days => {
        this.savedPeriod = days;
        this.period = days;
        this.onFilterChange();
      });
  }


  onFilterChange(): void {
    // שינוי "תקופת נתונים" נשמר לשרת מיד
    if (this.period !== this.savedPeriod) {
      this.savedPeriod = this.period;
      this.layoutService
        .savePeriod(this.period)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ error: () => { /* נשמור להזדמנות הבאה */ } });
    }

    this.cardsPerRowChanged.emit(this.cardsPerRow);
    this.filtersChanged.emit(this.currentState());
  }

  refresh(): void {
    // ריענון אינו משנה הגדרות תצוגה, תקופה או טקסט חיפוש — רק מפעיל שליפה מחדש מהשרת
    if (this.refreshing) return;
    this.refreshRequested.emit();
  }

  private currentState(): FilterState {
    return {
      period: this.period,
      cardsPerRow: this.cardsPerRow,
      searchMetricName: this.searchMetricName.trim()
    };
  }
}
