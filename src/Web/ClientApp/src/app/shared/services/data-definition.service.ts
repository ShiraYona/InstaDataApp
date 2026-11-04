import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CardIconOption,
  DataDefinitionDraft,
  DataSource,
  LookupOption,
  PreviewResult
} from '../models/data-definition.model';
import { DataCatalogClient, Metric, SetMetricActiveRequest } from '../../web-api-client';

/**
 * ערכי ברירת מחדל של קטלוגי העזר (בשרת יגיעו מטבלאות עזר).
 * משמשים כערכי התחלה בטופס ובערכי ברירת המחדל שלו.
 */
export const CARD_ICON_OPTIONS: CardIconOption[] = [
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
 * שירות נתוני ההגדרה — כל הקריאות לשרת מרוכזות כאן.
 * הרכיבים תלויים בשירות הזה בלבד; החלפת מקור הנתונים
 * (כגון שירות חיצוני לחלוטין) מתבצעת בקובץ הזה ולא בהם.
 */
@Injectable({ providedIn: 'root' })
export class DataDefinitionService {
  private readonly http = inject(HttpClient);
  private readonly dataCatalogClient = inject(DataCatalogClient);

  private readonly baseUrl = `${environment.baseUrl}/api/data-definitions`;

  getSources(): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.baseUrl}/sources`);
  }

  /** השדות שהוגדרו עבור מקור — נטען בעת בחירת מקור */
  getSourceFields(sourceId: number): Observable<DataSource> {
    return this.http.get<DataSource>(`${this.baseUrl}/sources/${sourceId}`);
  }

  /** סמלי הכרטיס — הסמל מורכב מהתווית והסימן */
  getCardIcons(): Observable<CardIconOption[]> {
    return this.http.get<CardIconOption[]>(`${this.baseUrl}/card-icons`);
  }

  getCalculationPeriods(): Observable<LookupOption[]> {
    return this.http.get<LookupOption[]>(`${this.baseUrl}/calculation-periods`);
  }

  /** חישוב תצוגה מקדימה — ללא שמירה */
  preview(draft: DataDefinitionDraft): Observable<PreviewResult> {
    return this.http.post<PreviewResult>(`${this.baseUrl}/preview`, this.toWire(draft));
  }

  /** שמירת נתון חדש — מחזיר את המזהה שנקבע בשרת */
  save(draft: DataDefinitionDraft): Observable<number> {
    return this.http
      .post<{ id: number }>(this.baseUrl, this.toWire(draft), { withCredentials: true })
      .pipe(map(response => response.id));
  }

  /**
   * הפורמט שהשרת מצפה לו (DataDefinitionDraftDto).
   * השמות שונים מהמודל המקומי (sourceId ↦ dataSourceId וכו'),
   * ולכן ההמרה ממוקמת במקום אחד בלבד.
   */
  private toWire(draft: DataDefinitionDraft) {
    return {
      name: draft.name,
      dataSourceId: draft.sourceId,
      cardIconId: draft.iconId,
      calculationPeriodId: draft.periodId,
      calculationType: draft.calculationType === 'SUM' ? 1 : 0,
      summaryFieldKey: draft.summaryFieldKey,
      groupByFieldKey: draft.groupByFieldKey,
      dateFieldKey: draft.dateFieldKey,
      detailFields: draft.detailFields,
      showInDashboard: draft.showInDashboard
    } satisfies Record<string, unknown>;
  }


  //הוספות של הני
  
    /** קטלוג הנתונים — כל הנתונים מטבלת CTRL_Metrics */
  getAllMetrics(): Observable<Metric[]> {
    return this.dataCatalogClient.get();
  }
    /** שינוי מצב פעיל / מושבת — נשמר ב-DB */
  setMetricActive(metricId: number, isActive: boolean): Observable<void> {
    return this.dataCatalogClient
      .setActive(metricId, new SetMetricActiveRequest({ isActive }))
      .pipe(map(() => undefined));
  }

      /** מחיקת נתון — נמחקת מ-DB */
  deleteMetric(metricId: number): Observable<void> {
    return this.dataCatalogClient
      .delete(metricId)
      .pipe(map(() => undefined));
  }


}
