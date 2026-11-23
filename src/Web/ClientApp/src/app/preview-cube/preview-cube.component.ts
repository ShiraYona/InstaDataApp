import { DecimalPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { MetricCard } from '../shared/models/controlPanel/MetricCard';
import { CubeMetric, CubeStatus } from '../shared/models/controlPanel/CubeMetric';

/**
 * קובייה לתצוגה מקדימה — מציגה כרטיס אחד בלבד מתוך נתוני הטופס.
 * אין קריאה לשרת; הכרטיס נבנה מהערכים שהמשתמש הזין.
 */
@Component({
  selector: 'app-preview-cube',
  standalone: true,
  imports: [DecimalPipe, CardModule, TagModule, ButtonModule, ChipModule],
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
  /** חומרת התג לפי המצב — הצבעים מגיעים מה-preset של PrimeNG */
  get statusSeverity(): 'success' | 'warn' | 'danger' {
    return this.metric?.status === 'warn' ? 'warn'
         : this.metric?.status === 'danger' ? 'danger'
         : 'success';
  }

  get statusLabel(): string {
    return this.metric?.status === 'warn' ? 'חריגה קלה'
         : this.metric?.status === 'danger' ? 'חריגה מסף'
         : 'ללא חריגה';
  }
  /** סימן ברירת מחדל כשהשרת לא מחזיר SignType — כמו money() בדמו */
  get signFallback(): string {
    return this.card?.signType ?? '₪';
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
