import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Button } from 'primeng/button';
import { ControlPanelCubeComponent } from '../control-panel-cube/control-panel-cube.component';
import { ControlPanelFiltersComponent, FilterState } from '../control-panel-filters/control-panel-filters.component';
import { DetailedDialogueComponent } from '../detailed-dialogue/detailed-dialogue.component';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [Button, RouterModule, DetailedDialogueComponent, ControlPanelCubeComponent, ControlPanelFiltersComponent],
  templateUrl: './control-panel.component.html',
  styleUrl: './control-panel.component.scss'
})
export class ControlPanelComponent {
  readonly detailKey = signal<string | null>(null);

  /** ערכי הסינון — cardsPerRow אינו נשמר כאן: הוא עובר ישירות מהפילטרים לקובייה */
  readonly period = signal<number | null>(null);
  readonly searchMetricName = signal<string>('');

  /** מספר הכרטיסים בשורה — מגיע מהשרת לפי נתוני המשתמש, ולכן אינו קשיח כאן */
  readonly cardsPerRow = signal<number | null>(null);

  onFiltersChanged(state: FilterState): void {
    this.period.set(state.period);
    this.searchMetricName.set(state.searchMetricName);
  }

  onCardsPerRowChanged(cardsPerRow: number | null): void {
    this.cardsPerRow.set(cardsPerRow);
  }

  openDetail(key: string): void {
    this.detailKey.set(key);
  }

  closeDetail(): void {
    this.detailKey.set(null);
  }
}
