import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/** סוגי הודעה נתמכים — תואמים את סוגי ה-toast של PrimeNG */
export type NotificationSeverity = 'success' | 'info' | 'warn' | 'error';

/**
 * עטיפה דקה על MessageService של PrimeNG.
 * הרכיבים תלויים בממשק הזה ולא ב-PrimeNG ישירות,
 * כך שאפשר להחליף את מנגנון ההודעות בלי לגעת ברכיבים.
 *
 * דורש <p-toast /> פעם אחת באפליקציה (ב-AppComponent).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly messages = inject(MessageService);

  success(detail: string, summary = 'הצלחה'): void {
    this.show('success', summary, detail);
  }

  error(detail: string, summary = 'שגיאה'): void {
    this.show('error', summary, detail);
  }

  info(detail: string, summary = 'מידע'): void {
    this.show('info', summary, detail);
  }

  warn(detail: string, summary = 'אזהרה'): void {
    this.show('warn', summary, detail);
  }

  private show(severity: NotificationSeverity, summary: string, detail: string): void {
    this.messages.add({ severity, summary, detail, life: 4000 });
  }
}
