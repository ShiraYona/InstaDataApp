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

/**
 * שירות נתוני ההגדרה — כל הקריאות לשרת מרוכזות כאן.
 * הרכיבים תלויים בשירות הזה בלבד; החלפת מקור הנתונים
 * (כגון שירות חיצוני לחלוטין) מתבצעת בקובץ הזה ולא בהם.
 */
@Injectable({ providedIn: 'root' })
export class DataDefinitionService {
  private readonly http = inject(HttpClient);
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
}
