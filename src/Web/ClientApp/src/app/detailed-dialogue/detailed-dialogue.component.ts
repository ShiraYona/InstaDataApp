import { Component, inject, signal, computed, Input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MetricDetail, SystemGroup } from '../shared/models/controlPanel/MetricDetail';
import { ControlPanel } from '../shared/services/control-panel';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-detailed-dialogue',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './detailed-dialogue.component.html',
  styleUrl: './detailed-dialogue.component.scss'
})
export class DetailedDialogueComponent {
  private readonly api = inject(ControlPanel);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly _metricKey = signal('');
  readonly metricKeyValue = this._metricKey.asReadonly();

  @Input({ required: true })
  set metricKey(v: string) {
    this._metricKey.set(v);
    if (v) this.load(v);
  }

  readonly closed = output<void>();

  readonly detail = signal<MetricDetail | null>(null);
  readonly loading = signal(false);
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

  private load(key: string, groupValue: string | null = null, resetGroup = true): void {
    this.loading.set(true);
    this.failed.set(false);
    if (resetGroup) this.selectedGroup.set(groupValue);
    this.pageIndex.set(0);
    this.api.getDetails(key, null, groupValue, this.search())
      .pipe(timeout(60000))
      .subscribe({
        next: d => { this.detail.set(d); this.loading.set(false); },
        error: () => { this.failed.set(true); this.loading.set(false); }
      });
  }

  readonly systems = computed(() => this.detail()?.systems ?? []);
  readonly groupName = computed(() => this.detail()?.groupFieldLabel || '');
  readonly columns = computed(() =>
    (this.detail()?.columns ?? []).map(c => ({ key: c.fieldName, label: c.label, dataType: c.dataType }))
  );
  readonly totalRecords = computed(() => this.detail()?.totalRecords ?? 0);
  readonly totalValue = computed(() => this.detail()?.totalValue ?? null);
  readonly isCount = computed(() => (this.detail()?.signType ?? '').toUpperCase() === 'COUNT');

  readonly summary = computed(() => {
    const d = this.detail();
    if (!d) return [] as { key: string; label: string; value: string }[];
    return [
      { key: 'value', label: 'ערך הנתון', value: d.dataValue || '—' },
      { key: 'records', label: 'רשומות', value: String(d.totalRecords ?? 0) },
      { key: 'source', label: 'מקור נתונים', value: d.sourceName || '—' },
      { key: 'date', label: 'תאריך יצירה', value: d.createdDate || '—' }
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
    this.load(this._metricKey(), row.groupValue ?? null, false);
  }

  clearGroup(): void {
    this.selectedGroup.set(null);
    this.load(this._metricKey(), null, false);
  }

  onSearch(v: string): void {
    this.search.set(v);
    this.pageIndex.set(0);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(this._metricKey(), this.selectedGroup(), false), 350);
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

 formatCurrency(v: number | null | undefined, decimals = 2): string {
  return v == null ? '—' : '₪' + new Intl.NumberFormat('he-IL',
    { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
}

  cell(record: Record<string, unknown>, key: string, type = ''): string {
    const v = record[key];
    if (v == null) return '—';
    if ((type === 'date' || type === 'datetime') && !isNaN(Date.parse(String(v))))
      return new Date(String(v)).toLocaleDateString('he-IL');
    if (type === 'number' || type === 'decimal' || type === 'int')
      return new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 }).format(Number(v));
    return String(v);
  }

  close(): void { this.closed.emit(); }

  retry(): void { if (this._metricKey()) this.load(this._metricKey(), this.selectedGroup(), false); }

  /** ייצוא בצד השרת — לפי הסינון הפעיל; כשל מציג שגיאה בלי לסגור את החלון */
  exportCsv(): void {
    if (this.exporting() || this.loading()) return;
    this.exporting.set(true);
    this.exportError.set(null);

    this.api.exportDetailsCsv(this._metricKey(), this.selectedGroup(), this.search())
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
