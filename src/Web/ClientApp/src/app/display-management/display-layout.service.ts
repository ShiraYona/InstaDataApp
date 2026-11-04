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

/**
 * שמירה וטעינה של פריסת לוח הבקרה.
 *
 * - מספר הכרטיסים בשורה נשמר בשרת (טבלת CTRL_UserDisplaySettings) לפי מזהה המשתמש.
 * - סדר הכרטיסים ומצב ההצגה נשמרים בשרת (טבלת CTRL_UserMetricSettings) לפי מזהה המשתמש.
 */
@Injectable({ providedIn: 'root' })
export class DisplayLayoutService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = '/api/user-display-settings';

  /** הערך שנשמר לאחרונה מהשרת — משמש כגיבוי אם הקריאה נכשלה */
  private serverCardsPerRow: number | null = null;

  /**
   * טעינת מספר הכרטיסים בשורה מהשרת.
   * מחזיר null אם הקריאה נכשלה — הקורא יחיל את ברירת המחדל (4).
   */
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
    this.serverCardsPerRow = cardsPerRow;
    return this.http.put<void>(this.apiUrl, { cardsPerRow });
  }

  /**
   * שליפת כל הנתונים מהשרת, מסודרים לפי הסדר האישי של המשתמש.
   * נתונים שהמשתמש טרם סידר מופיעים בסוף, לפי CreatedDate יורד.
   */
  loadMetricSettings(): Observable<MetricSettingsResponse> {
    return this.http.get<MetricSettingsResponse>(`${this.apiUrl}/metrics`);
  }

  /**
   * שמירת סדר ונראות כל הנתונים בשרת (upsert).
   * שולחים את הרשימה המלאה — השרת מעדכן/יוצר שורה לכל פריט.
   */
  saveMetricSettings(items: MetricSettingItem[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/metrics`, { items });
  }
}
