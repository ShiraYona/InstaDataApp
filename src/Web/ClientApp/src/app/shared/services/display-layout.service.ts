import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

interface DisplaySettingsDto {
  cardsPerRow: number;
}

export interface MetricSettingItem {
  metricId: number;
  metricName: string;
  iconCode: string | null;
  displayOrder: number | null;
  isVisible: boolean;
}

export interface MetricSettingsResponse {
  items: MetricSettingItem[];
}

@Injectable({ providedIn: 'root' })
export class DisplayLayoutService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = '/api/user-display-settings';

  private serverCardsPerRow: number | null = null;


  loadCardsPerRow(): Observable<number | null> {
    return this.http.get<DisplaySettingsDto>(this.apiUrl).pipe(
      map(dto => dto?.cardsPerRow ?? null),
      tap(value => {
        if (value !== null) {
          this.serverCardsPerRow = value;
        }
      }),
      catchError(() => of(this.serverCardsPerRow))
    );
  }

  saveCardsPerRow(cardsPerRow: number): Observable<void> {
    this.serverCardsPerRow = cardsPerRow;
    return this.http.put<void>(this.apiUrl, { cardsPerRow });
  }

  loadMetricSettings(): Observable<MetricSettingsResponse> {
    return this.http.get<MetricSettingsResponse>(`${this.apiUrl}/metrics`);
  }

  saveMetricSettings(items: MetricSettingItem[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/metrics`, { items });
  }
}
