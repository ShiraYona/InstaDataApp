import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DataSource,
  LookupOption,
  MetricDraft,
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



@Injectable({ providedIn: 'root' })
export class DataDefinitionService {
  private readonly http = inject(HttpClient);
  private readonly dataCatalogClient = inject(DataCatalogClient);

  private readonly baseUrl = `${environment.baseUrl}/api/data-definitions`;

  private readonly baseUrl = '/api/data-definitions';

 
  private readonly sources$ = this.shareOnce(() =>
    this.http.get<LookupOption[]>(`${this.baseUrl}/sources`));
  private readonly calculationPeriods$ = this.shareOnce(() =>
    this.http.get<LookupOption[]>(`${this.baseUrl}/calculation-periods`));
  private readonly cardIconList$ = this.shareOnce(() =>
    this.http.get<LookupOption[]>(`${this.baseUrl}/card-icons`));
  private readonly calculationTypeList$ = this.shareOnce(() =>
    this.http.get<LookupOption[]>(`${this.baseUrl}/calculation-types`));


  /** מקורות הנתונים לרשימה הנפתחת — נשלפים מ-CTRL_DataSources הפעילים */
  getSources(): Observable<LookupOption[]> {
    return this.sources$;
  }

  /** השדות שהוגדרו עבור מקור — נטען בעת בחירת מקור */
  getSourceFields(sourceId: number): Observable<DataSource> {
    return this.http.get<DataSource>(`${this.baseUrl}/sources/${sourceId}`);
  }

  /** מספר הימים לחישוב (לפי מסנן הלוח / 7 / 30 / 90 ימים) — מ-CTRL_CalculationDays */
  getCalculationPeriods(): Observable<LookupOption[]> {
    return this.calculationPeriods$;
  }

  /** סמלי הכרטיס — נשלפים מ-CTRL_ICON (המילה והאייקון מגיעים מהמסד) */
  getCardIcons(): Observable<LookupOption[]> {
    return this.cardIconList$;
  }

  /** סוגי החישוב — נשלפים מ-CTRL_CalculationTypes */
  getCalculationTypes(): Observable<LookupOption[]> {
    return this.calculationTypeList$;
  }

 
  getCurrentDate(): Observable<Date> {
    return this.http
      .get<unknown>(`${this.baseUrl}/current-date`)
      .pipe(map(date => this.parseLocalDate(date)));
  }


  preview(draft: MetricDraft): Observable<PreviewResult> {
    return this.http.post<PreviewResult>(`${this.baseUrl}/preview`, this.toWire(draft));
  }

  /** שמירת נתון חדש ב-CTRL_Metrics — מחזיר את ה-MetricID שנקבע */
  save(draft: MetricDraft): Observable<number> {
    return this.http.post<number>(`${this.baseUrl}`, this.toWire(draft));
  }

  
  private shareOnce<T>(factory: () => Observable<T>): Observable<T> {
    let cached$: Observable<T> | null = null;

    return new Observable<T>(subscriber => {
      if (!cached$) {
        const source$ = factory();
        cached$ = source$.pipe(
          // שגיאה משוחררת מהמטמון, כדי שהקריאה הבאה תנסה שוב
          catchError(error => {
            cached$ = null;
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: false })
        );
      }

      return cached$.subscribe(subscriber);
    });
  }

  
  private parseLocalDate(date: unknown): Date {
    if (Array.isArray(date) && date.length >= 3) {
      // פורמט מערך: [שנה, חודש (1-12), יום]
      return new Date(date[0], date[1] - 1, date[2]);
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date));
    if (match === null) {
      return new Date(String(date));
    }
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  private toWire(draft: MetricDraft) {
    return {
      name: draft.name,
      sourceId: draft.sourceId,
      calculationTypeId: draft.calculationTypeId,
      sumFieldId: draft.sumFieldId,
      groupFieldId: draft.groupFieldId,
      dateRangeType: draft.dateRangeType,
      iconCode: draft.iconCode,
      detailFieldIds: draft.detailFieldIds,
      displayInDashboard: draft.displayInDashboard
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
