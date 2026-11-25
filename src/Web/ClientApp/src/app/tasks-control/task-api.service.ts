import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/** תואם ל-TaskDto בשרת (GET api/Tasks) */
export interface TaskDto {
  taskID: number;
  taskTitle: string;
  taskDescription: string;
  teamID: number;
  assignedUserID: string | null;
  priority: string;
  status: string;
  dueDate: string;
  completedDate: string | null;
  cancelledDate: string | null;
  sourceType: string;
  sourceSystemCode: string | null;
  sourceEntityType: string | null;
  sourceEntityID: string | null;
  sourceURL: string | null;
  metricID: number | null;
  createdBy: string;
  createdDate: string;
  updatedBy: string | null;
  updatedDate: string | null;
  rowVersion: string;
  /** נוצרה או עודכנה אחרי הצפייה האחרונה של המשתמש הנוכחי. */
  isNewForMe: boolean;
}

/** תואם ל-CommentDto */
export interface TaskCommentDto {
  commentID: number;
  taskID: number;
  commentText: string;
  createdBy: string;
  createdDate: string;
}

/** תואם ל-HistoryDto */
export interface TaskHistoryDto {
  historyID: number;
  taskID: number;
  actionType: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedDate: string;
}

export interface LookupItemDto {
  value: string;
  label: string;
  teamID?: number | null;
}


export interface TaskLookupsDto {
  teams: LookupItemDto[];
  people: LookupItemDto[];
}

/** שאילתת רשימת משימות — סינון, מיון ודפדוף בצד השרת. */
export interface TaskQuery {
  search?: string | null;
  status?: string[] | null;
  priority?: string[] | null;
  sourceType?: string[] | null;
  state?: string[] | null;
  teamID?: number | null;
  assignedUserID?: string | null;
  dueFrom?: string | null;
  dueTo?: string | null;
  mineOnly?: boolean;
  overdueOnly?: boolean;
  /** מדד סיכום שנבחר — OPEN / PROGRESS / LATE / HIGH. שכבה נוספת מעל הסינון. */
  metricFocus?: string | null;
  /** "תקופת מדדי ההשלמה": LAST_7 / LAST_30 / LAST_90 / ALL — סינון בצד השרת. */
  completionScope?: string | null;
  sortKey?: string | null;
  sortDirection?: string | null;
  skip?: number | null;
  take?: number | null;
}

/** מדדי "משימות ובקרה" — מחושבים בשרת. */
export interface TaskMetricsDto {
  open: number;
  inProgress: number;
  late: number;
  highPriority: number;
  completed: number;
  completedOnTime: number;
  onTimeRatePercent: number | null;
  total: number;
}

export interface UpdateTaskRequest {
  taskTitle: string;
  taskDescription: string;
  teamID: number;
  assignedUserID: string | null;
  priority: string;
  dueDate: string;
  /** base64 של timestamp ה-SQL — לבדיקת דריסה מקבילה. */
  rowVersion: string;
}

export interface CreateTaskRequest {
  taskTitle: string;
  taskDescription?: string | null;
  teamID: number;
  assignedUserID?: string | null;
  priority: string;
  dueDate: string;
    sourceSystemCode?: string | null;
  sourceEntityType?: string | null;
  sourceEntityID?: string | null;
  sourceURL?: string | null;
  metricID?: number | null;
}

@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private readonly http = inject(HttpClient);

  /**
   * רשימת משימות מסוננת, ממוינת ומדפדפת בשרת.
   * המערכים נשלחים כ-param חוזר (status=A&status=B) — לפי מוסכמת ASP.NET Core;
   * ערכים ריקים/null מושמטים כדי לא לשלוח פרמטרים חסרי משמעות.
   */
  getAll(query: TaskQuery = {}): Observable<TaskDto[]> {
    return this.http.get<TaskDto[]>('/api/Tasks', { params: toParams(query) });
  }

  /** סך הרשומות שמתאימות לאותה שאילתה (בלי דפדוף) — עבור "מוצגות X מתוך Y". */
  count(query: TaskQuery = {}): Observable<number> {
    return this.http.get<number>('/api/Tasks/count', { params: toParams(query) });
  }

  /** משימה בודדת לפי מזהה — לפתיחת פרטים ישירה (GET api/Tasks/{id}). */
  getById(taskId: number): Observable<TaskDto> {
    return this.http.get<TaskDto>(`/api/Tasks/${taskId}`);
  }

  /**
   * מדדים לתצוגה העליונה — לפי אותה קבוצת נתונים שהמשתמש רואה (ללא סינון הטבלה).
   * completionScope — LAST_7 / LAST_30 / LAST_90 / ALL, כמו בטבלה, כדי שהמדדים
   * ייחשבו על אותה קבוצת משימות שהושלמו.
   */
  getMetrics(completionScope?: string | null): Observable<TaskMetricsDto> {
    const params: Record<string, string> = {};
    if (completionScope) params['completionScope'] = completionScope;
    return this.http.get<TaskMetricsDto>('/api/Tasks/metrics', { params });
  }

  getComments(taskId: number): Observable<TaskCommentDto[]> {
    return this.http.get<TaskCommentDto[]>(`/api/Tasks/${taskId}/comments`);
  }

  getHistory(taskId: number): Observable<TaskHistoryDto[]> {
    return this.http.get<TaskHistoryDto[]>(`/api/Tasks/${taskId}/history`);
  }

  getLookups(): Observable<TaskLookupsDto> {
    return this.http.get<TaskLookupsDto>('/api/Tasks/lookups');
  }

  update(taskId: number, body: UpdateTaskRequest): Observable<TaskDto> {
    return this.http.put<TaskDto>(`/api/Tasks/${taskId}`, body);
  }
  changeStatus(taskId: number, status: string, rowVersion: string): Observable<TaskDto> {
    return this.http.put<TaskDto>(`/api/Tasks/${taskId}/status`, { status, rowVersion });
  }
  /** סימון "צפיתי במשימה" — מעדכן את מועד הצפייה של המשתמש בשרת. */
  markViewed(taskId: number): Observable<void> {
    return this.http.post<void>(`/api/Tasks/${taskId}/view`, {});
  }
  addComment(taskId: number, commentText: string): Observable<TaskCommentDto> {
    return this.http.post<TaskCommentDto>(`/api/Tasks/${taskId}/comments`, { commentText });
  }
  create(body: CreateTaskRequest): Observable<TaskDto> {
    return this.http.post<TaskDto>('/api/Tasks', body);
  }
}

/**
 * בניית query string מהשאילתה.
 * מערך → פרמטר חוזר לכל ערך; null/מחרוזת ריקה → מדולג;
 * false לא נשלח כלל (ברירת המחדל בשרת), וכמו-כן 0 ו-'' אינם נושאים מידע.
 */
function toParams(query: TaskQuery): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === false || value === '') continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined && item !== '') {
          params = params.append(key, String(item));
        }
      }
      continue;
    }

    params = params.append(key, String(value));
  }

  return params;
}
