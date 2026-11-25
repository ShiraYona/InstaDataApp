import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { MetricCard } from '../shared/models/controlPanel/MetricCard';

export type CardTagSeverity = 'success' | 'warn' | 'danger';

@Component({
  selector: 'app-preview-cube',
  standalone: true,
  imports: [CardModule, TagModule, MessageModule, DecimalPipe],
  templateUrl: './preview-cube.component.html',
  styleUrl: './preview-cube.component.scss'
})
export class PreviewCubeComponent {
  @Input() card: MetricCard | null = null;
  /** מספר עמודות בכרטיס — 1 בתצוגה מקדימה של הדיאלוג */
  @Input() columns = 1;

  /** חומרת התג "סטטוס" — אותה מיפוי כמו בלוח הבקרה */
  get statusSeverity(): CardTagSeverity {
    switch (this.card?.status) {
      case 'ok':
        return 'success';
      case 'warn':
        return 'warn';
      default:
        return 'danger';
    }
  }

  /** הטקסט של תג הסטטוס */
  get statusLabel(): string {
    switch (this.card?.status) {
      case 'ok':
        return 'ללא חריגה';
      case 'warn':
        return '⚠ חריגה קלה';
      default:
        return '⚠ חריגה מסף';
    }
  }

  /** הטקסט של תג העדכון */
  get freshnessLabel(): string {
    return this.card?.updated ? '● מעודכן' : '◷ מידע ישן';
  }

  get freshnessSeverity(): CardTagSeverity {
    return this.card?.updated ? 'success' : 'warn';
  }
}
