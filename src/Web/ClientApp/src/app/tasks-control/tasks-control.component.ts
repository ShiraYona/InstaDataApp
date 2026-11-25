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
  RowVersion: string;
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


const VIEW_STORAGE = 'jerusalem_tasks_spec7_view_v1';

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

const COMPLETION_SCOPES: { value: string; label: string }[] = [
  { value: '', label: 'כל המשימות' },
  { value: 'ALL', label: 'הושלמו' },
  { value: 'LAST_7', label: '7 ימים אחרונים' },
  { value: 'LAST_30', label: '30 ימים אחרונים' },
  { value: 'LAST_90', label: '90 ימים אחרונים' },
];

const PAGE_SIZE = 20;

function withAllOption(
  options: readonly { value: string; label: string }[],
): SelectOption[] {
  return [{ value: null, label: 'הכל' }, ...options];
}

const MIN_DROPDOWN_WIDTH = 190;

const METRIC_FOCUS_QUERY: Record<Exclude<MetricKey, ''>, string> = {
  open: 'OPEN',
  progress: 'PROGRESS',
  late: 'LATE',
  high: 'HIGH',
  completed: 'COMPLETED',
  rate: 'LATE_COMPLETED',
};

const EMPTY_CREATE_FORM = (): FormModel => ({
  title: '',
  description: '',
  team: '1',
  assigned: '',
  priority: 'MEDIUM',
  due: datePlus(3),
});

const CREATE_SPINNER_MS = 2000;

const MAX_TITLE = 150;
const MAX_DESCRIPTION = 2000;

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
function isoDay(value: string | null): string {
  return value ? value.slice(0, 10) : '';
}

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
  readonly periods = COMPLETION_SCOPES;

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

  private readonly store = signal<TaskStore>({ tasks: [], comments: [], histories: [] });
  readonly loading = signal(true);
  readonly loadError = signal(false);

  private readonly teamsSignal = signal<Team[]>([]);
  private readonly peopleSignal = signal<Person[]>([]);
  get teams(): Team[] {
    return this.teamsSignal();
  }
  get people(): Person[] {
    return this.peopleSignal();
  }
  readonly role = signal<Role>('admin');
  readonly currentUserId = signal(CURRENT_USER_ID);
  readonly user = signal(CURRENT_USER_ID);
  readonly teamRole = signal(1);
  readonly view = signal<View>((localStorage.getItem(VIEW_STORAGE) as View) || 'ALL');
  readonly period = signal<string>('');
  readonly keyword = signal('');
  readonly filters = signal<Filters>(EMPTY_FILTERS());
  readonly sort = signal<keyof Task>('DueDate');
  readonly direction = signal<'asc' | 'desc'>('asc');
  readonly loaded = signal(PAGE_SIZE);
  readonly metricFocus = signal<MetricKey | ''>('');
  readonly commentsDraft = signal('');
  readonly modalTitle = signal<string | null>(null);
  readonly detailId = signal<number | null>(null);
  readonly detailTab = signal('info');
  readonly editingId = signal<number | null>(null);
  readonly form = signal<FormModel | null>(null);
  readonly working = signal(false);
  readonly formErrors = signal<FormErrors>({});
  readonly creating = signal(false);
  private readonly formSnapshot = signal<string>('');
  ngOnInit(): void {
    this.loadLookups();
    this.wireTableRequests();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  private readonly listReq = new Subject<'reset' | 'append'>();
  private readonly metricsReq = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  readonly loadingMore = signal(false);
  readonly totalCount = signal(0);
  private wireTableRequests(): void {
    this.listReq
      .pipe(
        switchMap((mode) => {
          if (mode === 'reset') this.loading.set(true);
          else this.loadingMore.set(true);
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
            total: this.api.count(query).pipe(catchError(() => of(null))),
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(({ mode, rows, total }) => {
        if (mode === 'reset') {
          this.loadError.set(rows === null);
          if (rows) this.store.update((s) => ({ ...s, tasks: rows.map(fromDto) }));
          if (total !== null) this.totalCount.set(total);
          this.loading.set(false);
          return;
        }
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
  requestList(): void {
    this.loaded.set(PAGE_SIZE);
    this.listReq.next('reset');
    this.metricsReq.next();
  }
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
  private track(getter: () => unknown): void {
    effect(
      () => {
        getter();
        this.loaded.set(PAGE_SIZE);
        this.listReq.next('reset');
        this.metricsReq.next();
      },
      { injector: this.injectorRef, allowSignalWrites: true },
    );
  }
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
      assignedUserID: f.worker || (view === 'MY_TASKS' ? this.user() : null),
      dueFrom: f.dueFrom || null,
      dueTo: f.dueTo || null,
      mineOnly: view === 'MY_TASKS',
      overdueOnly: view === 'OVERDUE',
      metricFocus: focus ? METRIC_FOCUS_QUERY[focus] || null : null,
      completionScope: this.period() || null,
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
  private readonly historyLoadSeq = new Map<number, number>();
  private loadHistory(taskId: number): void {
    const seq = (this.historyLoadSeq.get(taskId) ?? 0) + 1;
    this.historyLoadSeq.set(taskId, seq);

    this.api.getHistory(taskId).subscribe({
      next: (rows) => {
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
          (!team || p.team === Number(team)) && (this.role() === 'admin' || p.team === this.teamRole()),
      )
      .map((p) => ({ value: p.id, label: p.name }));
  }
  workerOptionsForTeam(team: string): { value: string; label: string }[] {
    return this.peopleSignal()
      .filter((p) => p.team === +team)
      .map((p) => ({ value: p.id, label: p.name }));
  }
  roleSelectOptions(): { value: Role; label: string }[] {
    return [
      { value: 'admin', label: 'תצוגת מנהל בקרה' },
      { value: 'manager', label: 'תצוגת מנהל צוות 1' },
      { value: 'employee', label: 'תצוגת עובד – ' + this.myUserName() },
    ];
  }
  periodSelectOptions(): { value: string; label: string }[] {
    return this.periods.map((p) => ({ value: p.value, label: p.label }));
  }
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
  teamSelectOptions(): { value: number | null; label: string }[] {
    return [{ value: null, label: 'הכל' }, ...this.teamFilterOptions()];
  }
  workerSelectOptions(): { value: string | null; label: string }[] {
    return [{ value: null, label: 'הכל' }, ...this.workerFilterOptions()];
  }
  readonly allFiltered = computed(() => this.store().tasks);
  readonly visibleTasks = computed(() => this.store().tasks);
  readonly hasMore = computed(() => this.totalCount() > this.allFiltered().length);
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
  setRole(value: string): void {
    const role = value as Role;
    this.role.set(role);
    this.view.set('MY_TASKS');
    this.filters.set(EMPTY_FILTERS());
    this.keyword.set('');
    this.metricFocus.set('');
    this.loaded.set(PAGE_SIZE);
    if (role === 'employee') this.user.set(this.currentUserId());
  }
  readonly myUserName = computed(() => {
    const id = this.currentUserId();
    return this.peopleSignal().find((p) => p.id === id)?.name ?? id;
  });
  setView(v: View): void {
    this.view.set(v);
    localStorage.setItem(VIEW_STORAGE, v);
    this.loaded.set(PAGE_SIZE);
  }
  onSearch(value: string): void {
    this.keyword.set(value);
    this.loaded.set(PAGE_SIZE);
  }
  isOptionChecked(item: unknown, values: readonly string[]): boolean {
    if (this.isAllItem(item)) {
      return values.length === 0;
    }
    const value = this.optionValueOf(item);
    return value !== null && values.includes(value);
  }
  private optionValueOf(item: unknown): string | null {
    const value =
      item !== null && typeof item === 'object'
        ? (item as { value?: unknown }).value
        : item;
    return value == null || value === '' ? null : String(value);
  }
  isAllItem(item: unknown): boolean {
    if (item === null || item === undefined) {
      return true;
    }
    if (typeof item !== 'object') {
      return !item;
    }
    const value = (item as { value?: unknown }).value;
    return value == null || value === '';
  }
  isSingleChecked(item: unknown, current: string): boolean {
    return this.isAllItem(item) ? !current : this.optionValueOf(item) === current;
  }
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
  sizePanelOverlay(): void {
    const doc: Document = this.elRef.nativeElement.ownerDocument;
    const overlays = doc.querySelectorAll<HTMLElement>('.tasks-dd');
    overlays.forEach((panel) => {
      const wrapper: HTMLElement =
        (panel.closest('.p-connected-overlay') as HTMLElement | null) ?? panel;
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
  singleLabel(value: string, options: readonly { value: unknown; label: string }[]): string {
    if (!value) {
      return 'הכל';
    }
    return options.find((o) => String(o.value) === value)?.label ?? value;
  }
  filterSummary(values: readonly string[], labels: Record<string, string>): string {
    if (!values.length) {
      return 'הכל';
    }
    return values.map((v) => labels[v] ?? v).join(', ');
  }
  setFilter(key: 'team' | 'worker' | 'dueFrom' | 'dueTo', value: string | number | null): void {
    this.filters.update((f) => ({ ...f, [key]: value == null ? '' : String(value) }));
    this.loaded.set(PAGE_SIZE);
  }
  clearFilters(): void {
    this.keyword.set('');
    this.filters.set(EMPTY_FILTERS());
    this.loaded.set(PAGE_SIZE);
  }
  toggleMetric(key: MetricKey): void {
    const next = this.metricFocus() === key ? '' : key;
    this.metricFocus.set(next);
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
  loadMore(): void {
    if (this.loadingMore() || this.loading() || !this.hasMore()) return;
    this.listReq.next('append');
  }
  retryLoad(): void {
    this.loadError.set(false);
    this.requestList();
  }
  refresh(): void {
    this.requestList();
    this.notify.success('הנתונים רועננו מהשרת');
  }
  resetDemo(): void {
    this.role.set('admin');
    this.view.set('ALL');
    this.period.set('');
    this.loaded.set(PAGE_SIZE);
    this.metricFocus.set('');
    this.clearFilters();
    this.closeModal();
    this.requestList();
    this.notify.success('הנתונים נטענו מחדש');
  }
  private takeFormSnapshot(): void {
    this.formSnapshot.set(JSON.stringify(this.form()));
  }
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
  private discardForm(): void {
    const id = this.editingId();
    this.form.set(null);
    this.formSnapshot.set('');
    this.formErrors.set({});
    if (id) {
      this.openDetails(id, this.detailTab());
      return;
    }
    this.modalTitle.set(null);
    this.detailId.set(null);
    this.detailTab.set('info');
    this.editingId.set(null);
  }
  closeModal(): void {
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
  cancelForm(): void {
    const mode = this.editingId() ? 'edit' : 'create';
    if (!this.hasUnsavedChanges(mode)) {
      this.discardForm();
      return;
    }
    this.confirmDiscard('cancel');
  }
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
        if (action === 'close') {
          this.commentsDraft.set('');
        }
      },
    });
  }
  openCreate(): void {
    this.detailId.set(null);
    this.editingId.set(null);
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
    this.loadHistory(id);
    this.markViewed(id);
  }
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
        this.refreshAfterChange(t.TaskID);
        this.notify.success('ההערה נוספה');
      },
      error: (err) => {
        console.error('הוספת הערה נכשלה', err);
        this.notify.errorFromServer(err, 'הוספת ההערה נכשלה');
      },
    });
  }
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
  openSource(t: Task): void {
    const url = this.sourceUrlOf(t);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }
  changeStatus(id: number, status: Status): void {
    const t = this.store().tasks.find((x) => x.TaskID === id);
    if (!t || !this.allowed(t) || !TRANSITIONS[t.Status].includes(status)) {
      this.notify.warn('מעבר הסטטוס אינו מורשה');
      return;
    }
    this.api.changeStatus(id, status, t.RowVersion).subscribe({
      next: (updated) => {
        this.refreshAfterChange(id);
        this.loadHistory(id);
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
