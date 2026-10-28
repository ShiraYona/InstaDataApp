import { Injectable, inject } from '@angular/core';
import { Observable, delay, map, of, throwError, tap } from 'rxjs';

import {
  DataDefinitionDraft,
  DataSource,
  LookupOption,
  PreviewResult
} from '../models/data-definition.model';

/** ערכי ברירת מחדל של קטלוגי עזר (בשרת יגיעו מטבלאות) */
export const CARD_ICON_OPTIONS: LookupOption[] = [
  { id: 1, label: '▦ נתון' },
  { id: 2, label: '₪ כספי' },
  { id: 3, label: '▤ שומה' },
  { id: 4, label: '◉ התראה' },
  { id: 5, label: '🏷 הנחה' },
  { id: 6, label: '🧾 שובר' },
  { id: 7, label: '⚖ תביעה' }
];

export const CALCULATION_PERIOD_OPTIONS: LookupOption[] = [
  { id: 1, label: 'לפי מסנן הלוח' },
  { id: 2, label: '7 ימים' },
  { id: 3, label: '30 ימים' },
  { id: 4, label: '90 ימים' }
];

/**
 * מקורות נתונים לדוגמה (Mock).
 * כל מקור חושף שדות משלו — בדיוק כמו שיעשה ה-endpoint האמיתי.
 */
const MOCK_SOURCES: DataSource[] = [
  {
    id: 1,
    label: 'מקור נתונים 1',
    fields: [
      { key: 'createdAt', label: 'תאריך יצירה', kind: 'date' },
      { key: 'amount', label: 'סכום', kind: 'number' },
      { key: 'quantity', label: 'כמות', kind: 'number' },
      { key: 'system', label: 'מערכת', kind: 'text' },
      { key: 'accountNumber', label: 'מספר חשבון', kind: 'text' },
      { key: 'status', label: 'סטטוס', kind: 'text' }
    ],
    dateMode: { field: 'createdAt', label: 'לפי מסנן הלוח', note: 'מוגדר בקטלוג מקור הנתונים' }
  },
  {
    id: 2,
    label: 'מקור נתונים 2',
    fields: [
      { key: 'updatedAt', label: 'תאריך עדכון', kind: 'date' },
      { key: 'total', label: 'סכום כולל', kind: 'number' },
      { key: 'accountNumber', label: 'מספר חשבון', kind: 'text' },
      { key: 'system', label: 'מערכת', kind: 'text' },
      { key: 'status', label: 'סטטוס', kind: 'text' }
    ],
    dateMode: { field: 'updatedAt', label: 'לפי תאריך העדכון', note: 'מוגדר בקטלוג מקור הנתונים' }
  },
  {
    id: 3,
    label: 'מקור נתונים 3',
    fields: [
      { key: 'createdAt', label: 'תאריך יצירה', kind: 'date' },
      { key: 'amount', label: 'סכום', kind: 'number' },
      { key: 'system', label: 'מערכת', kind: 'text' }
    ],
    dateMode: { field: 'createdAt', label: 'לפי תאריך יצירה', note: 'מוגדר בקטלוג מקור הנתונים' }
  }
];

/**
 * שירות נתוני ההגדרה — כרגע Mock בצד הלקוח בלבד.
 * כשהשרת יהיה מוכן, מחליפים את גופי המתודות בקריאות HttpClient
 * והחתימות נשארות זהות.
 */
@Injectable({ providedIn: 'root' })
export class DataDefinitionService {
  /** המתנה קצרה כדי לדמות קריאת רשת ולהציג מצב טעינה */
  private readonly simulatedLatencyMs = 250;

  getSources(): Observable<LookupOption[]> {
    return of(MOCK_SOURCES.map(({ id, label }) => ({ id, label }))).pipe(delay(this.simulatedLatencyMs));
  }

  /** השדות שהוגדרו עבור מקור — נטען בעת בחירת מקור */
  getSourceFields(sourceId: number): Observable<DataSource> {
    const source = MOCK_SOURCES.find(s => s.id === sourceId);
    if (!source) {
      return throwError(() => new Error('מקור נתונים לא נמצא'));
    }
    return of(source).pipe(delay(this.simulatedLatencyMs));
  }

  /**
   * חישוב תצוגה מקדימה — ללא שמירה.
   * מחזיר תוצאה דטרמיניסטית לפי ההגדרות, כדי שהדמו יהיה יציב.
   */
  preview(draft: DataDefinitionDraft): Observable<PreviewResult> {
    const groupKey = draft.groupByFieldKey ?? draft.dateFieldKey ?? 'all';
    const seed = `${draft.sourceId}-${groupKey}-${draft.calculationType}-${draft.summaryFieldKey}`;

    const rowCount = draft.calculationType === 'COUNT' ? 3 : 4;
    const rows = Array.from({ length: rowCount }, (_, i) => ({
      key: `${groupKey}-${i + 1}`,
      label: `פריט ${i + 1}`,
      value: this.pseudoRandom(seed + i)
    }));

    const total = rows.reduce((sum, row) => sum + row.value, 0);
    return of({ rows, total }).pipe(delay(this.simulatedLatencyMs));
  }

  /** שמירה בקטלוג המרכזי — Mock: מחזיר מזהה חדש */
  save(draft: DataDefinitionDraft): Observable<number> {
    return of({}).pipe(
      delay(this.simulatedLatencyMs),
      tap(() => savedDefinitions.push({ ...draft })),
      // המזהה מחושב רק לאחר שהרשומה נוספה בפועל
      map(() => savedDefinitions.length)
    );
  }

  /** הנתונים שנשמרו — נדרש להצגה ברשימה (לוח הבקרה אינו בטווח) */
  getSaved(): DataDefinitionDraft[] {
    return [...savedDefinitions];
  }

  /** חישוב דטרמיניסטי פשוט — רק כדי שהתצוגה המקדימה תיראה הגיונית */
  private pseudoRandom(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    return Math.abs(hash % 1000) + 10;
  }
}

// מחסן דמו לשמירות — להסרה עם חיבור ה-API האמיתי
const savedDefinitions: DataDefinitionDraft[] = [];
