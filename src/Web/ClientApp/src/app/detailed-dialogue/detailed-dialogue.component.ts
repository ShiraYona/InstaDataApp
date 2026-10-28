import { DecimalPipe } from '@angular/common';
import { Component, Input, computed, output, signal } from '@angular/core';

/** כמה רשומות מוצגות בטבלה */
const MAX_ROWS = 50;

/** הגדרת נתון בקטלוג */
export interface MetricDefinition {
  id: string;
  name: string;
  /** מפתח המקור שממנו נשלף הנתון */
  source: string;
  /** שדה שעליו מחלקים את הרשומות, או 'none' */
  group: string;
  /** העמודות שמוצגות בטבלת הפירוט */
  detailFields: string[];
}

/** רשומת מקור גולמית */
export type SourceRecord = Record<string, unknown>;

/** מקור נתונים */
export interface DataSource {
  name: string;
  dateField: string;
  /** מיפוי שם שדה -> תווית לתצוגה */
  fields: Record<string, string>;
}

/**
 * חלון "פירוט נתון" — שורת סיכום, חלוקה לפי המערכת של הנתון,
 * ולחיצה על "הצגת רשומות" מציגה את רשומות המערכת הנבחרת.
 *
 * הנתונים מגיעים מההורה דרך ה-@Input (אין תלות ב-store נפרד).
 */
@Component({
  selector: 'app-detailed-dialogue',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './detailed-dialogue.component.html',
  styleUrl: './detailed-dialogue.component.scss'
})
export class DetailedDialogueComponent {

  /** מזהה הנתון */
  @Input({ required: true }) metricId = '';

  /** כותרת הנתון — מוצגת בראש החלון */
  @Input() title = '';

  /** נשלח כשהמשתמש סוגר את החלון */
  readonly closed = output<void>();

  /** הנתון עצמו */
  @Input() metric: MetricDefinition | null = null;

  /** מקור הנתונים */
  @Input() source: DataSource | null = null;

  /** הרשומות של הנתון */
  @Input() set records(value: SourceRecord[]) {
    this.rows.set(value ?? []);
  }

  readonly rows = signal<SourceRecord[]>([]);
  readonly search = signal('');

  /** המערכת שנבחרה — null = כל הרשומות */
  readonly selectedGroup = signal<string | null>(null);

  readonly maxRows = MAX_ROWS;

  readonly groupFieldLabel = computed(() =>
    !this.metric || this.metric.group === 'none' ? 'מערכת' : (this.source?.fields[this.metric.group] ?? 'מערכת'));

  readonly summary = computed(() => {
    const metric = this.metric;
    if (!metric) {
      return [];
    }
    const total = this.rows().reduce((sum, row) => sum + (Number(row['amount']) || 0), 0);
    return [
      { key: 'value', label: 'ערך הנתון', value: formatNumber(total) },
      { key: 'records', label: 'רשומות בדוגמה', value: formatNumber(this.rows().length) },
      { key: 'source', label: 'מקור נתונים', value: this.source?.name ?? '—' },
      { key: 'date', label: 'שדה תאריך', value: this.source?.dateField ?? '—' }
    ];
  });

  readonly groups = computed(() => {
    const field = this.metric?.group;
    if (!field || field === 'none') {
      return [];
    }
    const totals = new Map<string, { value: string; records: number; total: number }>();
    for (const row of this.rows()) {
      const value = String(row[field] ?? '—');
      const entry = totals.get(value) ?? { value, records: 0, total: 0 };
      entry.records += 1;
      entry.total += Number(row['amount']) || 0;
      totals.set(value, entry);
    }
    return [...totals.values()];
  });

  readonly filteredRecords = computed(() => {
    const group = this.selectedGroup();
    const term = this.search().trim();
    return this.rows()
      .filter(row => group === null || String(row[this.metric?.group ?? ''] ?? '') === group)
      .filter(row => !term || Object.values(row).some(value => String(value).includes(term)));
  });

  readonly visibleRecords = computed(() => this.filteredRecords().slice(0, MAX_ROWS));

  readonly columns = computed(() => {
    const metric = this.metric;
    if (!metric) {
      return [];
    }
    const source = this.source;
    const keys = ['id', 'date', ...(metric.detailFields.length ? metric.detailFields : Object.keys(source?.fields ?? {}))];
    return [...new Set(keys)].map(key => ({
      key,
      label: key === 'id' ? 'מזהה' : key === 'date' ? (source?.dateField ?? 'תאריך') : (source?.fields[key] ?? key)
    }));
  });

  showRecords(value: string): void {
    this.selectedGroup.update(current => (current === value ? null : value));
    this.search.set('');
  }

  onSearch(value: string): void {
    this.search.set(value);
  }

  cell(row: SourceRecord, key: string): string {
    const value = row[key];
    return key === 'amount' ? formatCurrency(Number(value) || 0) : String(value ?? '');
  }

  exportCsv(): void {
    const metric = this.metric;
    if (!metric) {
      return;
    }
    const columns = this.columns();
    const csv = [
      columns.map(column => column.label),
      ...this.filteredRecords().map(row => columns.map(column => this.cell(row, column.key)))
    ]
      .map(line => line.map(value => `"${value.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = metric.name + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /** משמש גם בתבנית — לא לשנות את השם */
  formatCurrency(value: number): string {
    return formatCurrency(value);
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('he-IL').format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);
}
