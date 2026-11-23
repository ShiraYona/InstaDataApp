import { DecimalPipe, NgClass } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { MetricCard } from '../shared/models/controlPanel/MetricCard';
import { CubeMetric, CubeStatus } from '../shared/models/controlPanel/CubeMetric';

/**
 * קובייה לתצוגה מקדימה — מציגה כרטיס אחד בלבד מתוך נתוני הטופס.
 * אין קריאה לשרת; הכרטיס נבנה מהערכים שהמשתמש הזין.
 */
@Component({
  selector: 'app-preview-cube',
  standalone: true,
  imports: [DecimalPipe, NgClass],
  templateUrl: './preview-cube.component.html',
  styleUrl: './preview-cube.component.scss'
})
export class PreviewCubeComponent {
  /** הכרטיס316 שמוצג — ההורה (adding-new-data-entry) בונה אותו */
  @Input() card: MetricCard | null = null;

  /** מספר עמודות ברשת — כברירת מחדל 1, כי יש כרטיס אחד בלבד */
  @Input() columns = 1;

  /** המרה לפורמט התצוגה של הקובייה */
  get metric(): CubeMetric | null {
    return this.card ? this.toCubeMetric(this.card) : null;
  }

  private toCubeMetric(row: MetricCard): CubeMetric {
    return {
      key: row.key ?? '',
      title: row.title ?? '',
      icon: row.icon?.trim() || 'pi pi-question-circle',
      value: row.value ?? '',
      unit: row.unit ?? undefined,
      source: row.source ?? '',
      trend: row.trend ?? 0,
      hasComparison: row.hasComparison,
      trendPositive: row.trendPositive ?? false,
      status: (row.status ?? 'ok') as CubeStatus,
      updated: row.updated ?? false,
      groupFieldLabel: row.groupFieldLabel ?? undefined,
      groupValue: row.groupValue ?? undefined,
      groups: row.groups ?? undefined,
      signType: row.signType ?? undefined,
      targetText: row.targetText ?? undefined,
      isError: row.isError
    };
  }
}
