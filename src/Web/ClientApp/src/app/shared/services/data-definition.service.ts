import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DataSource,
  FilterOperator,
  LookupOption,
  MetricDraft,
  PreviewResult
} from '../models/data-definition.model';
import { DataCatalogClient, MetricListItemDto, SetMetricActiveRequest } from '../../web-api-client';

@Injectable({ providedIn: 'root' })
export class DataDefinitionService {
  private readonly http = inject(HttpClient);
  private readonly dataCatalogClient = inject(DataCatalogClient);

  private readonly baseUrl = `${environment.baseUrl}/api/data-definitions`;


  /** לא readonly — טעינה מחדש מחליפה את המופע (ר' getSources) */
  private sources$ = this.shareOnce(() =>
    this.http.get<LookupOption[]>(`${this.baseUrl}/sources`));
  /** לא readonly — טעינה מחדש מחליפה את המופע (ר' getCalculationPeriods) */
  private calculationPeriods$ = this.shareOnce(() =>
    this.http.get<LookupOption[]>(`${this.baseUrl}/calculation-periods`));
  private cardIconList$ = this.shareOnce(() =>
    this.http.get<LookupOption[]>(`${this.baseUrl}/card-icons`));
  private readonly calculationTypeList$ = this.shareOnce(() =>
    this.http.get<LookupOption[]>(`${this.baseUrl}/calculation-types`));
  private readonly filterOperatorList$ = this.shareOnce(() =>
    this.http.get<FilterOperator[]>(`${this.baseUrl}/filter-operators`));


  /**
   * מקורות הנתונים לרשימה הנפתחת — נשלפים מ-CTRL_DataSources הפעילים.
   * forceReload — כמו בתקופות: בדיאלוג העריכה הרשימה צריכה להיות עדכנית.
   */
  getSources(forceReload = false): Observable<LookupOption[]> {
    if (forceReload) {
      this.sources$ = this.shareOnce(() =>
        this.http.get<LookupOption[]>(`${this.baseUrl}/sources`));
    }
    return this.sources$;
  }

  /** השדות שהוגדרו עבור מקור — נטען בעת בחירת מקור */
  getSourceFields(sourceId: number): Observable<DataSource> {
    return this.http.get<DataSource>(`${this.baseUrl}/sources/${sourceId}`);
  }

  /**
   * מספר הימים לחישוב (לפי מסנן הלוח / 7 / 30 / 90 ימים) — מ-CTRL_CalculationDays.
   */
  getCalculationPeriods(forceReload = false): Observable<LookupOption[]> {
    if (forceReload) {
      this.calculationPeriods$ = this.shareOnce(() =>
        this.http.get<LookupOption[]>(`${this.baseUrl}/calculation-periods`));
    }
    return this.calculationPeriods$;
  }

  /**
   * סמלי הכרטיס — נשלפים מ-CTRL_ICON (המילה והאייקון מגיעים מהמסד).
   */
  getCardIcons(forceReload = false): Observable<LookupOption[]> {
    if (forceReload) {
      this.cardIconList$ = this.shareOnce(() =>
        this.http.get<LookupOption[]>(`${this.baseUrl}/card-icons`));
    }
    return this.cardIconList$;
  }

  /** סוגי החישוב — נשלפים מ-CTRL_CalculationTypes */
  getCalculationTypes(): Observable<LookupOption[]> {
    return this.calculationTypeList$;
  }

  /** אופרטורי תנאי הסינון — נשלפים מ-CTRL_FilterOperators (הפעילים בלבד) */
  getFilterOperators(): Observable<FilterOperator[]> {
    return this.filterOperatorList$;
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
      // רלוונטיים רק כשנבחר טווח תאריכים (dateRangeType ריק)
      dateFromFieldId: draft.dateFromFieldId,
      dateToFieldId: draft.dateToFieldId,
      iconCode: draft.iconCode,
      detailFieldIds: draft.detailFieldIds,
      displayInDashboard: draft.displayInDashboard,
      // undefined = השדה אינו נשלח כלל, והשרת משאיר את עץ הסינון השמור
      filtersJson: draft.filtersJson
    } satisfies Record<string, unknown>;
  }


  //הוספות של הני
  
    /** קטלוג הנתונים — כל הנתונים מטבלת CTRL_Metrics */
  getAllMetrics(): Observable<MetricListItemDto[]> {
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

  /**
   * עדכון נתון קיים — מעדכן את השורה ב-CTRL_Metrics, לא יוצר חדשה.
   * rowVersion (Base64 מהרשימה) נשלח כ-If-Match: שורה שהשתנתה בינתיים
   * מוחזרת ב-409, ועל המשתמש לטעון מחדש ולשמור שוב.
   */
  updateMetric(metricId: number, draft: MetricDraft, rowVersion: string | null): Observable<void> {
    const headers = rowVersion ? new HttpHeaders({ 'If-Match': `"${rowVersion}"` }) : undefined;

    return this.http
      .put<void>(`${this.dataCatalogClientBaseUrl}/${metricId}`, this.toWire(draft), { headers })
      .pipe(map(() => undefined));
  }

  /** כתובת הנתיב של DataCatalog — זהה לזה שנוצר ב-DataCatalogClient */
  private readonly dataCatalogClientBaseUrl = `${environment.baseUrl}/api/DataCatalog`;


}
