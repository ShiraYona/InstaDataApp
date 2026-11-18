import { CommonModule } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, Injector, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ConfirmationService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { Subject, catchError, forkJoin, of, switchMap, takeUntil } from 'rxjs';
import { NotificationService } from '../shared/services/notification.service';
import {
  TaskApiService,
  TaskCommentDto,
  TaskDto,
  TaskHistoryDto,
  TaskMetricsDto,
  TaskQuery,
} from './task-api.service';

/* ===================== טיפוסים ===================== */

export type Status = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type Source = 'MANUAL' | 'DASHBOARD' | 'EXTERNAL';
export type Role = 'admin' | 'manager' | 'employee';
export type View = 'ALL' | 'MY_TASKS' | 'TEAM' | 'OVERDUE';
export type MetricKey = 'open' | 'progress' | 'late' | 'high' | 'completed' | 'rate';
export type Deadline = '' | 'late' | 'today' | 'soon';

export type TaskField =
  | 'TaskTitle'
  | 'TaskDescription'
  | 'TeamID'
  | 'AssignedUserID'
  | 'Priority'
  | 'DueDate'
  | 'Status'
  | 'CompletedDate'
  | 'CancelledDate';

export interface Team {
  id: number;
  name: string;
}

export interface Person {
  id: string;
  name: string;
  team: number;
}

export interface Task {
  TaskID: number;
  TaskTitle: string;
  TaskDescription: string;
  TeamID: number;
  AssignedUserID: string | null;
  Priority: Priority;
  Status: Status;
  DueDate: string;
  CompletedDate: string | null;
  CancelledDate: string | null;
  SourceType: Source;
  SourceSystemCode: string | null;
  SourceEntityType: string | null;
  SourceEntityID: string | null;
  SourceURL: string | null;
  MetricID: number | null;
  CreatedBy: string;
  CreatedDate: string;
  UpdatedBy: string | null;
  UpdatedDate: string | null;
  /** timestamp ב-SQL → מגיע כ-base64; לא מספר. */
  RowVersion: string;
  /** נוצרה או עודכנה אחרי הצפייה האחרונה של המשתמש — מחושב בשרת. */
  IsNewForMe: boolean;
}

export interface HistoryEntry {
  HistoryID: number;
  TaskID: number;
  ActionType: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'REASSIGN';
  FieldName: TaskField | null;
  OldValue: string | null;
  NewValue: string | null;
  ChangedBy: string;
  ChangedDate: string;
}

export interface CommentEntry {
  CommentID: number;
  TaskID: number;
  CommentText: string;
  CreatedBy: string;
  CreatedDate: string;
}

/** אפשרות בתיבת בחירה; value=null מסמן את שורת "הכול". */
interface SelectOption {
  value: string | null;
  label: string;
}

interface TaskStore {
  tasks: Task[];
  comments: CommentEntry[];
  histories: HistoryEntry[];
}

interface Filters {
  /** מסננים מרובי-ערכים — OR בתוך אותו מסנן, AND בין מסננים שונים. */
  status: string[];
  priority: string[];
  team: string;
  worker: string;
  dueFrom: string;
  dueTo: string;
  source: string[];
  state: string[];
}

interface Kpi {
  key: MetricKey;
  label: string;
  n: string | number;
}

interface DetailTab {
  key: string;
  label: string;
}

type StatusTransition = { status: Status; label: string; primary: boolean };

/** מפתחות שגיאה בטופס — תואמים ל-FormModel */
type FormKey = keyof FormModel;
type FormErrors = Partial<Record<FormKey, string>>;

interface FormModel {
  title: string;
  description: string;
  team: string;
  assigned: string;
  priority: Priority;
  due: string;
}

/* ===================== קבועים ===================== */

const VIEW_STORAGE = 'jerusalem_tasks_spec7_view_v1';

/**
 * מזהה המשתמש שנחשב "אני" כל עוד אין אימות אמיתי.
 * תואם לעובד הראשון בקטלוג שמחזיר השרת (GET api/Tasks/lookups).
 */
const CURRENT_USER_ID = 'user-1';

const EMPTY_FILTERS = (): Filters => ({
  status: [],
  priority: [],
  team: '',
  worker: '',
  dueFrom: '',
  dueTo: '',
  source: [],
  state: [],
});

const TRANSITIONS: Record<Status, Status[]> = {
  OPEN: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['OPEN', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['OPEN'],
  CANCELLED: ['OPEN'],
};

const STATUS_LABELS: Record<Status, string> = {
  OPEN: 'פתוחה',
  IN_PROGRESS: 'בטיפול',
  COMPLETED: 'הושלמה',
  CANCELLED: 'בוטלה',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'נמוכה',
  MEDIUM: 'בינונית',
  HIGH: 'גבוהה',
  URGENT: 'דחופה',
};

const SOURCE_LABELS: Record<Source, string> = {
  MANUAL: 'ידנית',
  DASHBOARD: 'לוח בקרה',
  EXTERNAL: 'מערכת חיצונית',
};

const DEADLINE_LABELS: Record<Exclude<Deadline, ''>, string> = {
  late: 'באיחור',
  today: 'היום',
  soon: 'קרוב ליעד',
};

const DETAIL_DEADLINE_LABELS: Record<Exclude<Deadline, ''>, string> = {
  late: 'באיחור',
  today: 'להשלמה היום',
  soon: 'מתקרבת ליעד',
};

const HISTORY_LABELS: Record<HistoryEntry['ActionType'], string> = {
  CREATE: 'יצירת משימה',
  UPDATE: 'עדכון פרטי משימה',
  STATUS_CHANGE: 'שינוי סטטוס',
  REASSIGN: 'שינוי שיוך',
};

const HISTORY_FIELD_LABELS: Record<TaskField, string> = {
  TaskTitle: 'נושא',
  TaskDescription: 'תיאור',
  TeamID: 'צוות',
  AssignedUserID: 'עובד אחראי',
  Priority: 'עדיפות',
  DueDate: 'תאריך יעד',
  Status: 'סטטוס',
  CompletedDate: 'מועד השלמה',
  CancelledDate: 'מועד ביטול',
};

const SORT_COLUMNS: { key: keyof Task; label: string }[] = [
  { key: 'TaskID', label: 'מזהה' },
  { key: 'TaskTitle', label: 'נושא המשימה' },
  { key: 'SourceType', label: 'מקור' },
  { key: 'TeamID', label: 'צוות' },
  { key: 'AssignedUserID', label: 'אחראי' },
  { key: 'Priority', label: 'עדיפות' },
  { key: 'Status', label: 'סטטוס' },
  { key: 'CreatedDate', label: 'נוצרה' },
  { key: 'DueDate', label: 'תאריך יעד' },
];

const VIEW_TABS: { key: View; label: string }[] = [
  { key: 'ALL', label: 'כל המשימות' },
  { key: 'MY_TASKS', label: 'המשימות שלי' },
  { key: 'TEAM', label: 'משימות הצוות' },
  { key: 'OVERDUE', label: 'משימות באיחור' },
];

const PERIODS = [7, 30, 90];

/** גודל מנה בטעינה הדרגתית (7.3.6.1–3). */
const PAGE_SIZE = 20;

/** מוסיף בראש הרשימה את שורת "הכול" (ערך null) — ברירת המחדל של כל מסנן. */
function withAllOption(
  options: readonly { value: string; label: string }[],
): SelectOption[] {
  return [{ value: null, label: 'הכול' }, ...options];
}

/** הרוחב המינימלי של רשימת אפשרויות פתוחה — קטן ממנו הטקסט נחתך. */
const MIN_DROPDOWN_WIDTH = 190;

/** מדד סיכום → הערך שנשלח לשרת בשדה MetricFocus. */
const METRIC_FOCUS_QUERY: Record<Exclude<MetricKey, ''>, string> = {
  open: 'OPEN',
  progress: 'PROGRESS',
  late: 'LATE',
  high: 'HIGH',
  // שני המדדים האלה מחושבים לפי התקופה שנבחרה.
  // "הושלמו" — כל המשימות שהושלמו בתקופה; "השלמה במועד" — אלה שהושלמו באיחור.
  completed: 'COMPLETED',
  rate: 'LATE_COMPLETED',
};

/** מצב ההתחלה של טופס "משימה חדשה" — נקודת הייחוס לזיהוי שינויים ביצירה. */
const EMPTY_CREATE_FORM = (): FormModel => ({
  title: '',
  description: '',
  team: '1',
  assigned: '',
  priority: 'MEDIUM',
  due: datePlus(3),
});

/** משך הצגת ספינר היצירה (PrimeNG) — פריים לכל 100ms. */
const CREATE_SPINNER_MS = 2000;

/** אורכי שדות — תואמים להגדרות ה-DB (CTRL_Tasks) */
const MAX_TITLE = 150;
const MAX_DESCRIPTION = 2000;

/* ===================== עזרי תאריך וטקסט ===================== */

function today(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const val = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
  return `${val('year')}-${val('month')}-${val('day')}`;
}

function datePlus(days: number): string {
  const d = new Date(`${today()}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${a}T12:00:00Z`).getTime() - new Date(`${b}T12:00:00Z`).getTime()) / 86400000,
  );
}

/** "2026-11-16T09:00:00" → "2026-11-16" */
function isoDay(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

/* ===================== המרות מהשרת למודל התצוגה ===================== */

function fromDto(dto: TaskDto): Task {
  return {
    TaskID: dto.taskID,
    TaskTitle: dto.taskTitle,
    TaskDescription: dto.taskDescription ?? '',
    TeamID: dto.teamID,
    AssignedUserID: dto.assignedUserID,
    Priority: dto.priority as Priority,
    Status: dto.status as Status,
    DueDate: isoDay(dto.dueDate),
    CompletedDate: dto.completedDate,
    CancelledDate: dto.cancelledDate,
    SourceType: dto.sourceType as Source,
    SourceSystemCode: dto.sourceSystemCode,
    SourceEntityType: dto.sourceEntityType,
    SourceEntityID: dto.sourceEntityID,
    SourceURL: dto.sourceURL,
    MetricID: dto.metricID,
    CreatedBy: dto.createdBy,
    CreatedDate: dto.createdDate,
    UpdatedBy: dto.updatedBy,
    UpdatedDate: dto.updatedDate,
    RowVersion: dto.rowVersion,
    IsNewForMe: dto.isNewForMe ?? false,
  };
}

function historyFromDto(dto: TaskHistoryDto): HistoryEntry {
  return {
    HistoryID: dto.historyID,
    TaskID: dto.taskID,
    ActionType: dto.actionType as HistoryEntry['ActionType'],
    FieldName: dto.fieldName as TaskField | null,
    OldValue: dto.oldValue,
    NewValue: dto.newValue,
    ChangedBy: dto.changedBy,
    ChangedDate: dto.changedDate,
  };
}

/**
 * הוספת מנת המשך לסוף הרשימה, בלי כפילות (7.3.6.3, 7.3.6.8).
 * רשומה שנוספה בינתים ב-מנת קודמת (בגלל עדכון מקביל) לא תוצג פעמיים.
 */
function appendUnique(existing: Task[], incoming: Task[]): Task[] {
  const ids = new Set(existing.map((t) => t.TaskID));
  return [...existing, ...incoming.filter((t) => !ids.has(t.TaskID))];
}

function commentFromDto(dto: TaskCommentDto): CommentEntry {
  return {
    CommentID: dto.commentID,
    TaskID: dto.taskID,
    CommentText: dto.commentText,
    CreatedBy: dto.createdBy,
    CreatedDate: dto.createdDate,
  };
}

/* ===================== הרכיב ===================== */

@Component({
  selector: 'app-tasks-control',
  standalone: true,
  imports: [
    CommonModule,
    MessageModule,
    FormsModule,
    ProgressSpinnerModule,
    ConfirmDialogModule,
    CheckboxModule,
    SelectModule,
    MultiSelectModule,
  ],
  // providers ברמת הרכיב — כדי שכל רכיב לא יחלוק את אותו ConfirmationService
  providers: [ConfirmationService],
  templateUrl: './tasks-control.component.html',
  styleUrl: './tasks-control.component.scss',
})
export class TasksControlComponent implements OnInit, OnDestroy {
  private readonly api = inject(TaskApiService);
  private readonly notify = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly injectorRef = inject(Injector);
  private readonly elRef = inject(ElementRef<HTMLElement>);

  readonly viewTabs = VIEW_TABS;
  readonly sortColumns = SORT_COLUMNS;
  readonly periods = PERIODS;

  readonly statusLabels = STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly sourceLabels = SOURCE_LABELS;
  readonly deadlineLabels = DEADLINE_LABELS;
  readonly detailDeadlineLabels = DETAIL_DEADLINE_LABELS;
  readonly historyLabels = HISTORY_LABELS;
  readonly historyFieldLabels = HISTORY_FIELD_LABELS;

  readonly statusOptions = (Object.keys(STATUS_LABELS) as Status[]).map((k) => ({
    value: k,
    label: STATUS_LABELS[k],
  }));
  readonly priorityOptions = (Object.keys(PRIORITY_LABELS) as Priority[]).map((k) => ({
    value: k,
    label: PRIORITY_LABELS[k],
  }));
  readonly sourceOptions = (Object.keys(SOURCE_LABELS) as Source[]).map((k) => ({
    value: k,
    label: SOURCE_LABELS[k],
  }));
  readonly stateLabels: Record<string, string> = {
    late: 'באיחור',
    today: 'להשלמה היום',
    soon: 'מתקרבת ליעד',
  };
  readonly stateOptions = Object.keys(this.stateLabels).map((k) => ({
    value: k,
    label: this.stateLabels[k],
  }));

  /* ----- נתונים מהשרת ----- */
  private readonly store = signal<TaskStore>({ tasks: [], comments: [], histories: [] });
  readonly loading = signal(true);
  /** כשל בטעינת הרשימה — מוצג במקום "לא נמצאו משימות", עם אפשרות ניסיון חוזר (7.3.8.3). */
  readonly loadError = signal(false);

  private readonly teamsSignal = signal<Team[]>([]);
  private readonly peopleSignal = signal<Person[]>([]);

  /** getters לתאימות לתבנית: ה-HTML משתמש ב-teams / people. */
  get teams(): Team[] {
    return this.teamsSignal();
  }
  get people(): Person[] {
    return this.peopleSignal();
  }

  /* ----- מצב המסך ----- */
  readonly role = signal<Role>('admin');

  /**
   * המשתמש שנחשב "אני" — הבסיס לתצוגת "המשימות שלי".
   * כרגע זה העובד הראשון בקטלוג (user-1), כי אין עדיין אימות אמיתי שמזהה
   * את המחובר. כשיהיה אימות — לעדכן כאן לפי הזהות שהשרת מחזיר.
   */
  readonly currentUserId = signal(CURRENT_USER_ID);

  /** "המשימות שלי" — לפי המשתמש הנוכחי, או לפי עובד שנבחר ידנית. */
  readonly user = signal(CURRENT_USER_ID);
  readonly teamRole = signal(1);
  readonly view = signal<View>((localStorage.getItem(VIEW_STORAGE) as View) || 'ALL');
  readonly period = signal(30);
  readonly keyword = signal('');
  readonly filters = signal<Filters>(EMPTY_FILTERS());
  readonly sort = signal<keyof Task>('DueDate');
  readonly direction = signal<'asc' | 'desc'>('asc');
  /** מספר השורות שכבר נטענו (מרווח הדפדוף) — גדל ב-"טען עוד" בלבד. */
  readonly loaded = signal(PAGE_SIZE);
  readonly metricFocus = signal<MetricKey | ''>('');
  readonly commentsDraft = signal('');

  /* ----- חלוניות ----- */
  readonly modalTitle = signal<string | null>(null);
  readonly detailId = signal<number | null>(null);
  readonly detailTab = signal('info');
  readonly editingId = signal<number | null>(null);
  readonly form = signal<FormModel | null>(null);
  readonly working = signal(false);

  /** שגיאות ולידציה לפי שדה — מוצגות מתחת לכל שדה עם PrimeNG Message. */
  readonly formErrors = signal<FormErrors>({});

  /** ספינר PrimeNG המוצג במרכז המסך בזמן יצירת משימה. */
  readonly creating = signal(false);

  /** צילום מצב הטופס ברגע הפתיחה — לזיהוי שינויים שלא נשמרו. */
  private readonly formSnapshot = signal<string>('');

  ngOnInit(): void {
    this.loadLookups();
    this.wireTableRequests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ===================== טעינה מהשרת ===================== */

  // זרמי "טען מחדש" — כל שינוי בסינון/מיון/תצוגה פולט, והבקשה הקודמת מתבטלת.
  // reset = רשימה חדשה מהתחלה; append = מנת המשך שנדבקת לסוף הרשימה הקיימת.
  private readonly listReq = new Subject<'reset' | 'append'>();
  private readonly metricsReq = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  /** מנה נוספת בדרך (7.3.6.4) — חוסם לחיצה כפולה על "טען עוד". */
  readonly loadingMore = signal(false);

  /**
   * סך הרשומות שמתאימות לסינון הנוכחי (לפני דפדוף) — מגיע מהשרת.
   * משמש להצגת "מוצגות X מתוך Y" ולהחלטה אם להציג "טען עוד".
   */
  readonly totalCount = signal(0);

  /** חיבור הזרמים: כל בקשה חדשה מבטלת את הקודמת שעוד לא חזרה. */
  private wireTableRequests(): void {
    this.listReq
      .pipe(
        switchMap((mode) => {
          if (mode === 'reset') this.loading.set(true);
          else this.loadingMore.set(true);

          // מנת המשך מבקשת מה-skip ואילך; "טען עוד" לא מגדיל את take,
          // אלא קורא לעוד מנה בגודל PAGE_SIZE (7.3.6.3).
          const query =
            mode === 'append'
              ? { ...this.buildQuery(), skip: this.store().tasks.length, take: PAGE_SIZE }
              : this.buildQuery();

          return forkJoin({
            mode: of(mode),
            rows: this.api.getAll(query).pipe(
              catchError((err) => {
                console.error('טעינת משימות נכשלה', err);
                this.notify.error('שגיאה בטעינת המשימות מהשרת');
                return of(null);
              }),
            ),
            // סך הרשומות לסינון הזה — מאותו רגע, כדי שהמספר לא "יקפוץ" בין בקשות
            total: this.api.count(query).pipe(catchError(() => of(null))),
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(({ mode, rows, total }) => {
        if (mode === 'reset') {
          // כשל בטעינה ראשונית — לא מוחקים את הרשימה הקודמת: מצב השגיאה מוצג למשתמש.
          this.loadError.set(rows === null);
          if (rows) this.store.update((s) => ({ ...s, tasks: rows.map(fromDto) }));
          if (total !== null) this.totalCount.set(total);
          this.loading.set(false);
          return;
        }

        // מנת המשך: מצטרפת לסוף בלי למחוק את הקיימות, ומסוננת מכפילויות (7.3.6.3, 7.3.6.8)
        if (rows) {
          this.store.update((s) => ({ ...s, tasks: appendUnique(s.tasks, rows.map(fromDto)) }));
        }
        if (total !== null) this.totalCount.set(total);
        this.loadingMore.set(false);
      });

    this.metricsReq
      .pipe(
        switchMap(() =>
          this.api.getMetrics(this.period()).pipe(
            catchError((err) => {
              console.error('טעינת מדדים נכשלה', err);
              return of(null);
            }),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((m) => this.metrics.set(m));

    // כל אות־מצב שמשפיע על השאילתה מפעיל בקשה חדשה
    this.track(() => [
      this.view(),
      this.keyword(),
      this.filters(),
      this.sort(),
      this.direction(),
      this.loaded(),
      this.metricFocus(),
      this.period(),
    ]);

    this.requestList();
  }

  /** קריאה מפורשת לרענון — מהסרגל ומאחרי שינוי בנתונים. תמיד מהתחלה. */
  requestList(): void {
    this.loaded.set(PAGE_SIZE);
    this.listReq.next('reset');
    this.metricsReq.next();
  }

  /**
   * רענון אחרי שהשרת שינה נתונים (יצירה / עדכון / שינוי סטטוס / תגובה).
   * הרשימה והמדדים נטענים מחדש לפי הסינון הנוכחי, ובהמשך מסומנת הצפייה במשימה ששונתה
   * — כדי שהתג "חדש" לא יופיע על שינוי שהמשתמש עצמו ביצע.
   */
  private refreshAfterChange(taskId?: number): void {
    if (taskId == null) {
      this.requestList();
      return;
    }

    this.api.markViewed(taskId).subscribe({
      next: () => this.requestList(),
      error: (err) => {
        console.error('סימון הצפייה נכשל', err);
        this.requestList();
      },
    });
  }

  /**
   * מגיבים לשינוי כלשהו בפרמטרי התצוגה — הטבלה נטענת מחדש.
   * `allowSignalWrites` נדרש כי בקשת הרענון (switchMap) כותבת ל-`loading` בזמן שהאפקט רץ;
   * השאילתה עצמה נבנית רק בזרף, לא באפקט.
   */
  private track(getter: () => unknown): void {
    effect(
      () => {
        getter();
        // כל שינוי בתצוגה/חיפוש/סינון/מיון מתחיל רשימה חדשה (7.3.6.6)
        this.loaded.set(PAGE_SIZE);
        this.listReq.next('reset');
        this.metricsReq.next();
      },
      { injector: this.injectorRef, allowSignalWrites: true },
    );
  }

  /** בניית שאילתת השרת ממצב המסך. */
  private buildQuery(): TaskQuery {
    const f = this.filters();
    const view = this.view();
    const focus = this.metricFocus();

    const query: TaskQuery = {
      search: this.keyword() || null,
      status: f.status.length ? f.status : null,
      priority: f.priority.length ? f.priority : null,
      sourceType: f.source.length ? f.source : null,
      state: f.state.length ? f.state.map((s) => s.toUpperCase()) : null,
      teamID: f.team ? +f.team : null,
      // ב"המשימות שלי" המשתמש הנבחר משמש כזהות; בסינון רגיל הוא מסנן רגיל.
      assignedUserID: f.worker || (view === 'MY_TASKS' ? this.user() : null),
      dueFrom: f.dueFrom || null,
      dueTo: f.dueTo || null,
      // "המשימות שלי" — לפי המשתמש המחובר. בזמן פיתוח הזהות היא "dev-user-1"
      // ואין לה משימות משויכות, ולכן נשלח גם המשתמש שנבחר במסך; השרת משתמש בו
      // רק עבור משתמש הפיתוח. באימות אמיתי הוא מתעלם ממנו (7.1.1).
      mineOnly: view === 'MY_TASKS',
      overdueOnly: view === 'OVERDUE',
      // מדד סיכום — שכבה נוספת בשרת, לא דריסה של בחירות המשתמש (7.3.3.5).
      // "מדד האיחור" מקביל לתצוגה OVERDUE, ולכן לא נשלח פעמיים.
      metricFocus: focus ? METRIC_FOCUS_QUERY[focus] || null : null,
      period: this.period(),
      sortKey: String(this.sort()),
      sortDirection: this.direction(),
      skip: 0,
      take: this.loaded(),
    };

    return query;
  }

  private loadLookups(): void {
    this.api.getLookups().subscribe({
      next: (l) => {
        this.teamsSignal.set(l.teams.map((t) => ({ id: Number(t.value), name: t.label })));
        this.peopleSignal.set(
          l.people.map((p) => ({ id: p.value, name: p.label, team: p.teamID ?? 0 })),
        );
      },
      error: (err) => console.error('טעינת קטלוגים נכשלה', err),
    });
  }

  private loadComments(taskId: number): void {
    this.api.getComments(taskId).subscribe({
      next: (rows) => {
        const mapped = rows.map(commentFromDto);
        this.store.update((s) => ({
          ...s,
          comments: [...s.comments.filter((c) => c.TaskID !== taskId), ...mapped],
        }));
      },
      error: (err) => console.error('טעינת הערות נכשלה', err),
    });
  }

  /** מונה בקשות היסטוריה לכל משימה — מבטיח שרק התשובה האחרונה נכנסת ל-store. */
  private readonly historyLoadSeq = new Map<number, number>();

  private loadHistory(taskId: number): void {
    const seq = (this.historyLoadSeq.get(taskId) ?? 0) + 1;
    this.historyLoadSeq.set(taskId, seq);

    this.api.getHistory(taskId).subscribe({
      next: (rows) => {
        // עותק של התשובה האחרונה בלבד — לא צוברים. השרת כבר מחזיר את היומן המלא
        // של המשימה; איחוד עם טעינה קודמת היה יוצר רשומות כפולות כשיש שתי בקשות
        // במקביל (למשל שינוי סטטוס בזמן שהחלון פתוח — רענון + טעינה של הלשונית).
        // תיקון הגנתי: אם השרת עדיין מחזיר שתי רשומות "יצירת משימה" זהות
        // (כפילויות שנכתבו לפני התיקון בשרת), מוצגת רק הראשונה.
        const mapped = rows.map(historyFromDto);
        const seenId = new Set<number>();
        const seenCreate = new Set<string>();
        const unique = mapped.filter((h) => {
          if (seenId.has(h.HistoryID)) return false;
          seenId.add(h.HistoryID);

          if (h.ActionType === 'CREATE') {
            const key = h.ChangedDate;
            if (seenCreate.has(key)) return false;
            seenCreate.add(key);
          }
          return true;
        });

        this.store.update((s) => {
          // הגנה מפני תגובה שמגיעה באיחור אחרי תגובה עדכנית יותר
          if (this.historyLoadSeq.get(taskId) !== seq) return s;
          return {
            ...s,
            histories: [...s.histories.filter((h) => h.TaskID !== taskId), ...unique],
          };
        });
      },
      error: (err) => console.error('טעינת היסטוריה נכשלה', err),
    });
  }

  /* ===================== עזרי תצוגה ===================== */

  teamName(id: number | null): string {
    return this.teamsSignal().find((t) => t.id === Number(id))?.name ?? 'ללא צוות';
  }

  userName(id: string | null): string {
    return this.peopleSignal().find((p) => p.id === id)?.name ?? id ?? 'לא שויך';
  }

  formatNumber(n: number): string {
    return new Intl.NumberFormat('he-IL').format(n);
  }

  dateText(d: string | null): string {
    return d ? d.slice(0, 10).split('-').reverse().join('.') : '—';
  }

  dateTimeText(d: string): string {
    return new Date(d).toLocaleString('he-IL');
  }

  isActive(t: Task): boolean {
    return t.Status === 'OPEN' || t.Status === 'IN_PROGRESS';
  }

  deadline(t: Task): Deadline {
    if (!this.isActive(t)) return '';
    const d = daysBetween(t.DueDate, today());
    return d < 0 ? 'late' : d === 0 ? 'today' : d <= 3 ? 'soon' : '';
  }

  deadlineLabel(d: Deadline): string {
    return d ? DEADLINE_LABELS[d] : '';
  }

  detailDeadlineLabel(d: Deadline): string {
    return d ? DETAIL_DEADLINE_LABELS[d] : '';
  }

  pillClass(status: Status): string {
    switch (status) {
      case 'OPEN':
        return 'open';
      case 'IN_PROGRESS':
        return 'progress';
      case 'COMPLETED':
        return 'completed';
      default:
        return 'cancelled';
    }
  }

  priorityClass(p: Priority): string {
    return p === 'URGENT' ? 'priority-urgent' : p === 'HIGH' ? 'priority-high' : '';
  }

  allowed(t: Task): boolean {
    const role = this.role();
    if (role === 'admin') return true;
    if (role === 'manager') return t.TeamID === this.teamRole();
    return t.AssignedUserID === this.user();
  }

  canFilterByTeam(): boolean {
    return this.role() === 'admin';
  }

  teamFilterOptions(): { value: number; label: string }[] {
    return this.teamsSignal()
      .filter((t) => this.role() === 'admin' || t.id === this.teamRole())
      .map((t) => ({ value: t.id, label: t.name }));
  }

  workerFilterOptions(): { value: string; label: string }[] {
    const team = this.filters().team;
    return this.peopleSignal()
      .filter(
        (p) =>
          // מספר הצוות מגיע מהרשימה כמספר — לכן השוואה ישירה, בלי המרה חוזרת.
          (!team || p.team === Number(team)) && (this.role() === 'admin' || p.team === this.teamRole()),
      )
      .map((p) => ({ value: p.id, label: p.name }));
  }

  workerOptionsForTeam(team: string): { value: string; label: string }[] {
    return this.peopleSignal()
      .filter((p) => p.team === +team)
      .map((p) => ({ value: p.id, label: p.name }));
  }

  /* רשימות האפשרויות של תיבות הבחירה (p-select) — כוללות תמיד שורת "הכול" */

  /** תצוגות ההרשאה — התווית של "עובד" כוללת את שם המשתמש הנוכחי. */
  roleSelectOptions(): { value: Role; label: string }[] {
    return [
      { value: 'admin', label: 'תצוגת מנהל בקרה' },
      { value: 'manager', label: 'תצוגת מנהל צוות 1' },
      { value: 'employee', label: 'תצוגת עובד – ' + this.myUserName() },
    ];
  }

  /** תקופות מדדי ההשלמה, בימים. */
  periodSelectOptions(): { value: number; label: string }[] {
    return this.periods.map((p) => ({ value: p, label: p + ' ימים' }));
  }

  /**
   * אפשרויות רב-בחירה (סטטוס / עדיפות / מקור / מצב טיפול).
   * בראש הרשימה עומדת שורת "הכול" (ערך null): בחירתה מחזירה את המסנן
   * למצבו ההתחלתי, ולכן הכפתור מציג תמיד "הכול" כברירת מחדל.
   */
  statusSelectOptions(): SelectOption[] {
    return withAllOption(this.statusOptions);
  }
  prioritySelectOptions(): SelectOption[] {
    return withAllOption(this.priorityOptions);
  }
  sourceSelectOptions(): SelectOption[] {
    return withAllOption(this.sourceOptions);
  }
  stateSelectOptions(): SelectOption[] {
    return withAllOption(this.stateOptions);
  }

  /** אפשרויות "צוות מטפל" — בחירת צוות נוסף על הקיים. */
  teamSelectOptions(): { value: number | null; label: string }[] {
    return [{ value: null, label: 'הכול' }, ...this.teamFilterOptions()];
  }

  /** אפשרויות "עובד אחראי" — בחירת עובד נוסף על הקיים. */
  workerSelectOptions(): { value: string | null; label: string }[] {
    return [{ value: null, label: 'הכול' }, ...this.workerFilterOptions()];
  }

  /* ===================== רשימה ומדדים (מהשרת) ===================== */

  /**
   * השורות שחזרו מהשרת — כבר מסוננות, ממוינות ומדפדפות.
   * אין סינון או מיון מקומי: כל בקשה מחזירה בדיוק את מה שמוצג.
   */
  readonly allFiltered = computed(() => this.store().tasks);
  readonly visibleTasks = computed(() => this.store().tasks);

  /** כמה עוד לא נטענו — עבור כפתור "טען עוד". */
  readonly hasMore = computed(() => this.totalCount() > this.allFiltered().length);

  /** מדדי התצוגה העליונה — מחושבים בשרת על כל קבוצת הנתונים, ללא סינון הטבלה. */
  readonly metrics = signal<TaskMetricsDto | null>(null);

  readonly kpis = computed<Kpi[]>(() => {
    const m = this.metrics();
    return [
      { key: 'open', label: 'משימות פתוחות', n: m?.open ?? '—' },
      { key: 'progress', label: 'משימות בטיפול', n: m?.inProgress ?? '—' },
      { key: 'late', label: 'משימות באיחור', n: m?.late ?? '—' },
      { key: 'high', label: 'בעדיפות גבוהה', n: m?.highPriority ?? '—' },
      { key: 'completed', label: 'משימות שהושלמו', n: m?.completed ?? '—' },
      {
        key: 'rate',
        label: 'השלמה במועד',
        n: m?.onTimeRatePercent != null ? `${m.onTimeRatePercent}%` : '—',
      },
    ];
  });

  /* ===================== פעולות סרגל וסינון ===================== */

  setRole(value: string): void {
    const role = value as Role;
    this.role.set(role);
    this.view.set('MY_TASKS');
    this.filters.set(EMPTY_FILTERS());
    this.keyword.set('');
    this.metricFocus.set('');
    this.loaded.set(PAGE_SIZE);

    // "עובד" = האדם שבכותרת. שאר התצוגות (מנהל בקרה / מנהל צוות) הן של אחרים,
    // ולכן "המשימות שלי" בהן מוצג לפי העובד הנוכחי ולא לפי מנהל כלשהו.
    if (role === 'employee') this.user.set(this.currentUserId());
  }

  /** שם המשתמש הנוכחי לפי הקטלוג — לתצוגה בסרגל. */
  readonly myUserName = computed(() => {
    const id = this.currentUserId();
    return this.peopleSignal().find((p) => p.id === id)?.name ?? id;
  });

  setView(v: View): void {
    this.view.set(v);
    localStorage.setItem(VIEW_STORAGE, v);
    // המסננים נשארים ומוחלים על התצוגה החדשה (7.3.5.5)
    this.loaded.set(PAGE_SIZE);
  }

  onSearch(value: string): void {
    this.keyword.set(value);
    this.loaded.set(PAGE_SIZE);
  }

  /**
   * סימון תיבת הבחירה במסנן מרובה-ערכים. "הכול" מסומן כשאין בחירה,
   * וערך רגיל — כשהוא נמצא ברשימת המסנן (ערכים ריקים ו-null אינם נחשבים).
   */
  isOptionChecked(item: unknown, values: readonly string[]): boolean {
    if (this.isAllItem(item)) {
      return values.length === 0;
    }
    const value = this.optionValueOf(item);
    return value !== null && values.includes(value);
  }

  /** הערך של שורת רשימה — בין אם הגיע כאובייקט אפשרות ובין אם כערך בודד. */
  private optionValueOf(item: unknown): string | null {
    const value =
      item !== null && typeof item === 'object'
        ? (item as { value?: unknown }).value
        : item;
    return value == null || value === '' ? null : String(value);
  }

  /** האם השורה ברשימה היא "הכול" (ערך null) — שורת ברירת המחדל. */
  isAllItem(item: unknown): boolean {
    // PrimeNG מעביר לתבנית לעיתים את האובייקט עצמו ולעיתים את הערך בלבד —
    // null, מחרוזת ריקה ופרמטר חסר נחשבים כולם "הכול".
    if (item === null || item === undefined) {
      return true;
    }
    if (typeof item !== 'object') {
      return !item;
    }
    const value = (item as { value?: unknown }).value;
    return value == null || value === '';
  }

  /** סימון תיבת הבחירה בתיבת בחירה יחידה, כולל שורת "הכול" (ערך ריק). */
  isSingleChecked(item: unknown, current: string): boolean {
    return this.isAllItem(item) ? !current : this.optionValueOf(item) === current;
  }

  /**
   * עדכון מסנן מרובה מ-p-multiSelect. הערך שמגיע הוא תמיד מערך של ערכי
   * optionValue, אך מנורמל כאן ליתר ביטחון: אובייקט אפשרות / ערך בודד
   * מומרים גם הם לרשימת מחרוזות.
   */
  onMultiOptionChange(
    key: 'status' | 'priority' | 'source' | 'state',
    value: unknown,
  ): void {
    const raw = Array.isArray(value) ? value : [value];
    const list = raw
      .map((v) =>
        v !== null && typeof v === 'object' ? (v as { value?: unknown }).value : v,
      )
      .filter((v): v is string => typeof v === 'string' && v !== '');
    this.setMultiFilter(key, list);
  }

  /**
   * מסננים מרובי־ערכים (סטטוס / עדיפות / מקור / מצב טיפול) — מערך מחרוזות.
   * ערך null מגיע משורת "הכול" ומשמעותו: ביטול המסנן.
   */
  setMultiFilter(
    key: 'status' | 'priority' | 'source' | 'state',
    value: readonly (string | null)[] | null,
  ): void {
    const list = Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string' && v !== '')
      : [];
    this.filters.update((f) => ({ ...f, [key]: list }));
    this.loaded.set(PAGE_SIZE);
  }

  /**
   * פתיחת רשימת ה-p-select — הרשימה נפתחת ב-body, מחוץ לרכיב,
   * ולכן רוחבה נקבע כאן לפי רוחב השדה שפתח אותה (כמו בפאנלי הסינון הקודמים).
   */
  sizePanelOverlay(): void {
    const doc: Document = this.elRef.nativeElement.ownerDocument;
    const overlays = doc.querySelectorAll<HTMLElement>('.tasks-dd');
    overlays.forEach((panel) => {
      const wrapper: HTMLElement =
        (panel.closest('.p-connected-overlay') as HTMLElement | null) ?? panel;
      // רוחב הרשימה = רוחב השדה שנפתח, ולא פחות מהרוחב המינימלי של התפריט
      const width = Math.max(
        Math.round(wrapper.getBoundingClientRect().width),
        MIN_DROPDOWN_WIDTH,
      );
      const targets: HTMLElement[] = [wrapper, panel];
      targets.forEach((el) => {
        el.style.width = width + 'px';
        el.style.minWidth = width + 'px';
        el.style.maxWidth = width + 'px';
      });
    });
  }

  /** התווית של תיבת בחירה יחידה — "הכול" כברירת מחדל (ערך ריק). */
  singleLabel(value: string, options: readonly { value: unknown; label: string }[]): string {
    if (!value) {
      return 'הכול';
    }
    return options.find((o) => String(o.value) === value)?.label ?? value;
  }

  /** טקסט תצוגה על כפתור המסנן: "הכול" כשאין בחירה, אחרת התוויות הנבחרות. */
  filterSummary(values: readonly string[], labels: Record<string, string>): string {
    if (!values.length) {
      return 'הכול';
    }
    return values.map((v) => labels[v] ?? v).join(', ');
  }

  /** מסנני בחירה יחידה (צוות / עובד / טווח תאריכים) — מחרוזת או תאריך. */
  setFilter(key: 'team' | 'worker' | 'dueFrom' | 'dueTo', value: string | number | null): void {
    // "הכול" מגיע כ-null מתיבת הבחירה — נשמור מחרוזת ריקה כמו קודם.
    this.filters.update((f) => ({ ...f, [key]: value == null ? '' : String(value) }));
    this.loaded.set(PAGE_SIZE);
  }

  /**
   * "ניקוי מסננים" (7.3.4.5) — מאפס חיפוש ומסננים בלבד.
   * תצוגה מהירה ומדד שנבחר (metricFocus) נשארים כפי שהם.
   */
  clearFilters(): void {
    this.keyword.set('');
    this.filters.set(EMPTY_FILTERS());
    this.loaded.set(PAGE_SIZE);
  }

  toggleMetric(key: MetricKey): void {
    // לחיצה על מדד אינה מבטלת את מסנני המשתמש — הם ממשיכים לחול יחד עם המדד.
    // שני המדדים האחרונים ("הושלמו" / "השלמה במועד") מסוננים לפי אותן משימות,
    // ולכן לחיצה על האחד כשהוא פעיל אינה מבטלת את הסינון של השני.
    const next = this.metricFocus() === key ? '' : key;
    this.metricFocus.set(next);
    // האפקט של track מזהה את השינוי ומבצע רענון; אין צורך ברענון כפול כאן.
  }

  setSort(key: keyof Task): void {
    if (this.sort() === key) {
      this.direction.set(this.direction() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sort.set(key);
      this.direction.set('asc');
    }
    this.loaded.set(PAGE_SIZE);
  }

  /**
   * "טען עוד" (7.3.6.2–5) — מבקש מנה נוספת של PAGE_SIZE מה-skip הנוכחי
   * ומצרף אותה לסוף הרשימה. הרשומות הקיימות אינן נמחקות, והכפתור חסום בזמן הטעינה.
   */
  loadMore(): void {
    if (this.loadingMore() || this.loading() || !this.hasMore()) return;
    this.listReq.next('append');
  }

  /** ניסיון חוזר אחרי כשל טעינה (7.3.8.3). */
  retryLoad(): void {
    this.loadError.set(false);
    this.requestList();
  }

  refresh(): void {
    this.requestList();
    this.notify.success('הנתונים רועננו מהשרת');
  }

  /** הכפתור הישן "איפוס נתוני הדמו" — כעת טוען מחדש מהשרת. */
  resetDemo(): void {
    this.role.set('admin');
    this.view.set('ALL');
    this.period.set(30);
    this.loaded.set(PAGE_SIZE);
    this.metricFocus.set('');
    this.clearFilters();
    this.closeModal();
    this.requestList();
    this.notify.success('הנתונים נטענו מחדש');
  }

  /* ===================== חלוניות ===================== */

  /** צילום מצב הטופס הנוכחי — נקודת הייחוס לזיהוי שינויים. */
  private takeFormSnapshot(): void {
    this.formSnapshot.set(JSON.stringify(this.form()));
  }

  /**
   * האם יש שינויים שלא נשמרו.
   * mode === 'create' — משווים את הטופס למצב הפתיחה של יצירה,
   * כך שגם שינוי ואז החזרה לערך המקורי נחשב "ללא שינויים".
   * other modes — משווים לצילום שנלקח ברגע הפתיחה.
   */
  private hasUnsavedChanges(mode: 'create' | 'edit' | 'detail' = 'edit'): boolean {
    if (mode === 'detail') {
      // בפרטי משימה אין טופס — רק טיוטת הערה חוסמת סגירה
      return this.commentsDraft().trim().length > 0;
    }

    const f = this.form();
    if (!f) return false;

    const baseline = mode === 'create' ? JSON.stringify(EMPTY_CREATE_FORM()) : this.formSnapshot();
    return JSON.stringify(f) !== baseline;
  }

  /**
   * ביטול השינויים בטופס.
   * בעריכה — חזרה לתצוגת הפרטים; ביצירה — סגירת החלון.
   * לא נוגעים בטיוטת ההערה: היא שייכת לטאב ההערות בפרטים.
   */
  private discardForm(): void {
    const id = this.editingId();
    this.form.set(null);
    this.formSnapshot.set('');
    this.formErrors.set({});

    if (id) {
      this.openDetails(id, this.detailTab());
      return;
    }

    // יצירה — סגירת החלון
    this.modalTitle.set(null);
    this.detailId.set(null);
    this.detailTab.set('info');
    this.editingId.set(null);
  }

  closeModal(): void {
    // סגירה עם שינויים שלא נשמרו — מבקשים אישור
    const mode = this.form() ? (this.editingId() ? 'edit' : 'create') : 'detail';
    if (!this.hasUnsavedChanges(mode)) {
      this.discardForm();
      this.commentsDraft.set('');
      return;
    }

    this.confirmDiscard('close');
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeModal();
  }

  /** כפתור "ביטול" בטופס: חזרה לפרטים בעריכה, סגירה ביצירה. */
  cancelForm(): void {
    const mode = this.editingId() ? 'edit' : 'create';
    if (!this.hasUnsavedChanges(mode)) {
      this.discardForm();
      return;
    }

    this.confirmDiscard('cancel');
  }

  /** חלון אישור לביטול שינויים שלא נשמרו — באותו עיצוב של כל האתר. */
  private confirmDiscard(action: 'cancel' | 'close'): void {
    const isCreate = !this.editingId();

    this.confirmationService.confirm({
      header: 'ביטול השינויים',
      message: isCreate
        ? 'מילאת פרטים בטופס המשימה החדשה. ' + 'האם לבטל את השינויים ולסגור את החלון?'
        : 'ביצעת שינויים בפרטי המשימה. ' + 'האם לבטל את השינויים ולצאת מהעריכה?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'כן, בטל',
      rejectLabel: 'המשך בעריכה',
      acceptButtonStyleClass: 'dm-confirm__accept',
      rejectButtonStyleClass: 'dm-confirm__reject',
      dismissableMask: true,
      accept: () => {
        this.discardForm();
        // סגירת החלון כולו מנקה גם את הטיוטה; ביטול טופס משאיר אותה
        if (action === 'close') {
          this.commentsDraft.set('');
        }
      },
    });
  }

  /* ===================== יצירה ועריכה ===================== */

  openCreate(): void {
    this.detailId.set(null);
    this.editingId.set(null);
    // טיוטת הערה שנשארה ממשימה קודמת לא אמורה "לחסום" סגירה של יצירה חדשה
    this.commentsDraft.set('');
    this.formErrors.set({});
    this.form.set(EMPTY_CREATE_FORM());
    this.takeFormSnapshot();
    this.modalTitle.set('יצירת משימה חדשה');
  }

  openEdit(id: number): void {
    const t = this.store().tasks.find((x) => x.TaskID === id);
    if (!t || !this.isActive(t)) {
      this.notify.warn('עריכה אינה זמינה במצב זה');
      return;
    }
    this.editingId.set(id);
    this.formErrors.set({});
    this.form.set({
      title: t.TaskTitle,
      description: t.TaskDescription,
      team: String(t.TeamID),
      assigned: t.AssignedUserID ?? '',
      priority: t.Priority,
      due: t.DueDate,
    });
    this.takeFormSnapshot();
    this.modalTitle.set(`עריכת משימה #${id}`);
  }

  updateForm<K extends keyof FormModel>(key: K, value: FormModel[K]): void {
    this.form.update((f) => (f ? { ...f, [key]: value } : f));

    // עריכת שדה מנקה את שגיאת הוולידציה שלו — שההודעה לא "תיתקע"
    const errors = this.formErrors();
    if (errors[key]) {
      this.formErrors.update((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  }

  onFormTeamChange(team: string | number): void {
    const value = String(team);
    this.form.update((f) => (f ? { ...f, team: value, assigned: '' } : f));

    // בחירת צוות מאפסת את העובד — וגם את השגיאות של שניהם
    this.formErrors.update((e) => {
      const next = { ...e };
      delete next.team;
      delete next.assigned;
      return next;
    });
  }

  get editingTask(): Task | null {
    const id = this.editingId();
    return id ? this.store().tasks.find((x) => x.TaskID === id) ?? null : null;
  }

  /**
   * בדיקת כל שדות הטופס — אותה לוגיקה כמו בשרת (TasksController.Create),
   * כדי שהמשתמש יראה מה לא תקין מתחת לשדה עצמו, בלי המתנה לתשובת השרת.
   * @returns true אם כל השדות תקינים
   */
  private validateTaskForm(f: FormModel): boolean {
    const errors: FormErrors = {};
    const title = f.title.trim();
    const team = +f.team;
    const assigned = f.assigned;
    const due = f.due;

    if (!title) {
      errors.title = 'נושא המשימה הוא שדה חובה';
    } else if (title.length > MAX_TITLE) {
      errors.title = `נושא המשימה ארוך מדי (עד ${MAX_TITLE} תווים)`;
    }

    if (f.description.trim().length > MAX_DESCRIPTION) {
      errors.description = `תיאור המשימה ארוך מדי (עד ${MAX_DESCRIPTION} תווים)`;
    }

    if (!f.team || Number.isNaN(team)) {
      errors.team = 'יש לבחור צוות מטפל';
    }

    if (assigned) {
      const person = this.peopleSignal().find((p) => p.id === assigned);
      if (!person || person.team !== team) {
        errors.assigned = 'העובד שנבחר אינו משויך לצוות שנבחר';
      }
    }

    if (!f.priority) {
      errors.priority = 'יש לבחור עדיפות';
    }

    if (!due) {
      errors.due = 'תאריך יעד הוא שדה חובה';
    } else if (due < today()) {
      errors.due = 'תאריך יעד לא יכול להיות מוקדם מהיום';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  saveTaskForm(): void {
    if (this.working()) return;
    const f = this.form();
    const id = this.editingId();
    if (!f) return;

    const title = f.title.trim();
    const description = f.description.trim();
    const team = +f.team;
    const assigned = f.assigned || null;
    const due = f.due;

    // ולידציה מקומית — שגיאה תוצג מתחת לשדה עצמו (PrimeNG Message)
    if (!this.validateTaskForm(f)) return;

    if (!id) {
      this.working.set(true);
      this.creating.set(true);
      this.startCreateSpinner();

      this.api
        .create({
          taskTitle: title,
          taskDescription: description || null,
          teamID: team,
          assignedUserID: assigned,
          priority: f.priority,
          dueDate: due,
        })
        .subscribe({
          next: (created) => {
            this.refreshAfterChange(created.taskID);
            const mapped = fromDto(created);
            this.finishCreate(() => {
              this.formSnapshot.set('');
              this.form.set(null);
              this.formErrors.set({});
              // פתיחה בלשונית "פרטי משימה" (ברירת המחדל). ההיסטוריה נטענת בכל פתיחה,
              // ולכן היא מוכנה גם אם המשתמש עובר אליה מיד.
              this.openDetails(mapped.TaskID);
              this.notify.success('המשימה נוצרה');
            });
          },
          error: (err) => {
            this.finishCreate(() => {
              console.error('יצירה נכשלה', err);
              this.notify.errorFromServer(err, 'יצירת המשימה נכשלה');
            });
          },
        });
      return;
    }

    const current = this.store().tasks.find((x) => x.TaskID === id);
    if (!current || !this.allowed(current)) {
      this.notify.warn('אין הרשאה לעריכת המשימה');
      return;
    }
    if (!this.isActive(current)) {
      this.notify.warn('יש לפתוח את המשימה מחדש לפני עריכה');
      return;
    }

    this.working.set(true);
    this.api
      .update(id, {
        taskTitle: title,
        taskDescription: description,
        teamID: team,
        assignedUserID: assigned,
        priority: f.priority,
        dueDate: due,
        rowVersion: current.RowVersion,
      })
      .subscribe({
        next: () => {
          // העדכון עשוי לשנות מיון או סינון (למשל תאריך יעד) — הרשימה נטענת מחדש מהשרת.
          this.refreshAfterChange(id);
          this.working.set(false);
          this.formSnapshot.set('');
          this.formErrors.set({});
          this.openDetails(id, this.detailTab());
          this.notify.success('פרטי המשימה עודכנו');
        },
        error: (err) => {
          this.working.set(false);
          console.error('עדכון נכשל', err);
          this.notify.errorFromServer(err, 'עדכון המשימה נכשל. ייתכן שהמשימה שונתה בינתיים.');
        },
      });
  }

  private createStartedAt = 0;

  private startCreateSpinner(): void {
    this.createStartedAt = Date.now();
  }

  private finishCreate(done: () => void): void {
    const remaining = Math.max(0, CREATE_SPINNER_MS - (Date.now() - this.createStartedAt));
    setTimeout(() => {
      this.creating.set(false);
      this.working.set(false);
      done();
    }, remaining);
  }

  openDetails(id: number, tab = 'info'): void {
    const t = this.store().tasks.find((x) => x.TaskID === id);

    // המשימה לא נמצאת ברשימה המקומית (קישור ישיר / רשימה טרם נטענה) —
    // שולפים אותה מהשרת, כדי לא לוותר על פתיחת הפרטים.
    if (!t) {
      this.loadDetailsFromServer(id, tab);
      return;
    }

    if (!this.allowed(t)) {
      this.notify.warn('אין הרשאה לצפייה במשימה');
      return;
    }
    this.detailId.set(id);
    this.detailTab.set(tab);
    this.editingId.set(null);
    this.form.set(null);
    this.formSnapshot.set('');
    this.formErrors.set({});
    this.modalTitle.set(`משימה #${id} – ${t.TaskTitle}`);

    this.loadComments(id);

    if (tab === 'comments') {
      this.commentsDraft.set('');
    }

    // ההיסטוריה נטענת בכל פתיחה, ולא רק כשהיעד הוא לשונית ההיסטוריה:
    // המשתמש עובר ללשונית הזו בלי בקשה נוספת, והנתונים כבר עדכניים.
    this.loadHistory(id);

    this.markViewed(id);
  }

  /**
   * טעינת משימה בודדת מהשרת ופתיחת הפרטים שלה (GET api/Tasks/{id}).
   * משמשת כשהמשימה אינה ברשימה המקומית — למשל בפתיחה מקישור ישיר.
   * הכישלון מוצג כהודעה, וה-state המקומי לא משתנה.
   */
  private loadDetailsFromServer(id: number, tab: string): void {
    this.api.getById(id).subscribe({
      next: (dto) => {
        const task = fromDto(dto);
        this.store.update((s) => ({
          ...s,
          tasks: s.tasks.some((x) => x.TaskID === id)
            ? s.tasks
            : [...s.tasks, task],
        }));
        this.openDetails(id, tab);
      },
      error: (err) => {
        console.error('טעינת המשימה נכשלה', err);
        this.notify.warn('לא ניתן לטעון את המשימה, ייתכן שאין הרשאה לצפייה בה');
      },
    });
  }

  /**
   * סימון הצפייה בשרת. הסתברות כישלון אינה משבשת את העבודה,
   * ולכן שגיאה נרשמת ללוג בלבד. הסימון המקומי מתבצע אחרי שהשרת אישר,
   * כדי שהתג "חדש" לא ייעלם אם הכתיבה נכשלה.
   */
  private markViewed(id: number): void {
    const t = this.store().tasks.find((x) => x.TaskID === id);
    if (!t?.IsNewForMe) return;

    this.api.markViewed(id).subscribe({
      next: () => {
        this.store.update((s) => ({
          ...s,
          tasks: s.tasks.map((x) => (x.TaskID === id ? { ...x, IsNewForMe: false } : x)),
        }));
      },
      error: (err) => console.error('סימון הצפייה נכשל', err),
    });
  }

  get detailTask(): Task | null {
    const id = this.detailId();
    return id ? this.store().tasks.find((x) => x.TaskID === id) ?? null : null;
  }

  detailTabs(t: Task): DetailTab[] {
    return [
      { key: 'info', label: 'פרטי משימה' },
      {
        key: 'comments',
        label: `הערות (${this.store().comments.filter((c) => c.TaskID === t.TaskID).length})`,
      },
      { key: 'history', label: 'היסטוריית שינויים' },
    ];
  }

  detailTransitions(t: Task): StatusTransition[] {
    return TRANSITIONS[t.Status].map((s) => ({
      status: s,
      label: s === 'OPEN' ? 'פתיחה מחדש' : STATUS_LABELS[s],
      primary: s === 'CANCELLED',
    }));
  }

  detailHistory(t: Task): HistoryEntry[] {
    return this.store()
      .histories.filter((x) => x.TaskID === t.TaskID)
      .slice()
      .sort((a, b) => b.ChangedDate.localeCompare(a.ChangedDate) || b.HistoryID - a.HistoryID);
  }

  /**
   * שורות ההיסטוריה לתצוגה — עם הסתרת כפילויות מדויקות.
   * רשומות זהות לחלוטין (אותו פעולה, שדה, ערכים, מבצע, ותאריך עד השנייה) מוצגות פעם אחת.
   * המפתח כולל את תאריך השינוי, ולכן שני שינויים אמיתיים שונים בזמן אינם נבלעים.
   */
  detailHistoryRows(t: Task): HistoryEntry[] {
    const seen = new Set<string>();
    return this.detailHistory(t).filter((h) => {
      const key = [h.ActionType, h.FieldName ?? '', h.OldValue ?? '', h.NewValue ?? '',
        h.ChangedBy, h.ChangedDate].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  detailComments(t: Task): CommentEntry[] {
    return this.store()
      .comments.filter((x) => x.TaskID === t.TaskID)
      .slice()
      .sort((a, b) => b.CreatedDate.localeCompare(a.CreatedDate) || b.CommentID - a.CommentID);
  }

  addComment(t: Task): void {
    const value = this.commentsDraft().trim();
    if (!value) {
      this.notify.warn('יש להזין תוכן הערה');
      return;
    }

    this.api.addComment(t.TaskID, value).subscribe({
      next: (row) => {
        const mapped = commentFromDto(row);
        this.store.update((s) => ({
          ...s,
          comments: [...s.comments, mapped],
        }));
        this.commentsDraft.set('');
        // תגובה מעדכנת את UpdatedDate — הרשימה נטענת מחדש כדי שהתג "חדש" לא יופיע אצל הכותב.
        this.refreshAfterChange(t.TaskID);
        this.notify.success('ההערה נוספה');
      },
      error: (err) => {
        console.error('הוספת הערה נכשלה', err);
        this.notify.errorFromServer(err, 'הוספת ההערה נכשלה');
      },
    });
  }

  /**
   * האם קיים קישור תקין ומורשה לרשומת המקור (7.4.8.2).
   * מוגבל ל-http/https — כדי למנוע javascript: או דומיינים לא מורשים.
   */
  sourceUrlOf(t: Task): string | null {
    const raw = t.SourceURL?.trim();
    if (!raw) return null;
    try {
      const url = new URL(raw);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
    } catch {
      return null;
    }
  }

  /** פתיחת רשומת המקור — בכרטיסייה חדשה, בהתאם להזדהות מערכת היעד (7.4.8.3). */
  openSource(t: Task): void {
    const url = this.sourceUrlOf(t);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  /* ===================== שינוי סטטוס ===================== */

  changeStatus(id: number, status: Status): void {
    const t = this.store().tasks.find((x) => x.TaskID === id);
    if (!t || !this.allowed(t) || !TRANSITIONS[t.Status].includes(status)) {
      this.notify.warn('מעבר הסטטוס אינו מורשה');
      return;
    }

    this.api.changeStatus(id, status, t.RowVersion).subscribe({
      next: (updated) => {
        // הסטטוס משפיע על המדדים ועל הסינון — הרשימה נטענת מחדש ולא מנופלת מקומית.
        this.refreshAfterChange(id);
        // ההיסטוריה נטענת מחדש — בלעדי זה תוצג גרסה ישנה עד סגירת החלון.
        // טעינה חוזרת אינה כפילות: loadHistory מחליף את הרשומה ומתעלם מתשובות מיושנות.
        this.loadHistory(id);

        // אם החלון פתוח על המשימה הזו — לרענן את התוכן
        if (this.detailId() === id) {
          this.modalTitle.set(`משימה #${id} – ${updated.taskTitle}`);
        }

        this.notify.success(`הסטטוס עודכן ל${STATUS_LABELS[status]}`);
      },
      error: (err) => {
        console.error('שינוי סטטוס נכשל', err);
        this.notify.errorFromServer(err, 'שינוי הסטטוס נכשל');
      },
    });
  }
}
