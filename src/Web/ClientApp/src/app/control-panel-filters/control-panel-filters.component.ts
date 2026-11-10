import { Component, DestroyRef, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DataCatalogClient } from '../web-api-client';
import { DisplayLayoutService } from '../shared/services/display-layout.service';

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

  @Output() refreshRequested = new EventEmitter<FilterState>();

  @Output() cardsPerRowChanged = new EventEmitter<number | null>();

  private readonly dataCatalogClient = inject(DataCatalogClient);
  private readonly layoutService = inject(DisplayLayoutService);
  private readonly destroyRef = inject(DestroyRef);

  period: number | null = null;
  cardsPerRow: number = DEFAULT_CARDS_PER_ROW;
  private savedCardsPerRow: number | null = null;
  searchMetricName = '';
 
   periodOptions: FilterOption[] = [
    { label: 'כל התקופה', value: null }
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
          { label: 'כל התקופה', value: null },
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
  }


  onFilterChange(): void {
    this.cardsPerRowChanged.emit(this.cardsPerRow);
    this.filtersChanged.emit(this.currentState());
  }

  refresh(): void {
    this.searchMetricName = '';
    this.period = null;

    if (this.savedCardsPerRow !== null) {
      this.cardsPerRow = this.savedCardsPerRow;
    }

    this.onFilterChange();
    this.refreshRequested.emit(this.currentState());
  }

  private currentState(): FilterState {
    return {
      period: this.period,
      cardsPerRow: this.cardsPerRow,
      searchMetricName: this.searchMetricName.trim()
    };
  }
}
