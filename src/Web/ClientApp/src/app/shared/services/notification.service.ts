import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/** משך התצוגה של כל סוג הודעה (במילישניות) */
const LIFETIME = {
  success: 3000,
  info: 3000,
  warn: 5000,
  error: 4000
} as const;

const DEFAULT_SUMMARIES = {
  success: 'נשמר',
  info: 'עדכון',
  warn: 'לתשומת לב',
  error: 'שגיאה'
} as const;

type Severity = keyof typeof LIFETIME;


@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly messages = inject(MessageService);

  /** הודעת הצלחה — למשל "הנתון נוסף לקטלוג" */
  success(detail: string, summary: string = DEFAULT_SUMMARIES.success): void {
    this.show('success', summary, detail);
  }

  /** הודעת מידע — למשל תוצאת תצוגה מקדימה */
  info(detail: string, summary: string = DEFAULT_SUMMARIES.info): void {
    this.show('info', summary, detail);
  }

  /** אזהרה — משהו שהמשתמש צריך לדעת לפני שממשיך */
  warn(detail: string, summary: string = DEFAULT_SUMMARIES.warn): void {
    this.show('warn', summary, detail);
  }

  /** שגיאה עם נוסח מפורש — כשהמשתמש צריך לדעת בדיוק מה נכשל */
  error(detail: string, summary: string = DEFAULT_SUMMARIES.error): void {
    this.show('error', summary, detail);
  }

  /**
   * שגיאה שהגיעה מהשרת. הודעת השגיאה שהשרת מחזיר תועדף;
   * אם אין כזו (למשל תקלת רשת או תשובת 500 בלי גוף) — מוצג הנוסח החלופי.
   *
   * @param error השגיאה שנתפסה ב-catchError
   * @param fallback נוסח ברירת מחדל כשאין הודעת שגיאה מהשרת
   */
  errorFromServer(error: unknown, fallback: string): void {
    this.error(this.extractMessage(error) ?? fallback);
  }

  /** מעבירה הודעת שגיאה מהשרת למשתמש — לשימוש ב-catchError ישירות */
  handleHttpError(error: unknown, fallback: string): void {
    this.errorFromServer(error, fallback);
  }

  /** שולפת את הודעת השגיאה מהתשובה — מהודעה קצרה שהשרת כותב למשתמש */
  private extractMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse)) {
      return null;
    }

    const body: unknown = error.error;

    if (typeof body === 'string' && body.trim() !== '') {
      return body.trim();
    }

    if (body !== null && typeof body === 'object') {
      const candidate = body as Record<string, unknown>;
      // ProblemDetails של ASP.NET Core, וסגנון { message } / { detail } נפוץ
      for (const key of ['detail', 'message', 'title']) {
        const value = candidate[key];
        if (typeof value === 'string' && value.trim() !== '') {
          return value.trim();
        }
      }
    }

    return null;
  }

  private show(severity: Severity, summary: string, detail: string): void {
    this.messages.add({ severity, summary, detail, life: LIFETIME[severity] });
  }
}
