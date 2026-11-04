import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import {
  DataSource,
  LookupOption,
  MetricDraft,
  PreviewResult
} from '../models/data-definition.model';

/**
 * שירות נתוני ההגדרה — כל הקריאות לשרת מרוכזות כאן.
 * הרכיבים תלויים בשירות הזה בלבד; החלפת מקור הנתונים
 * (כגון שירות חיצוני לחלוטין) מתבצעת בקובץ הזה ולא בהם.
 *
 * מקורות הנתונים והשדות שלהם נקראים מהשרת (טבלאות CTRL_DataSources /
 * CTRL_DataSourceFields). תקופות החישוב עדיין מוק — כל מתודה שומרת
 * את חתימתה של גרסת השרת, כך שחזרה לשרת היא החלפה של גוף המתודה בלבד.
 */
@Injectable({ providedIn: 'root' })
export class DataDefinitionService {
  private readonly http = inject(HttpClient);
  /**
   * כתובת יחסית — ה-dev server של Angular מעביר /api לשרת ה-ASP.NET
   * (ראו proxy.conf.js), ולכן אין תלות בפורט או בפרוטוקול.
   */
  private readonly baseUrl = '/api/data-definitions';

  // ---------------------------------------------------------------- מוק
  // נתוני הדוגמה כאן הם זמניים — יוחלפו בקריאה לשרת.

  /** המוק הבא לשמירה — מדמה את ה-IDENTITY של MetricID */
  private nextMetricId = 1;

  // ---------------------------------------------------------------- API

  /** מקורות הנתונים לרשימה הנפתחת — נשלפים מ-CTRL_DataSources הפעילים */
  getSources(): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.baseUrl}/sources`);
  }

  /** השדות שהוגדרו עבור מקור — נטען בעת בחירת מקור */
  getSourceFields(sourceId: number): Observable<DataSource> {
    return this.http.get<DataSource>(`${this.baseUrl}/sources/${sourceId}`);
  }

  /** מספר הימים לחישוב (לפי מסנן הלוח / 7 / 30 / 90 ימים) — מ-CTRL_CalculationDays */
  getCalculationPeriods(): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.baseUrl}/calculation-periods`);
  }

  /** סמלי הכרטיס — נשלפים מ-CTRL_Symbols (המילה והאייקון מגיעים מהמסד) */
  getCardIcons(): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.baseUrl}/card-icons`);
  }

  /** סוגי החישוב — נשלפים מ-CTRL_CalculationTypes */
  getCalculationTypes(): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.baseUrl}/calculation-types`);
  }

  /**
   * חישוב תצוגה מקדימה — ללא שמירה.
   * המוק מחזיר שורה לכל שדה פירוט שנבחר, בערכים אפסיים — אין מה לסכום בלי נתונים.
   */
  preview(draft: MetricDraft): Observable<PreviewResult> {
    // גרסת שרת: this.http.post<PreviewResult>(`${this.baseUrl}/preview`, this.toWire(draft))
    const rows = draft.detailFieldIds.map((fieldId, index) => ({
      key: String(fieldId),
      label: `שדה ${index + 1}`,
      value: 0
    }));

    return of({ rows, total: 0 });
  }

  /** שמירת נתון חדש — מחזיר את ה-MetricID שנקבע */
  save(draft: MetricDraft): Observable<number> {
    // גרסת שרת: this.http.post<number>(this.baseUrl, this.toWire(draft), { withCredentials: true })
    const metricId = this.nextMetricId++;
    console.info('[Mock] נשמרה הגדרה', metricId, this.toWire(draft));
    return of(metricId);
  }

  // ---------------------------------------------------------------- עזר

  /**
   * הפורמט שהשרת מצפה לו (MetricDraftDto).
   * ההמרה ממוקמת במקום אחד כדי שהרכיבים לא יידעו על שמות השדות בשרת.
   */
  private toWire(draft: MetricDraft) {
    return {
      name: draft.name,
      sourceId: draft.sourceId,
      calculationType: draft.calculationType,
      sumFieldId: draft.sumFieldId,
      groupFieldId: draft.groupFieldId,
      dateRangeType: draft.dateRangeType,
      iconCode: draft.iconCode,
      detailFieldIds: draft.detailFieldIds,
      displayInDashboard: draft.displayInDashboard
    } satisfies Record<string, unknown>;
  }
}
