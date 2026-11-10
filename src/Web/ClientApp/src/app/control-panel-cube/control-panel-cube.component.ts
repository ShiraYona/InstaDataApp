import { DecimalPipe, NgClass } from '@angular/common';
import { Component, Input, SimpleChanges, inject, OnChanges, OnInit, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlPanel } from '../shared/services/control-panel';
import { CubeMetric, CubeStatus } from '../shared/models/controlPanel/CubeMetric';

@Component({
  selector: 'app-control-panel-cube',
  standalone: true,
  imports: [DecimalPipe,NgClass],
  templateUrl: './control-panel-cube.component.html',
  styleUrl: './control-panel-cube.component.scss'
})
export class ControlPanelCubeComponent implements OnInit, OnChanges {
  private readonly controlPanel = inject(ControlPanel);
  private readonly router = inject(Router);

  readonly metrics = signal<CubeMetric[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  @Input() columns = 4;
  @Input() period: number | null = null;
  @Input() searchMetricName = '';

  readonly alertRule = output<string>();
  readonly target = output<string>();
  readonly drill = output<string>();

  /** מקור השינויים בפילטרים — debounce + switchMap מונעים בקשות כפולות ותשובות מיושנות */
  private readonly filter$ = new Subject<{ metricName: string; days: number | null }>();

  constructor() {
    this.filter$
      .pipe(
        debounceTime(300),
        switchMap(f => {
          this.loading.set(true);
          this.error.set(false);
          return this.controlPanel.getCards(f.metricName, f.days).pipe(
            catchError(() => {
              this.error.set(true);
              this.loading.set(false);
              return of([]);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe(rows => {
        this.metrics.set(
          rows.map(row => ({
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
            targetText: row.targetText ?? undefined
          }))
        );
        this.loading.set(false);
      });
  }

  ngOnInit(): void {
    this.pushFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['period'] || changes['searchMetricName']) {
      this.pushFilters();
    }
  }

  private pushFilters(): void {
    this.filter$.next({ metricName: this.searchMetricName, days: this.period });
  }

readonly detail = output<string>();

openDetails(key: string): void {
  this.detail.emit(key);
}

  goToDetail(id: number) { this.router.navigate(['/detailed-dialogue', id]); }

}
