import { Component, signal, computed, viewChild, ElementRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { AddingNewDataEntryComponent } from '../adding-new-data-entry/adding-new-data-entry.component';
import { ControlPanelCubeComponent } from '../control-panel-cube/control-panel-cube.component';
import { ControlPanelFiltersComponent, FilterState } from '../control-panel-filters/control-panel-filters.component';
import { DetailedDialogueComponent } from '../detailed-dialogue/detailed-dialogue.component';
import { MetricCard } from '../shared/models/controlPanel/MetricCard';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [
    Button,
    RouterModule,
    DetailedDialogueComponent,
    ControlPanelCubeComponent,
    ControlPanelFiltersComponent,
    AddingNewDataEntryComponent
  ],
  templateUrl: './control-panel.component.html',
  styleUrl: './control-panel.component.scss'
})
export class ControlPanelComponent {
  private readonly cube = viewChild(ControlPanelCubeComponent);

  /** אלמנט ה-DOM של הקובייה — ממנו מחפשים את מיכל הגלילה */
  private readonly cubeHost = viewChild(ControlPanelCubeComponent, { read: ElementRef<HTMLElement> });

  /** אלמנט ה-DOM של הסרגל הדביק — גובהו קובע את נקודת העצירה */
  private readonly filtersHost = viewChild(ControlPanelFiltersComponent, { read: ElementRef<HTMLElement> });

  readonly detailKey = signal<string | null>(null);

  /** הכרטיס שנבחר לפתיחת הפירוט — גיבוי לתצוגה אם הקריאה לשרת נכשלת */
  readonly detailCard = signal<MetricCard | null>(null);

  /** מצב פתיחת דיאלוג "נתון חדש" */
  readonly newDataVisible = signal<boolean>(false);

  /** טריגר לרענון הקובייה — עולה ב-1 בכל בקשת ריענון (כפתור הריענון או שמירה בדיאלוג) */
  readonly refreshToken = signal<number>(0);

  /** האם הקובייה מחשבת כעת — בזמן הזה כפתור הריענון disabled */
  readonly refreshing = computed(() => this.cube()?.refreshing() ?? false);

  /** ערכי הסינון — cardsPerRow אינו נשמר כאן: הוא עובר ישירות מהפילטרים לקובייה */
  readonly period = signal<number | null>(null);
  readonly searchMetricName = signal<string>('');

  /** מספר הכרטיסים בשורה — מגיע מהשרת לפי נתוני המשתמש, ולכן אינו קשיח כאן */
  readonly cardsPerRow = signal<number | null>(null);

  /** טווח התאריכים שמוחל גם על הפירוט — נגזר מהתקופה באותו אופן כמו בקובייה */
  readonly dateRange = computed(() => ControlPanelComponent.resolveRange(this.period()));

  /** בקשה ממתינה לגלילה — נגררת עד שהציור הבא יסתיים */
  private scrollPending = false;

  /**
   * גולל לראש הקובייה אחרי שהתצוגה התעדכנה.
   * לא תלוי בטעינה מהשרת: החיפוש מסונן מקומית ואינו שולח בקשה,
   * ואילו שינוי תקופה/כרטיסים מפעיל טעינה — ושניהם מגיעים לכאן.
   */
  private requestScroll(): void {
    this.scrollPending = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!this.scrollPending) return;
      this.scrollPending = false;
      this.scrollToCubeTop();
    }));
  }

  /** הקובייה סיימה טעינה — אם הנתונים הגיעו באיחור, הגלילה מתבצעת עכשיו */
  onCubeRefreshed(): void {
    this.requestScroll();
  }

  /** גולל לראש הכרטיסים, כך שהם נוחתים 8px מתחת לסרגל הסינונים הדביק */
  private scrollToCubeTop(): void {
    const cubeEl = this.cubeHost()?.nativeElement;
    if (!cubeEl) return;

    const startEl = (cubeEl.querySelector('.cube-cards') as HTMLElement | null) ?? cubeEl;
    const filtersHeight = this.filtersHost()?.nativeElement.getBoundingClientRect().height ?? 0;

    const container = this.getScrollContainer();
    // מיקום הכרטיסים ביחס לתוכן המיכל (ולא ביחס לחלון)
    const topInContainer =
      startEl.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;

    const target = Math.max(topInContainer - filtersHeight - 8, 0);
    container.scrollTo({ top: target, behavior: 'auto' });
  }

  /** מיכל הגלילה האמיתי — העמוד עצמו לא גולל, אלא `.page-contect` ש-overflow-y שלו auto */
  private getScrollContainer(): HTMLElement {
    let el: HTMLElement | null = this.cubeHost()?.nativeElement ?? null;
    while (el && el !== document.documentElement) {
      const overflowY = getComputedStyle(el).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') return el;
      el = el.parentElement;
    }
    return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
  }

  onFiltersChanged(state: FilterState): void {
    this.period.set(state.period);
    this.searchMetricName.set(state.searchMetricName);
    this.requestScroll();
  }

  /** הקלדה בשדה החיפוש — גלילה לראש הקובייה */
  onSearchQueryChanged(): void {
    this.requestScroll();
  }

  /**
   * טווח: [today - period, today].
   * ערך שלילי ("לפי מסנן הלוח") — ללא טווח, בדיוק כמו בקובייה;
   * אחרת נוצר טווח הפוך (מחר עד היום) שמסנן את כל הרשומות.
   */
  private static resolveRange(period: number | null): { from: string | null; to: string | null } {
    if (period == null || period < 0) return { from: null, to: null };
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - period);
    return { from: ControlPanelComponent.toIso(from), to: ControlPanelComponent.toIso(to) };
  }

  private static toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  onCardsPerRowChanged(cardsPerRow: number | null): void {
    this.cardsPerRow.set(cardsPerRow);
    this.requestScroll();
  }

  openDetail(card: MetricCard): void {
    this.detailCard.set(card);
    this.detailKey.set(card.key ?? null);
  }

  closeDetail(): void {
    this.detailKey.set(null);
    this.detailCard.set(null);
  }

  /** לחיצה על "ריענון" — שליפה מחדש מהשרת של כל הכרטיסים, בלי לשנות תצוגה */
  onRefreshRequested(): void {
    this.refreshToken.update(value => value + 1);
  }

  /** פתיחת דיאלוג יצירת נתון חדש */
  openNewDataDialog(): void {
    this.newDataVisible.set(true);
  }

  /** אחרי שמירה מוצלחת — סגירת הדיאלוג ורענון הקובייה */
  onDataSaved(_id: number): void {
    this.newDataVisible.set(false);
    this.refreshToken.update(value => value + 1);
  }
}
