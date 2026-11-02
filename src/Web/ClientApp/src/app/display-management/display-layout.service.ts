import { Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

export interface DisplayLayout {
  cardsPerRow: number;
  /** מזהי הכרטיסים לפי הסדר הרצוי, כולל מוסתרים */
  order: number[];
  /** מזהי הכרטיסים המוצגים */
  visibleIds: number[];
}

/**
 * שמירה וטעינה של פריסת לוח הבקרה.
 * כרגע עובד מול localStorage; את החיבור לשרת מחליפים ב-saveToServer/loadFromServer.
 */
@Injectable({ providedIn: 'root' })
export class DisplayLayoutService {
  private readonly storageKey = 'display-layout';

  constructor(@Optional() private readonly http: HttpClient | null) {}

  /** שמירה — כרגע מקומית. כאן יחובר ה-HTTP POST בעתיד. */
  save(layout: DisplayLayout): Observable<DisplayLayout> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(layout));
    } catch {
      // אחסון לא זמין (מצב פרטי / מכסה) — לא מפילים את המסך
    }
    return of(layout);
  }

  /** טעינה — מחזיר null אם אין פריסה שמורה */
  load(): DisplayLayout | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? (JSON.parse(raw) as DisplayLayout) : null;
    } catch {
      return null;
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // מתעלמים
    }
  }

  /**
   * דוגמה לחיבור עתידי לשרת:
   * return this.http.post<DisplayLayout>('https://example.com/api/display-layout', layout);
   */
  protected saveToServer(layout: DisplayLayout): Observable<DisplayLayout> {
    if (!this.http) {
      return throwError(() => new Error('HttpClient לא זמין'));
    }
    return this.http.post<DisplayLayout>('https://example.com/api/display-layout', layout);
  }
}
