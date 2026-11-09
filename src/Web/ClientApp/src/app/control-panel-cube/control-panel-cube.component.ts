import { DecimalPipe, NgClass } from '@angular/common';
import { Component, Input, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ControlPanel } from '../shared/services/control-panel';
import { CubeMetric, CubeStatus } from '../shared/models/controlPanel/CubeMetric';

@Component({
  selector: 'app-control-panel-cube',
  standalone: true,
  imports: [DecimalPipe,NgClass],
  templateUrl: './control-panel-cube.component.html',
  styleUrl: './control-panel-cube.component.scss'
})
export class ControlPanelCubeComponent {
  private readonly controlPanel = inject(ControlPanel);
  private readonly router = inject(Router);

  readonly metrics = signal<CubeMetric[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  @Input() columns = 4;

  readonly alertRule = output<string>();
  readonly target = output<string>();
  readonly drill = output<string>();

  constructor() {
    this.loadCards();
  }

  private loadCards(): void {
    this.loading.set(true);
    this.error.set(false);
    this.controlPanel.getCards().subscribe({
      next: rows => {
        this.metrics.set(
          rows.map(row => ({
            key: row.key ?? '',
            title: row.title ?? '',
            icon: row.icon ?? '',
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
            targetText: row.targetText ?? undefined
          }))
        );
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  openDetails(key: string): void {
    this.router.navigate(['/detailed-dialogue', key]);
  }
  goToDetail(id: number) { this.router.navigate(['/detailed-dialogue', id]); }

}
