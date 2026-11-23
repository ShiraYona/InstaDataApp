import { Component, inject, signal, computed, Input, output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MetricDetail, SystemGroup } from '../shared/models/controlPanel/MetricDetail';
import { ControlPanel } from '../shared/services/control-panel';
import { of, Subject } from 'rxjs';
import { catchError, switchMap, timeout } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MetricCard } from '../shared/models/controlPanel/MetricCard';

@Component({
  selector: 'app-detailed-dialogue',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './detailed-dialogue.component.html',
  styleUrl: './detailed-dialogue.component.scss'
})
export class DetailedDialogueComponent implements OnInit, OnChanges {
  private readonly api = inject(ControlPanel);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly _metricKey = signal('');
  readonly metricKeyValue = this._metricKey.asReadonly();

  @Input({ required: true })
  set metricKey(v: string) {
    this._metricKey.set(v);
    // הטעינה מתבצעת ב-ngOnInit: בזמן ה-setter שאר הקלטים (טווח התאריכים) עדיין לא הוזנו
  }
/** הכרטיס מהמסך הראשי — משמש כגיבוי כשהפירוט נכשל */
@Input() card: MetricCard | null = null;

/** טווח התאריכים מהמסך הראשי — אותו טווח שחל על הקוביות, חל גם על הפירוט */
@Input() fromDate: string | null = null;
@Input() toDate: string | null = null;

  /** מקור בקשות הפירוט — switchMap מבטל בקשה קודמת, כך שתשובה איטית של בחירה ישנה לא תדרוס את החדשה */
  private readonly loadRequest$ = new Subject<{ key: string; groupValue: string | null }>();

  constructor() {
    this.loadRequest$
      .pipe(
        switchMap(({ key, groupValue }) =>
          this.api.getDetails(key, null, groupValue, this.search(), this.fromDate, this.toDate).pipe(
            timeout(60000),
            catchError(() => {
              this.failed.set(true);
              this.endLoading();
              return of(null);
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(d => {
        // d === null — הבקשה נכשלה: משאירים את הפירוט הקודם במקומו
        if (d === null) return;
        this.detail.set(d);
        this.endLoading();
      });
  }

  ngOnInit(): void {
    const key = this._metricKey();
    if (key) this.load(key);
    // הטווח המחושב ב-ngOnInit — ngOnChanges הראשון אחריו נחשב לטעינה הראשונה ולא לרענון
    this.lastLoadedRange = `${this.fromDate}|${this.toDate}`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    const key = this._metricKey();
    if (!key) return;
    const from = changes['fromDate'];
    const to = changes['toDate'];
    // טעינה ראשונה מתבצעת ב-ngOnInit. אחריה — כל שינוי טווח מרענן,
    // ובפרט מעבר מ-null לערך אמיתי כשהתקופה נטענת מהשרת אחרי פתיחת החלון
    if (from?.firstChange || to?.firstChange) return;
    if (!from && !to) return;
    // אותו טווח שכבר נטען (למשל כפל ngOnChanges/ngOnInit) — לא שולחים בקשה כפולה
    const range = `${this.fromDate}|${this.toDate}`;
    if (range === this.lastLoadedRange) return;
    this.lastLoadedRange = range;
    this.load(key);
  }

  readonly closed = output<void>();

  readonly detail = signal<MetricDetail | null>(null);
  readonly loading = signal(false);
  /** טעינת רשומות בלבד (בחירת קבוצה / חיפוש) — הטבלה נשארת במקומה ומעומעמת, במקום להתחלף ב"טוען" */
  readonly recordsLoading = signal(false);
  readonly failed = signal(false);
  readonly search = signal('');
  readonly selectedGroup = signal<string | null>(null);

  // ---- ייצוא ----
  readonly exporting = signal(false);
  readonly exportError = signal<string | null>(null);
  private searchTimer?: ReturnType<typeof setTimeout>;

  // ---- מיון ודפדוף ----
  readonly sortKey = signal<string | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly pageIndex = signal(0);
  readonly pageSize = 25;

  /** הטווח של הבקשה האחרונה — מונע בקשה כפולה על אותו טווח */
  private lastLoadedRange: string | null = null;

  /**
   * rowsOnly — מעבר בין קבוצות / חיפוש: רק תוכן טבלת הרשומות מוחלף.
   * שאר הדיאלוג (סיכום, טבלת הקבוצות) נשאר קפוא, כדי שלא ייראה כמו טעינה מחדש של כל החלון.
   */
  private load(key: string, groupValue: string | null = null, resetGroup = true, rowsOnly = false): void {
    if (rowsOnly) {
      this.recordsLoading.set(true);
    } else {
      this.loading.set(true);
      this.failed.set(false);
    }
    if (resetGroup) this.selectedGroup.set(groupValue);
    this.pageIndex.set(0);
    this.loadRequest$.next({ key, groupValue });
  }

  private endLoading(): void {
    this.loading.set(false);
    this.recordsLoading.set(false);
  }

  readonly systems = computed<SystemGroup[]>(() => {
    const fromDetail = this.detail()?.systems;
    if (fromDetail?.length) return fromDetail;
    // גיבוי מהכרטיס הראשי כשהפירוט לא נטען
    return (this.card?.groups ?? []).map(g => ({
      sourceId: 0,
      sourceName: g.value || '—',
      groupValue: g.value,
      records: g.records,
      totalValue: g.totalValue ?? null
    }));
  });

 // האם יש שדה קיבוץ. התווית עצמה אינה תלויה בשדה — היא תמיד "מערכת",
 // אבל עצם קיומו של הקיבוץ קובע אם טבלת החלוקה מוצגת בכלל
 readonly hasGroupField = computed(() =>
  this.detail()?.groupFieldName ? true : (!this.detail() && !!this.card?.groupField)
);

 // טבלת הקבוצות מוצגת רק כשיש שדה קיבוץ — בהיעדרו אינה מוצגת כלל
 readonly hasGrouping = computed(() => this.hasGroupField());
  /** כל העמודות שהשרת החזיר — הבסיס לייצוא (שם נשארות כל העמודות) */
  private readonly allColumns = computed(() =>
    (this.detail()?.columns ?? []).map(c => ({ key: c.fieldName, label: c.label, dataType: c.dataType }))
  );

  /** לתצוגה מוסרים לכל היותר שתי העמודות האחרונות (התאריך ועמודת העזר שלידו) */
  readonly columns = computed(() => {
    const cols = this.allColumns();
    return cols.length > 2 ? cols.slice(0, -2) : cols;
  });
  readonly totalRecords = computed(() => this.detail()?.totalRecords ?? 0);
  readonly totalValue = computed(() => this.detail()?.totalValue ?? null);
  // COUNT מזוהה לפי סוג החישוב עצמו (calcType); SignType נשמר כגיבוי בלבד
  readonly isCount = computed(() => {
    const d = this.detail();
    const calc = (d?.calcType ?? d?.signType ?? '').trim().toUpperCase();
    return calc === 'COUNT';
  });

    /** אין נתונים להצגה — לא נטענו רשומות, אין ערך, ואין קבוצות עם רשומות */
  readonly noData = computed(() => {
    const d = this.detail();
    if (this.loading()) return false;
    if ((d?.records?.length ?? 0) > 0) return false;
    if ((d?.totalRecords ?? 0) > 0) return false;
    const hasGroups = this.systems().some(g => (g.records ?? 0) > 0);
    if (hasGroups) return false;
    return true;
  });

readonly summary = computed(() => {
  const d = this.detail();
  const c = this.card;
  return [
    { key: 'value',   label: 'ערך הנתון',   value: d?.dataValue   || c?.value   || '—' },
    { key: 'records', label: 'רשומות',       value: String(d?.totalRecords ?? 0) },
    { key: 'source',  label: 'מקור נתונים', value: d?.sourceName  || c?.source     || '—' },
  ];
});

  // חיפוש רק על העמודות המותרות להצגה
  readonly filteredRecords = computed(() => {
    const q = this.search().trim().toLowerCase();
    const rows = this.detail()?.records ?? [];
    if (!q) return rows;
    const keys = this.columns().map(c => c.key);
    return rows.filter(r => keys.some(k => String(r[k] ?? '').toLowerCase().includes(q)));
  });

  readonly sortedRecords = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;
    if (!key) return this.filteredRecords();
    const type = this.columns().find(c => c.key === key)?.dataType ?? 'string';
    return [...this.filteredRecords()].sort((a, b) => {
      const va = a[key], vb = b[key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (type === 'number' || type === 'decimal' || type === 'int') return (Number(va) - Number(vb)) * dir;
      if (type === 'date' || type === 'datetime') return (new Date(va as string).getTime() - new Date(vb as string).getTime()) * dir;
      return String(va).localeCompare(String(vb), 'he') * dir;
    });
  });

  readonly totalItems = computed(() => this.sortedRecords().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize)));
  readonly pageRows = computed(() => {
    const start = this.pageIndex() * this.pageSize;
    return this.sortedRecords().slice(start, start + this.pageSize);
  });

  showRecords(row: SystemGroup): void {
    this.selectedGroup.set(row.groupValue ?? null);
    this.load(this._metricKey(), row.groupValue ?? null, false, true);
  }

  clearGroup(): void {
    this.selectedGroup.set(null);
    this.load(this._metricKey(), null, false, true);
  }

  onSearch(v: string): void {
    this.search.set(v);
    this.pageIndex.set(0);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(this._metricKey(), this.selectedGroup(), false, true), 350);
  }

  sortBy(key: string): void {
    if (this.sortKey() === key) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDirection.set('asc');
    }
    this.pageIndex.set(0);
  }

  goToPage(i: number): void {
    if (i < 0 || i >= this.totalPages()) return;
    this.pageIndex.set(i);
  }

 // עשרוניות מוצגות רק כשהערך אינו שלם (3.00 → 3, 1250.5 → 1,250.5)
 formatCurrency(v: number | null | undefined, decimals = 2): string {
  if (v == null) return '—';
  const hasFraction = !Number.isInteger(v);
  return '₪' + new Intl.NumberFormat('he-IL', hasFraction
    ? { minimumFractionDigits: Math.min(1, decimals), maximumFractionDigits: decimals }
    : { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
}

  cell(record: Record<string, unknown>, key: string, type = ''): string {
    const v = record[key];
    if (v == null) return '—';
    if ((type === 'date' || type === 'datetime') && !isNaN(Date.parse(String(v))))
      return new Date(String(v)).toLocaleDateString('he-IL');
    if (type === 'number' || type === 'decimal' || type === 'int')
      return new Intl.NumberFormat('he-IL',
        { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(v));
    return String(v);
  }

  close(): void { this.closed.emit(); }

  retry(): void {
    if (!this._metricKey()) return;
    // כשיש כבר פירוט — הכשל היה בטעינת הרשומות, ולכן מרעננים אותן בלבד
    const rowsOnly = this.detail() !== null;
    this.load(this._metricKey(), this.selectedGroup(), false, rowsOnly);
  }

  /** ייצוא בצד השרת — לפי הסינון הפעיל; כשל מציג שגיאה בלי לסגור את החלון */
  exportCsv(): void {
    if (this.exporting() || this.loading()) return;
    this.exporting.set(true);
    this.exportError.set(null);

    this.api.exportDetailsCsv(this._metricKey(), this.selectedGroup(), this.search(), this.fromDate, this.toDate)
      .pipe(timeout(120000))
      .subscribe({
        next: res => {
          this.exporting.set(false);
          const body = res.body;
          if (!body || body.size === 0) {
            this.exportError.set('לא התקבלו נתונים לייצוא');
            return;
          }
          const name = this.fileNameFrom(res.headers.get('Content-Disposition'))
            ?? `metric-${this._metricKey()}.csv`;
          this.saveBlob(body, name);
        },
        error: () => {
          this.exporting.set(false);
          this.exportError.set('ייצוא הקובץ נכשל. נסה שוב מאוחר יותר.');
        }
      });
  }

  private fileNameFrom(disposition: string | null): string | null {
    if (!disposition) return null;
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (utf8) return decodeURIComponent(utf8[1]);
    const plain = /filename="?([^";]+)"?/i.exec(disposition);
    return plain ? plain[1] : null;
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
