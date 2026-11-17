import { DecimalPipe, NgClass } from '@angular/common';
import { Component, Input, SimpleChanges, inject, OnChanges, OnInit, output, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlPanel } from '../shared/services/control-panel';
import { CubeMetric, CubeStatus } from '../shared/models/controlPanel/CubeMetric';
import { MetricCard } from '../shared/models/controlPanel/MetricCard';

/** נירמול טקסט לחיפוש: בלי רווחי קצה, באותיות קטנות — כדי ש-A/a יימצאו אותו דבר */
function normalizeSearch(text: string | null | undefined): string {
  return (text ?? '').trim().toLowerCase();
}

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

  /** כל הכרטיסים מהשרת — הבסיס לסינון המקומי */
  private readonly allMetrics = signal<CubeMetric[]>([]);

  /** טקסט החיפוש — מגיע מהפילטרים, ומסנן את הכרטיסים בזיכרון */
  private readonly searchTerm = signal('');

  /** הכרטיסים המוצגים — מסוננים אוטומטית בכל שינוי ברשימה או בחיפוש */
  readonly metrics = computed(() => {
    const q = normalizeSearch(this.searchTerm());
    const rows = this.allMetrics();
    return q ? rows.filter(r => normalizeSearch(r.title).includes(q)) : rows;
  });

  readonly loading = signal(true);
  readonly error = signal(false);
  @Input() columns = 4;
  @Input() period: number | null = null;
  @Input() searchMetricName = '';

  /** טריגר לרענון — כל שינוי בערך שולח בקשה חדשה לשרת */
  @Input() refreshToken = 0;

  readonly alertRule = output<string>();
  readonly target = output<string>();
  readonly drill = output<string>();

  /** מקור השינויים בפילטרים — debounce + switchMap מונעים בקשות כפולות ותשובות מיושנות */
  private readonly filter$ = new Subject<number | null>();          // מה שנשלף מהשרת

  constructor() {
    this.filter$
      .pipe(
        debounceTime(300),
        switchMap(period => {
          this.loading.set(true);
          this.error.set(false);
          return this.controlPanel.getCards(period).pipe(
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
        this.allMetrics.set(rows.map(row => this.toCubeMetric(row)));  // כל הכרטיסים
        this.loading.set(false);
      });
  }

  

  ngOnInit(): void {
    this.pushFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['period'] || changes['refreshToken']) {
      this.pushFilters();
    }
    if (changes['searchMetricName']) {
      this.searchTerm.set(this.searchMetricName ?? '');
    }
  }

  private pushFilters(): void {
    this.filter$.next(this.period);
  }

  readonly detail = output<string>();



  openDetails(key: string): void {
    this.detail.emit(key);
  }

  goToDetail(id: number) { 
    this.router.navigate(['/detailed-dialogue', id]); 
  }

    /** מיפוי DTO מהשרת למודל התצוגה של הקובייה */
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
      targetText: row.targetText ?? undefined
    };
  }

}
