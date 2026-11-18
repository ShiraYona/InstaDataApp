import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';

interface DisplaySettingsDto {
  cardsPerRow: number;
}

interface DisplayPeriodDto {
  periodDays: number;
}

interface UserIdDto {
  id: string | null;
}

const DEFAULT_PERIOD_DAYS = 30;

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

  /** מזהה המשתמש המחובר — מוצג כאות בעיגול הכותרת העליונה */
  loadUserId(): Observable<string | null> {
    return this.http.get<UserIdDto>(`${this.apiUrl}/me`).pipe(
      map(dto => dto?.id ?? null),
      catchError(() => of(null))
    );
  }

  saveCardsPerRow(cardsPerRow: number): Observable<void> {
    this.serverCardsPerRow = cardsPerRow;
    return this.http.put<void>(this.apiUrl, { cardsPerRow });
  }

  /** מספר הימים של "תקופת נתונים"; ברירת מחדל 30 כשאין הגדרה */
  loadPeriod(): Observable<number> {
    return this.http.get<DisplayPeriodDto>(`${this.apiUrl}/period`).pipe(
      map(dto => dto?.periodDays ?? DEFAULT_PERIOD_DAYS),
      catchError(() => of(DEFAULT_PERIOD_DAYS))
    );
  }

  /** שמירת "תקופת נתונים" לפי מספר ימים */
  savePeriod(days: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/period`, { days });
  }

  loadMetricSettings(): Observable<MetricSettingsResponse> {
    return this.http.get<MetricSettingsResponse>(`${this.apiUrl}/metrics`);
  }

  saveMetricSettings(items: MetricSettingItem[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/metrics`, { items });
  }
}
