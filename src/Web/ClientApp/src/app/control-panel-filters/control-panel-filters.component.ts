import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DataCatalogClient } from '../web-api-client';

/** אפשרות בתפריט בחירה (תקופה / כרטיסים בשורה). value = null מייצג "הכל" */
export interface FilterOption {
  label: string;
  value: number | null;
}

/** ערכי הסינון — נשלחים להורה בכל שינוי ובכל רענון */
export interface FilterState {
  period: number | null;
  cardsPerRow: number;
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
  /** שינוי סינון — ההורה מסנן מחדש את התצוגה */
  @Output() filtersChanged = new EventEmitter<FilterState>();

  @Output() refreshRequested = new EventEmitter<FilterState>();
  
  private readonly dataCatalogClient = inject(DataCatalogClient);
  
  period: number | null = null;
  cardsPerRow: number = 4;
  searchText = '';
 
  // readonly periodOptions: FilterOption[] = [
  //   { label: 'כל התקופה', value: null },
  //   { label: '7 ימים אחרונים', value: 7 },
  //   { label: '30 ימים אחרונים', value: 30 },
  //   { label: '90 ימים אחרונים', value: 90 }
  // ];
  /** תקופות החישוב — נטענות מהטבלה CTRL_CalculationDays */
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
  }


  onFilterChange(): void {
    this.filtersChanged.emit(this.currentState());
  }

  refresh(): void {
    // this.refreshRequested.emit(this.currentState());
    this.searchText = '';
    this.period = null
  }

  private currentState(): FilterState {
    return {
      period: this.period,
      cardsPerRow: this.cardsPerRow,
      searchText: this.searchText.trim()
    };
  }
}
