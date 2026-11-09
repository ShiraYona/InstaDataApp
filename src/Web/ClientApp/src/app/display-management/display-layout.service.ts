import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

/** מבנה התשובה מה-API עבור מספר הכרטיסים בשורה */
interface DisplaySettingsDto {
  cardsPerRow: number;
}

/** פריט בודד של נתון בהגדרות המשתמש */
export interface MetricSettingItem {
  metricId: number;
  metricName: string;
  iconCode: string | null;
  displayOrder: number | null;
  isVisible: boolean;
}

/** תשובת ה-API לשליפת הנתונים */
export interface MetricSettingsResponse {
  items: MetricSettingItem[];
}

@Injectable({ providedIn: 'root' })
export class DisplayLayoutService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = '/api/user-display-settings';

  /** הערך שנשמר לאחרונה מהשרת — משמש כגיבוי אם הקריאה נכשלה */
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

  /** שמירת מספר הכרטיסים בשורה בשרת */
saveCardsPerRow(cardsPerRow: number): Observable<void> {
  return this.http.put<void>(this.apiUrl, { cardsPerRow }).pipe(
    tap(() => {
      this.serverCardsPerRow = cardsPerRow;
    })
  );
}

  loadMetricSettings(): Observable<MetricSettingsResponse> {
    return this.http.get<MetricSettingsResponse>(`${this.apiUrl}/metrics`);
  }

  saveMetricSettings(items: MetricSettingItem[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/metrics`, { items });
  }
}
