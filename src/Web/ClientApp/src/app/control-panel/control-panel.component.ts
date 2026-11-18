import { Component, signal, computed, viewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { AddingNewDataEntryComponent } from '../adding-new-data-entry/adding-new-data-entry.component';
import { ControlPanelCubeComponent } from '../control-panel-cube/control-panel-cube.component';
import { ControlPanelFiltersComponent, FilterState } from '../control-panel-filters/control-panel-filters.component';
import { DetailedDialogueComponent } from '../detailed-dialogue/detailed-dialogue.component';
import { AddingNewDataEntryComponent } from '../adding-new-data-entry/adding-new-data-entry.component';
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

  onFiltersChanged(state: FilterState): void {
    this.period.set(state.period);
    this.searchMetricName.set(state.searchMetricName);
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
  }

  openDetail(card: MetricCard): void {
    this.detailCard.set(card);
    this.detailKey.set(card.key ?? null);
  }

  closeDetail(): void {
    this.detailKey.set(null);
    this.detailCard.set(null);
  }

  /** פתיחת הדיאלוג ליצירת נתון חדש */
  openNewData(): void {
    this.newDataVisible.set(true);
  }

  /** לחיצה על "ריענון" — שליפה מחדש מהשרת של כל הכרטיסים, בלי לשנות תצוגה */
  onRefreshRequested(): void {
    this.refreshToken.update(value => value + 1);
  }

  /** אחרי שמירה מוצלחת — הקובייה מרעננת את הנתונים שלה */
  onNewDataSaved(): void {
    this.refreshToken.update(value => value + 1);
  }

  newDataVisible = false;

  openNewDataDialog(): void {
    this.newDataVisible = true;
  }

  onDataSaved(_id: number): void {
    this.newDataVisible = false;
  }

  newDataVisible = false;

  openNewDataDialog(): void {
    this.newDataVisible = true;
  }

  onDataSaved(_id: number): void {
    this.newDataVisible = false;
  }
}
