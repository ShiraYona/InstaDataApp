import { DecimalPipe } from '@angular/common';
import { Component, Input, computed, output, signal } from '@angular/core';

import { DetailedDialogueComponent } from '../detailed-dialogue/detailed-dialogue.component';

export type CubeStatus = 'ok' | 'warn' | 'danger';

export interface CubeMetric {
  key: string;
  title: string;
  icon: string;
  value: string;
  unit?: string;
  source: string;
  /** אחוז שינוי מול תקופה קודמת (השוואה נעשית בשרת) */
  trend: number;
  /** האם קיים בסיס להשוואה מול התקופה הקודמת */
  hasComparison?: boolean;
  trendPositive: boolean;
  status: CubeStatus;
  updated: boolean;
  targetText?: string;
}

@Component({
  selector: 'app-control-panel-cube',
  standalone: true,
  imports: [DecimalPipe, DetailedDialogueComponent],
  templateUrl: './control-panel-cube.component.html',
  styleUrl: './control-panel-cube.component.scss'
})
export class ControlPanelCubeComponent {

  /** נתוני דמה לתצוגה — יוחלפו בנתונים אמיתיים מהשרת */
  private readonly defaultMetrics: CubeMetric[] = [
    { key: 'item-1', title: 'פריט 1', icon: '🧾', value: '0', unit: 'פעולות', source: 'מקור: פריט 1', trend: 0, trendPositive: true, status: 'ok', updated: true },
    { key: 'item-2', title: 'פריט 2', icon: '₪', value: '₪0', source: 'מקור: פריט 2', trend: 0, trendPositive: true, status: 'ok', updated: true },
    { key: 'item-3', title: 'פריט 3', icon: '🏷', value: '0', unit: 'פעולות', source: 'מקור: פריט 3', trend: 0, trendPositive: true, status: 'ok', updated: false, targetText: 'יעד: 0 (0%)' },
    { key: 'item-4', title: 'פריט 4', icon: '⌂', value: '0', unit: 'פעולות', source: 'מקור: פריט 4', trend: 0, trendPositive: false, status: 'ok', updated: true },
    { key: 'item-5', title: 'פריט 5', icon: '⚖', value: '0', unit: 'פעולות', source: 'מקור: פריט 5', trend: 0, trendPositive: true, status: 'warn', updated: true },
    { key: 'item-6', title: 'פריט 6', icon: '◉', value: '0', unit: 'פעולות', source: 'מקור: פריט 6', trend: 0, trendPositive: true, status: 'ok', updated: true },
    { key: 'item-7', title: 'פריט 7', icon: '▤', value: '0', unit: 'פעולות', source: 'מקור: פריט 7', trend: 0, trendPositive: true, status: 'ok', updated: true },
    { key: 'item-8', title: 'פריט 8', icon: '⊞', value: '0', unit: 'פעולות', source: 'מקור: פריט 8', trend: 0, trendPositive: true, status: 'ok', updated: true }
  ];

  /** הנתון שחלון הפירוט פתוח עבורו — מחרוזת ריקה = החלון סגור */
  readonly detailsId = signal<string>('');

  /** הכרטיסים עצמם (לפי צבע/מיקום) — התבנית קוראת להם metrics */
  readonly metrics = this.defaultMetrics;

  /** מפתח נתון -> כותרת, לשימוש בחלון הפירוט */
  readonly titleById = computed(() => new Map(this.metrics.map(metric => [metric.key, metric.title])));

  /** מספר העמודות ברשת הכרטיסים */
  @Input() columns = 4;

  /** אירועים שהורים יכולים לקלוט מהכרטיסייה */
  readonly alertRule = output<string>();
  readonly target = output<string>();
  readonly drill = output<string>();

  /** פתיחת חלון הפירוט עבור נתון */
  openDetails(key: string): void {
    this.detailsId.set(key);
  }
}
