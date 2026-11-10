import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

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

      const validation = this.extractValidationMessages(candidate['errors']);
      if (validation !== null) {
        return validation;
      }

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

  private extractValidationMessages(errors: unknown): string | null {
    if (errors === null || typeof errors !== 'object') {
      return null;
    }

    const messages: string[] = [];

    for (const value of Object.values(errors as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && item.trim() !== '') {
            messages.push(item.trim());
          }
        }
      } else if (typeof value === 'string' && value.trim() !== '') {
        messages.push(value.trim());
      }
    }

    const distinct = [...new Set(messages)];
    return distinct.length > 0 ? distinct.join(' · ') : null;
  }

  private show(severity: Severity, summary: string, detail: string): void {
    this.messages.add({ severity, summary, detail, life: LIFETIME[severity], styleClass: 'demoToast' });
  }
}
