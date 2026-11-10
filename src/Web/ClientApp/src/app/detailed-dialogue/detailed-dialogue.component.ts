import { Component, inject, signal, computed, Input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MetricDetail, SystemGroup } from '../shared/models/controlPanel/MetricDetail';
import { ControlPanel } from '../shared/services/control-panel';

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
  readonly selectedSourceId = signal<number | null>(null);
  readonly search = signal('');
  readonly selectedGroup = signal<string | null>(null);

  private load(key: string, groupValue: string | null = null): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.getDetails(key, null, groupValue).subscribe({
      next: d => { this.detail.set(d); this.loading.set(false); },
      error: () => { this.failed.set(true); this.loading.set(false); }
    });
  }

  readonly systems = computed(() => this.detail()?.systems ?? []);
  readonly groupName = computed(() => this.detail()?.groupFieldLabel ?? 'מערכת');
  readonly columns = computed(() =>
    (this.detail()?.columns ?? []).map(c => ({ key: c.fieldName, label: c.label }))
  );
  readonly totalRecords = computed(() => this.detail()?.totalRecords ?? 0);
  readonly totalValue = computed(() => this.detail()?.totalValue ?? null);

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

  readonly filteredRecords = computed(() => {
    const q = this.search().trim().toLowerCase();
    const rows = this.detail()?.records ?? [];
    return q ? rows.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q))) : rows;
  });

   showRecords(row: SystemGroup): void {
    this.selectedGroup.set(row.groupValue ?? null);
    this.load(this._metricKey(), row.groupValue ?? null);
  }


  onSearch(v: string): void { this.search.set(v); }

  formatCurrency(v: number | null | undefined): string {
    return v == null ? '—' : '₪' + new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2 }).format(v);
  }

  cell(record: Record<string, unknown>, key: string): string {
    const v = record[key];
    return v == null ? '—' : String(v);
  }

close(): void {
  this.closed.emit();
}


  exportCsv(): void {
    const cols = this.columns();
    const rows = this.filteredRecords();
    const csv = [cols.map(c => c.label).join(','),
      ...rows.map(r => cols.map(c => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `metric-${this._metricKey()}.csv`;
    a.click();
  }
  
}
