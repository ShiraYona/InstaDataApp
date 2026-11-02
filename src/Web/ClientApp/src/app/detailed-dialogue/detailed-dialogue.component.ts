import { DecimalPipe } from '@angular/common';
import { Component, Input, computed, output, signal } from '@angular/core';

/** כמה רשומות מוצגות בטבלה */
const MAX_ROWS = 50;

/** נתוני דמה לשורת הסיכום, לחלוקה ולרשומות — יוחלפו בנתוני השרת */
const DEMO_TOTALS = [733095, 90, 'שוברים במסלקה', 'תאריך יצירה'];

const DEMO_GROUPS: ReadonlyArray<{ value: string; records: number; total: number }> = [
  { value: 'גבייה', records: 30, total: 238995 },
  { value: 'ארנונה', records: 30, total: 244365 },
  { value: 'אכיפה', records: 30, total: 249735 }
];

const DEMO_ROWS: SourceRecord[] = Array.from({ length: 90 }, (_, index) => ({
  id: String(100000 + index),
  date: new Date(2026, 9, 8 - (index % 95)).toISOString().slice(0, 10),
  system: ['גבייה', 'ארנונה', 'אכיפה'][index % 3],
  amount: Math.round(180 + ((index * 179) % 16000)),
  account: '10' + String(43000 + index),
  status: index % 7 ? 'פעיל' : 'בטיפול'
}));

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

  /** הרשומות בפועל — ללא רשומות שנשלחו מההורה מוצגות רשומות הדוגמה */
  readonly rows = signal<SourceRecord[]>(DEMO_ROWS);
  readonly search = signal('');

  /** המערכת שנבחרה — null = כל הרשומות */
  readonly selectedGroup = signal<string | null>(null);

  readonly maxRows = MAX_ROWS;

  readonly groupFieldLabel = computed(() =>
    !this.metric || this.metric.group === 'none' ? 'מערכת' : (this.source?.fields[this.metric.group] ?? 'מערכת'));

  readonly summary = computed(() => {
    const rows = this.rows();
    // בהיעדר נתון מלא מההורה — מוצגות ארבע אריחי הסיכום של נתוני הדוגמה
    if (!this.metric) {
      const [value, records, source, date] = DEMO_TOTALS;
      return [
        { key: 'value', label: 'ערך הנתון', value: formatCurrency(Number(value)) },
        { key: 'records', label: 'רשומות בדוגמה', value: formatNumber(Number(records)) },
        { key: 'source', label: 'מקור נתונים', value: String(source) },
        { key: 'date', label: 'שדה תאריך', value: String(date) }
      ];
    }
    const total = rows.reduce((sum, row) => sum + (Number(row['amount']) || 0), 0);
    return [
      { key: 'value', label: 'ערך הנתון', value: formatCurrency(total) },
      { key: 'records', label: 'רשומות בדוגמה', value: formatNumber(rows.length) },
      { key: 'source', label: 'מקור נתונים', value: this.source?.name ?? '—' },
      { key: 'date', label: 'שדה תאריך', value: this.source?.dateField ?? '—' }
    ];
  });

  readonly groups = computed(() => {
    const field = this.metric?.group;
    if (!field || field === 'none') {
      return DEMO_GROUPS;
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
    // ללא הגדרת נתון — הסינון לפי שדה "מערכת" של נתוני הדוגמה
    const field = (!this.metric || this.metric.group === 'none') ? 'system' : this.metric.group;
    return this.rows()
      .filter(row => group === null || String(row[field] ?? '') === group)
      .filter(row => !term || Object.values(row).some(value => String(value).includes(term)));
  });

  readonly visibleRecords = computed(() => this.filteredRecords().slice(0, MAX_ROWS));

  readonly columns = computed(() => {
    const metric = this.metric;
    if (!metric) {
      return [
        { key: 'id', label: 'מזהה' },
        { key: 'date', label: String(DEMO_TOTALS[3]) },
        { key: 'system', label: 'מערכת' },
        { key: 'amount', label: 'סכום' },
        { key: 'account', label: 'מספר חשבון' },
        { key: 'status', label: 'סטטוס' }
      ];
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
    link.download = (metric?.name || this.title || 'פירוט') + '.csv';
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
