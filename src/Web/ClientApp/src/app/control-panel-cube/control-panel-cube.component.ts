import { DecimalPipe, NgClass } from '@angular/common';
import { Component, Input, SimpleChanges, inject, OnChanges, OnInit, output, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap, timeout } from 'rxjs/operators';
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
  @Input() period: number = 30;
   @Input() fromDate: string | null = null;
  @Input() toDate: string | null = null;
  @Input() searchMetricName = '';

  /** טריגר לרענון — כל שינוי בערך שולח בקשה חדשה לשרת */
  @Input() refreshToken = 0;

  readonly alertRule = output<string>();
  readonly target = output<string>();
  readonly drill = output<string>();

  /** מקור השינויים בפילטרים — debounce + switchMap מונעים בקשות כפולות ותשובות מיושנות */
  private readonly filter$ = new Subject<{ period: number | null ; fromDate: string | null; toDate: string | null }>();

  constructor() {
    this.filter$
      .pipe(
        debounceTime(300),
        switchMap(f => {
          this.loading.set(true);
          this.error.set(false);
          return this.controlPanel.getCards(f.period, f.fromDate, f.toDate).pipe(
            timeout(60000),
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
    if (changes['period'] || changes['fromDate'] || changes['toDate'] || changes['refreshToken']) {
      this.pushFilters();
    }
    if (changes['searchMetricName']) {
      this.searchTerm.set(this.searchMetricName ?? '');
    }
  }

  private pushFilters(): void {
    const { from, to } = this.resolveRange();
    this.filter$.next({ period: this.period, fromDate: from, toDate: to });
  }

  /** טווח: בחירה ידנית אם קיימת, אחרת [today - period, today] */
  private resolveRange(): { from: string | null; to: string | null } {
    if (this.fromDate && this.toDate) {
      return { from: this.fromDate, to: this.toDate };
    }
    if (this.period == null || this.period < 0) {
      return { from: null, to: null };
    }
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - this.period);
    return { from: this.toIso(from), to: this.toIso(to) };
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** "נסה שוב" — מפעיל מחדש את החישוב (השליפה שולפת את כל הכרטיסים, כי זו קריאת השרת) */
  retry(): void {
    this.pushFilters();
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
