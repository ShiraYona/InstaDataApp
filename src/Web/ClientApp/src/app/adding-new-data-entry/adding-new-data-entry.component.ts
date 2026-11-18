import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription } from 'rxjs';
import {
  CalculationTypeId,
  DataSource,
  DataSourceField,
  FilterCondition,
  FilterGroup,
  FilterLogic,
  FilterNode,
  FilterOperator,
  LookupOption,
  MetricDraft
} from '../shared/models/data-definition.model';
import { DataDefinitionService } from '../shared/services/data-definition.service';
import { NotificationService } from '../shared/services/notification.service';
import { MetricListItemDto } from '../web-api-client';

const DEFAULT_DETAIL_FIELD_COUNT = 3;

const INCOMPLETE_FORM_MESSAGE = 'יש למלא את כל שדות החובה המסומנים ב-*';

const DETAIL_FIELDS_REQUIRED_MESSAGE = 'יש לבחור לפחות שדה אחד להצגה בפירוט';

const DATE_RANGE_REQUIRED_MESSAGE = 'יש לבחור שני שדות תאריך שונים עבור טווח התקופה';

/**
 * "שדות להצגה בפירוט" חייבים להכיל לפחות שדה אחד */
 
function atLeastOneItemValidator(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return Array.isArray(value) && value.length > 0 ? null : { required: true };
}

const NO_GROUPING = 0;

/** "לפי מסנן הלוח" — הערך שנשמר ב-CTRL_Metrics.DateRangeType */
/** "לפי מסנן הלוח" — הערך ההיסטורי של התקופה; אינו מוצע בטופס */
const DASHBOARD = 'DASHBOARD';

/** קודי סוגי החישוב כפי שנשלחים מהקטלוג (LookupOption.code) */
const CALCULATION_DIRECT = 'DIRECT';
const CALCULATION_SUM = 'SUM';
const CALCULATION_COUNT = 'COUNT';

/** OUTPUT_TYPE של מקור נתונים */
const OUTPUT_TYPE_ROWS = 'ROWS';

const SOURCE_TYPE_PROCEDURE = 'PROCEDURE';

/** אופן הגדרת התקופה בטופס */
export type DateRangeMode = 'period' | 'range';

const LEGACY_LOOKUP_LABELS: Record<string, string> = {
  MONTH: 'חודש נוכחי',
  QUARTER: 'רבעון נוכחי',
  YEAR: 'שנה נוכחית'
};


/** מספר הרמות המרבי של קבוצות — שורש (1), תת-קבוצה (2), תת-קבוצה (3) */
const MAX_FILTER_DEPTH = 3;

/** תנאי עם אופרטור זה מחייב לפחות ערך אחד */
const MULTI_VALUE_OPERATORS = ['IN', 'NOT_IN'];

/** "ריק" / "אינו ריק" — מוצעים רק לשדה שיכול להיות ריק */
const NULL_OPERATORS = ['IS_NULL', 'IS_NOT_NULL'];

/** סוג קלט המסנן של השדה (CTRL_DataSourceFields.FilterInputType) */
const FILTER_INPUT_LIST = 'LIST';

/** השדות שהמשתמש ממלא — לחיווי ויזואלי של "מלא / ריק" */
type FormFieldName =
  | 'name'
  | 'sourceId'
  | 'cardSourceId'
  | 'dateRangeType'
  | 'dateFromFieldId'
  | 'dateToFieldId'
  | 'calculationTypeId'
  | 'sumFieldId'
  | 'groupFieldId';


@Component({
  selector: 'app-adding-new-data-entry',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    MultiSelectModule,
    DatePickerModule,
    TooltipModule
  ],
  templateUrl: './adding-new-data-entry.component.html',
  styleUrl: './adding-new-data-entry.component.scss'
})
export class AddingNewDataEntryComponent implements OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DataDefinitionService);
  private readonly notifications = inject(NotificationService);
  private readonly subscriptions = new Subscription();


  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();


  @Input() metric: MetricListItemDto | null = null;

  @Output() saved = new EventEmitter<number>();

  /** מספר הימים לחישוב — נטען מ-CTRL_CalculationDays */
  rangeOptions: LookupOption[] = [];

  /** סוגי החישוב — נטענים מ-CTRL_CalculationTypes */
  calculationTypeOptions: LookupOption[] = [];

  /** סמלי הכרטיס — נטענים מ-CTRL_ICON */
  cardIcons: LookupOption[] = [];

  /** רשימת מקורות הנתונים — נטענת פעם אחת */
  sources: LookupOption[] = [];
  /** המקור שנבחר, כולל השדות שהוגדרו עבורו */
  selectedSource: DataSource | null = null;

  /** תאריך היצירה שהשרת מחזיר — מוצג ב"שדה תאריך" עד שהמקור יגדיר שדה תאריך משלו */
  creationDate: Date | null = null;

  saving = false;

 
  dateRangeMode: DateRangeMode = 'period';

  /** אפשרויות "אופן התקופה" — מוצגות רק כשיש שדות תאריך במקור */
  readonly rangeModeOptions: Array<{ value: DateRangeMode; label: string }> = [
    { value: 'period', label: 'תקופה מוגדרת' },
    { value: 'range', label: 'טווח תאריכים' }
  ];

  private lastSourceId: string | null = null;

  private sourceRequest?: Subscription;

  /** מזהה הנתון הנערך — null במצב יצירה. קובע גם את הכותרת ואת סוג השמירה */
  private editingMetricId: number | null = null;

  /** RowVersion (Base64) כפי שנשלף ברשימה — נשלח בעדכון כ-If-Match */
  private editingRowVersion: string | null = null;

  /** עץ תנאי הסינון השמור — נקרא בעריכה, ונשלח חזרה בשמירה */
  private editingFiltersJson: string | null = null;

  /** אופרטורי הסינון — נטענים מ-CTRL_FilterOperators */
  filterOperators: FilterOperator[] = [];

  /** עץ תנאי הסינון בעריכת הטופס — null כשאין תנאים */
  filterRoot: FilterGroup | null = null;

 
  private pendingEditMetric: MetricListItemDto | null = null;

  readonly form = this.fb.group({
    name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    // המזהה נשמר כמחרוזת, בהתאמה ל-optionValue של p-select ול-LookupOption.value
    sourceId: this.fb.control<string | null>(null, { validators: [Validators.required] }),

    cardSourceId: this.fb.control<string | null>(null),

    iconCode: this.fb.control<string | null>(null),
    // ריק = נבחר טווח תאריכים מפורש; בדיקת "יש תקופה" נעשית ב-save לפי אופן התקופה
    dateRangeType: this.fb.control<string | null>(null),
    // שני שדות התאריך של הטווח המפורש (רק כש-dateRangeType ריק)
    dateFromFieldId: this.fb.control<number | null>(null),
    dateToFieldId: this.fb.control<number | null>(null),
    // ה-ID של סוג החישוב מ-CTRL_CalculationTypes — נשמר כמספר כדי להתאים ל-optionValue
    calculationTypeId: this.fb.control<CalculationTypeId | null>(null),
    sumFieldId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    groupFieldId: this.fb.control<number | null>(null),
    // לפחות שדה פירוט אחד — השרת דוחה רשימה ריקה, ולכן הטופס חוסם זאת מראש
    detailFieldIds: this.fb.control<number[]>([], {
      nonNullable: true,
      validators: [atLeastOneItemValidator]
    }),
    /** "הצגת הנתון במערכת הניהול והבקרה" — מסומן כברירת מחדל */
    displayInDashboard: this.fb.control<boolean>(true, { nonNullable: true })
  });

  // --- רשימות נגזרות ---

  /** האם הדיאלוג במצב עריכה של נתון קיים */
  get isEditing(): boolean {
    return this.editingMetricId !== null;
  }

  /** כותרת הדיאלוג — משתנה לפי המצב */
  get dialogTitle(): string {
    return this.isEditing ? 'עריכת נתון קיים' : 'יצירת נתון חדש';
  }

  /** תווית כפתור השמירה — "עדכון" בעריכה, "שמירת נתון" ביצירה */
  get saveLabel(): string {
    return this.isEditing ? 'עדכון נתון' : 'שמירת נתון';
  }

  get isSummaryVisible(): boolean {
    return this.isSumCalculationType(this.form.controls.calculationTypeId.value);
  }

  /** האם הבחירה הנוכחית של סוג החישוב היא SUM — לפי הקוד מהקטלוג, לא לפי התווית */
  private isSumCalculationType(calculationTypeId: CalculationTypeId | null): boolean {
    const code = this.calculationTypeCode(calculationTypeId);
    return code === CALCULATION_SUM;
  }

  /** הקוד הקנוני (COUNT / SUM / DIRECT) של סוג החישוב שנבחר */
  private calculationTypeCode(calculationTypeId: CalculationTypeId | null): string | null {
    if (calculationTypeId === null) {
      return null;
    }
    return this.calculationTypeOptions.find(option => Number(option.value) === calculationTypeId)?.code
      ?? null;
  }

 
  get isRowsSource(): boolean {
    return this.selectedSource?.outputType === OUTPUT_TYPE_ROWS;
  }

 
  get canChooseRange(): boolean {
    return this.dateFieldOptions.length >= 2;
  }

 
  get rangeModeChoices(): Array<{ value: DateRangeMode; label: string }> {
    return this.canChooseRange ? this.rangeModeOptions : [this.rangeModeOptions[0]];
  }

  /**
   * מקור פרוצדורה — אין בחירת סוג חישוב בטופס: DIRECT נשמר מאחורי הקלעים.
   * מקור טבלה — הבחירה מוגבלת ל-SUM / COUNT.
   */
  get isProcedureSource(): boolean {
    return (this.selectedSource?.sourceType ?? '').toUpperCase() === SOURCE_TYPE_PROCEDURE;
  }

  /** אפשרויות "סוג חישוב" — COUNT / SUM בלבד, ללא DIRECT */
  get calculationTypeChoices(): LookupOption[] {
    return this.calculationTypeOptions.filter(option =>
      option.code === CALCULATION_SUM || option.code === CALCULATION_COUNT);
  }

  /** האם להציג את שדה "סוג חישוב" — מקור טבלה בלבד */
  get isCalculationTypeVisible(): boolean {
    return this.isRowsSource && !this.isProcedureSource;
  }

  /** תווית סוג המקור — מוצגת לצד שם המקור בטופס */
  get sourceTypeLabel(): string {
    switch (this.selectedSource?.sourceType) {
      case 'TABLE':
        return 'טבלה';
      case SOURCE_TYPE_PROCEDURE:
        return 'פרוצדורה';
      default:
        return '';
    }
  }

  /** שדות תאריך של המקור — לבחירת טווח התקופה המפורש */
  get dateFieldOptions(): DataSourceFieldOption[] {
    return (this.selectedSource?.fields ?? []).filter(field => isDateType(field.dataType));
  }

  /** שני שדות התאריך חייבים להיבחר ולהבדיל זה מזה */
  get isRangeFieldsInvalid(): boolean {
    if (this.dateRangeMode !== 'range') {
      return false;
    }
    const from = this.form.controls.dateFromFieldId.value;
    const to = this.form.controls.dateToFieldId.value;
    return from === null || to === null || from === to;
  }

 
  get isRangeModeInvalid(): boolean {
    if (this.dateRangeMode === 'range') {
      return this.isRangeFieldsInvalid;
    }
    return !this.form.controls.dateRangeType.value;
  }

  get periodOptions(): LookupOption[] {
    const options = this.rangeOptions.filter(option => !isDashboardPeriod(option.value));
    const current = this.form.controls.dateRangeType.value;

    // תקופה היסטורית שאינה ברשימה — מוצגת בתוויתה כדי שהעריכה לא תיראה ריקה
    if (current && !isDashboardPeriod(current) && !options.some(option => option.value === current)) {
      return [...options, { value: current, label: this.labelOf(this.rangeOptions, current) }];
    }

    return options;
  }

  /** מעבר בין "תקופה מוגדרת" ל"טווח תאריכים" — מנקה את הצד שלא בשימוש */
  onRangeModeChange(mode: DateRangeMode | null): void {
    // המצב ננעל ל"תקופה מוגדרת" כשאין למקור שני שדות תאריך
    this.dateRangeMode = mode === 'range' && this.canChooseRange ? 'range' : 'period';

    if (this.dateRangeMode === 'range') {
      this.form.controls.dateRangeType.setValue(null);
      return;
    }

    this.form.controls.dateFromFieldId.setValue(null);
    this.form.controls.dateToFieldId.setValue(null);
    this.form.controls.dateRangeType.setValue(this.defaultPeriod());
  }

  /** בחירת חישוב ישיר (DIRECT) מנקה סיכום וקיבוץ — הם אינם רלוונטיים */
  private isDirectCalculationType(calculationTypeId: CalculationTypeId | null): boolean {
    return this.calculationTypeCode(calculationTypeId) === CALCULATION_DIRECT;
  }

  /**
   * סוג החישוב שנקבע לפי המקור:
   * מקור ערך יחיד או פרוצדורה — DIRECT (בלי בחירה בטופס);
   * טבלת שורות — SUM אם יש שדה סיכום, אחרת COUNT.
   */
  private defaultCalculationTypeId(options: LookupOption[] = this.calculationTypeOptions): CalculationTypeId | null {
    if (options.length === 0) {
      return null;
    }

    // פרוצדורה אינה מציגה בחירה — DIRECT נשמר מאחורי הקלעים
    if (this.selectedSource && (!this.isRowsSource || this.isProcedureSource)) {
      const direct = options.find(option => option.code === CALCULATION_DIRECT);
      if (direct) {
        return Number(direct.value);
      }
    }

    // טבלת שורות: SUM אם קיים שדה סיכום, אחרת COUNT
    const hasSummableField = (this.selectedSource?.fields ?? []).some(field => field.isSummable);
    const preferred = hasSummableField ? CALCULATION_SUM : CALCULATION_COUNT;
    const match = options.find(option => option.code === preferred);
    if (match) {
      return Number(match.value);
    }

    return Number(options[0].value);
  }

  /** שדות הפירוט — מתוך השדות שהוגדרו במקור הנבחר */
  get detailFieldOptions(): DataSourceFieldOption[] {
    return this.selectedSource?.fields ?? [];
  }

  /**
   * "שדה תאריך" — שדה טקסט מושבת. המציג את התאריך בשרת (GET DATE ברקע),
   * ואם למקור הנבחר הוגדר שדה תאריך בקטלוג — את שם השדה.
   */
  get dateFieldLabel(): string {
    const id = this.selectedSource?.dateFieldId;
    if (id != null) {
      return this.fieldLabel(id);
    }
    // DD/MM/YYYY — בפורמט ישראלי; השדה מוצג לכיוון RTL
    return this.creationDate
      ?.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) ?? '';
  }

  /** רק שדות שמסומנים כניתנים לסיכום יכולים לשמש לסיכום */
  get summaryFields(): DataSourceFieldOption[] {
    return this.selectedSource ? this.selectedSource.fields.filter(f => f.isSummable) : [];
  }


  get groupByOptions(): Array<{ fieldId: number; label: string }> {
    const fields = this.selectedSource ? this.selectedSource.fields.filter(f => f.isGroupable) : [];
    return [{ fieldId: NO_GROUPING, label: 'ללא קיבוץ' }, ...fields.map(f => ({ fieldId: f.fieldId, label: f.label }))];
  }

  /** תווית עברית לשורה שנבחרה ברשימה נפתחת (הערך עצמו נשמר כמו שהוא) */
  labelOf(options: LookupOption[], code: string | null): string {
    if (code == null) {
      return '';
    }
    return options.find(option => option.value === code)?.label
      ?? LEGACY_LOOKUP_LABELS[code]
      ?? code;
  }

  /** התווית של תקופת החישוב שנבחרה — לתצוגה בתוך השדה */
  get dateRangeLabel(): string {
    return this.labelOf(this.rangeOptions, this.form.controls.dateRangeType.value);
  }

  /** התווית של סוג החישוב שנבחר — לתצוגה בתוך השדה */
  get calculationTypeLabel(): string {
    return this.labelOf(this.calculationTypeOptions, String(this.form.controls.calculationTypeId.value ?? ''));
  }

  /** כל שדות הפירוט מסומנים — לשימוש עתידי */
  get allDetailFieldsSelected(): boolean {
    const options = this.detailFieldOptions;
    return options.length > 0 && this.form.controls.detailFieldIds.value.length === options.length;
  }

  get someDetailFieldsSelected(): boolean {
    const count = this.form.controls.detailFieldIds.value.length;
    return count > 0 && count < this.detailFieldOptions.length;
  }

 
  detailInputId(fieldId: number): string {
    return `detail-field-${fieldId}`;
  }

  /** האם השדה מסומן — קובע את [checked] של ה-input המקורי */
  isDetailFieldSelected(fieldId: number): boolean {
    return this.form.controls.detailFieldIds.value.includes(fieldId);
  }

  /**
   * הקליק על <input type="checkbox"> מקורי (בתוך <label> שמקיף את הכרטיס).
   * ה-input אינו כותב למערך בעצמו — מוסיפים/מסירים את המזהה ידנית.
   */
  toggleDetailField(fieldId: number): void {
    const control = this.form.controls.detailFieldIds;
    const current = control.value;
    const next = current.includes(fieldId)
      ? current.filter(id => id !== fieldId)
      : [...current, fieldId];

    control.setValue(next);

    control.markAsDirty();
    control.markAsTouched();
  }

  /** הקליק על הטקסט של "הצגת הנתון" מהפך את הסימון — כמו לחיצה על הריבוע */
  toggleDisplayInDashboard(): void {
    const control = this.form.controls.displayInDashboard;
    control.setValue(!control.value);
    control.markAsDirty();
  }

  /** "בחר הכל": מסמן את כולם, או מבטל את כולם אם כבר הכל מסומן */
  toggleAllDetailFields(): void {
    const ids = this.allDetailFieldsSelected
      ? []
      : this.detailFieldOptions.map(field => field.fieldId);
    this.form.controls.detailFieldIds.setValue(ids);
  }

  constructor() {
    // תאריך היצירה — נטען מהשרת ברקע, ובינתיים השדה ריק
    this.subscriptions.add(
      this.service.getCurrentDate().subscribe({ next: date => (this.creationDate = date) })
    );
    this.loadLookups();
    // הרשימות והמנויים מוכנים לפני שבוחרים ברירת מחדל — אחרת הבחירה לא נרשמת
    this.watchSourceChanges();
    this.watchCardSourceChanges();
    this.watchCalculationTypeChanges();
    // טעינת המקורות קובעת את ברירת המחדל של "מקור נתונים" — אחרי שהמנוי כבר קיים
    this.loadSources();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // פתיחה מחדש של הדיאלוג = טופס נקי, ללא שינויים שלא נשמרו
    if (changes['visible']?.currentValue === true) {
      this.resetForm();
      this.startMode(this.metric);
      return;
    }

    // הנתון שנערך הוחלף בזמן שהדיאלוג פתוח — ממלאים מחדש
    if (changes['metric']) {
      this.setEditingMetric(this.metric);
      this.tryApplyEditValues();
    }
  }

  /**
   * קובע את הנתון הנערך — המזהה, ה-RowVersion ועץ הסינון השמור.
   * null = יצירת נתון חדש.
   */
  private setEditingMetric(metric: MetricListItemDto | null): void {
    this.editingMetricId = metric?.metricId ?? null;
    this.editingRowVersion = metric?.rowVersion ?? null;
    this.editingFiltersJson = metric?.filtersJson ?? null;
    this.pendingEditMetric = this.isEditing ? metric : null;
  }

  /** קובע את מצב הפתיחה: יצירת נתון חדש, או עריכת נתון שנבחר */
  private startMode(metric: MetricListItemDto | null): void {
    this.setEditingMetric(metric);

    // הרשימות עשויות להיטען לפני שנוספו שורות חדשות — בטעינה מחדש יימצא הערך השמור
    this.reloadLookups();
    this.tryApplyEditValues();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /** טוען את תקופות החישוב וקובע את ברירת המחדל לפי מה שחוזר מהשרת */
  private loadLookups(forceReload = false): void {
    this.subscriptions.add(
      this.service.getCalculationPeriods(forceReload).subscribe({
        next: periods => {
          this.rangeOptions = periods;
          this.selectDefaultPeriod();
          // ערכי העריכה ממתינים לרשימה הזו (תקופת החישוב נבחרת מה-Value שבה)
          this.tryApplyEditValues();
        },
        error: (error: unknown) => this.notifications.errorFromServer(error, 'טעינת תקופות החישוב נכשלה')
      })
    );

    this.subscriptions.add(
      this.service.getCardIcons(forceReload).subscribe({
        next: icons => {
          this.cardIcons = icons;
          this.selectDefaultIcon();
          this.tryApplyEditValues();
        },
        error: (error: unknown) => this.notifications.errorFromServer(error, 'טעינת סמלי הכרטיס נכשלה')
      })
    );

    this.subscriptions.add(
      this.service.getCalculationTypes().subscribe({
        next: types => {
          this.calculationTypeOptions = types;
          // ברירת המחדל נגזרת מהמקור (DIRECT לערך יחיד; SUM/COUNT לשורות) — ראו defaultCalculationTypeId
          this.applyCalculationType(this.defaultCalculationTypeId(types));
          this.tryApplyEditValues();
        },
        error: (error: unknown) => this.notifications.errorFromServer(error, 'טעינת סוגי החישוב נכשלה')
      })
    );

    this.subscriptions.add(
      this.service.getFilterOperators().subscribe({
        next: operators => (this.filterOperators = operators),
        error: (error: unknown) => this.notifications.errorFromServer(error, 'טעינת אופרטורי הסינון נכשלה')
      })
    );
  }

  /** טעינה מחדש של הרשימות — בדיאלוג העריכה, כדי שהערכים השמורים יימצאו בהן */
  private reloadLookups(): void {
    if (!this.isEditing) {
      return;
    }
    this.loadLookups(true);
    this.loadSources(true);
  }

  /**
   * "סמל כרטיס" הוא בחירה עצמאית מרשימת CTRL_ICON,
   * והערך הנבחר הוא ה-IconCode שנשמר ב-CTRL_Metrics.IconCode.
   */
  private watchCardSourceChanges(): void {
    this.subscriptions.add(
      this.form.controls.cardSourceId.valueChanges.subscribe(iconCode => {
        // emitEvent: false — iconCode הוא ערך נגזר, לא קלט של המשתמש (מונע לולאה)
        this.form.controls.iconCode.setValue(iconCode, { emitEvent: false });
      })
    );
  }

  /** ברירת מחדל ל"סמל כרטיס": הסמל הראשון בטבלת העזר */
  private selectDefaultIcon(): void {
    if (this.cardIcons.length === 0 || this.form.controls.cardSourceId.value !== null) {
      return;
    }
    // ערך הסמל (IconCode) הוא מה שנשמר ב-CTRL_Metrics.IconCode
    this.form.controls.cardSourceId.setValue(this.cardIcons[0].value);
    this.form.controls.iconCode.setValue(this.cardIcons[0].value);
  }

  /**
   * ברירת המחדל של תקופת החישוב — התקופה הראשונה מקטלוג התקופות.
   * "לפי מסנן הלוח" (DASHBOARD) אינו מוצע יותר בטופס.
   */
  private defaultPeriod(): string | null {
    return this.rangeOptions.find(option => !isDashboardPeriod(option.value))?.value ?? null;
  }

  private selectDefaultPeriod(): void {
    if (this.dateRangeMode !== 'period') {
      return;
    }
    if (this.rangeOptions.length > 0 && this.form.controls.dateRangeType.value === null) {
      this.form.controls.dateRangeType.setValue(this.defaultPeriod());
    }
  }

  private loadSources(forceReload = false): void {
    this.subscriptions.add(
      this.service.getSources(forceReload).subscribe({
        next: sources => {
          this.sources = sources;
          this.selectDefaultIcon();
          this.selectDefaultSource();
          this.tryApplyEditValues();
        },
        error: (error: unknown) => this.notifications.errorFromServer(error, 'טעינת מקורות הנתונים נכשלה')
      })
    );
  }

  private selectDefaultSource(): void {
    if (this.sources.length === 0 || this.form.controls.sourceId.value !== null) {
      return;
    }
    // הערך נשמר כמחרוזת כמו שהוא — p-select משווה אותו ל-optionValue של השורה
    this.form.controls.sourceId.setValue(this.sources[0].value);
  }

 
  private watchSourceChanges(): void {
    this.subscriptions.add(
      this.form.controls.sourceId.valueChanges.subscribe(sourceId => {
        const changed = sourceId !== this.lastSourceId;
        this.lastSourceId = sourceId;

        if (!changed) {
          return;
        }

        this.selectedSource = null;
        this.resetDependentFields();
        if (sourceId === null) {
          return;
        }

        this.sourceRequest?.unsubscribe();
        this.sourceRequest = // המזהה בטופס הוא מחרוזת; הנתיב בשרת מצפה למספר
          this.service.getSourceFields(Number(sourceId)).subscribe({
            next: source => {
              this.selectedSource = source;
              this.applyDefaultsAfterSourceSelected(source);
              // שדות הפירוט והסיכום נבחרים מתוך שדות המקור — רק עכשיו אפשר להשלים את העריכה
              this.tryApplyEditValues();
            },
            error: (error: unknown) => this.notifications.errorFromServer(error, 'טעינת שדות המקור נכשלה')
          });
      })
    );
  }

  /** SUM מחייב בחירת שדה סיכום; COUNT מסתיר אותו */
  private watchCalculationTypeChanges(): void {
    this.subscriptions.add(
      this.form.controls.calculationTypeId.valueChanges.subscribe(type => {
        this.applyCalculationType(type);
      })
    );
  }


  
  private applyDefaultsAfterSourceSelected(source: DataSource): void {
    // בעריכה — שדות הפירוט והסיכום מגיעים מהנתון השמור, לא מברירת המחדל של "נתון חדש"
    const edit = this.pendingEditMetric;

    if (edit) {
      // null ב-dateRangeValue = הנתון הוגדר בטווח תאריכים מפורש.
      // מקור שאין בו שני שדות תאריך אינו מציג טווח, ולכן נשאר על תקופה מוגדרת
      this.dateRangeMode = edit.dateRangeValue === null && this.canChooseRange ? 'range' : 'period';
      this.form.patchValue({
        // נתון ותיק שנשמר כ-DASHBOARD מוצג בתקופה הראשונה — האפשרות אינה בטופס
        dateRangeType: this.dateRangeMode === 'period'
          ? (edit.dateRangeValue && !isDashboardPeriod(edit.dateRangeValue)
              ? edit.dateRangeValue
              : this.defaultPeriod())
          : null,
        dateFromFieldId: null,
        dateToFieldId: null,
        groupFieldId: edit.groupFieldId ?? NO_GROUPING,
        sumFieldId: edit.sumFieldId ?? null,
        detailFieldIds: (edit.detailFieldIds ?? []).filter(fieldId =>
          source.fields.some(field => field.fieldId === fieldId))
      });
    } else {
      // מקור עם פחות משני שדות תאריך לא מאפשר טווח מפורש — נשארים על תקופה מוגדרת
      if (!this.canChooseRange) {
        this.dateRangeMode = 'period';
      }
      this.form.patchValue({
        dateRangeType: this.dateRangeMode === 'period' ? this.defaultPeriod() : null,
        dateFromFieldId: null,
        dateToFieldId: null,
        groupFieldId: NO_GROUPING,
        sumFieldId: source.fields.find(f => f.isSummable)?.fieldId ?? null,
        detailFieldIds: source.fields.slice(0, DEFAULT_DETAIL_FIELD_COUNT).map(f => f.fieldId)
      });
      // סוג החישוב נקבע מחדש לפי המקור (DIRECT לערך יחיד, SUM/COUNT לשורות)
      this.applyCalculationType(this.defaultCalculationTypeId());
      return;
    }

    this.applyCalculationType(this.form.controls.calculationTypeId.value);
  }

  /** מפעיל את הכללים שנגזרים מסוג החישוב (null = ללא בחירה) */
  private applyCalculationType(calculationTypeId: CalculationTypeId | string | null): void {
    const typeId = calculationTypeId === null || calculationTypeId === '' ? null : Number(calculationTypeId);

    // ה-select מחזיר את הערך כפי שהוא ברשימה — מנרמלים למספר
    if (this.form.controls.calculationTypeId.value !== typeId) {
      this.form.controls.calculationTypeId.setValue(typeId, { emitEvent: false });
    }

    const sumControl = this.form.controls.sumFieldId;
    const groupControl = this.form.controls.groupFieldId;

    // הדרישה לסיכום נקבעת לפי סוג החישוב: רק SUM במקור שורות דורש שדה סיכום
    if (this.isRowsSource && this.isSumCalculationType(typeId)) {
      sumControl.setValidators([Validators.required]);
    } else {
      // הסתרת הסיכום — מנקים גם את הערך כדי שלא יישמר שדה מוסתר
      sumControl.setValue(null, { emitEvent: false });
      sumControl.clearValidators();
    }
    sumControl.updateValueAndValidity();

    // חישוב ישיר (DIRECT) אינו מקובץ — מנקים גם את הקיבוץ
    if (this.isDirectCalculationType(typeId) && groupControl.value !== NO_GROUPING) {
      groupControl.setValue(NO_GROUPING, { emitEvent: false });
    }

    this.applyDetailFieldRequirement();
  }


  private applyDetailFieldRequirement(): void {
    const control = this.form.controls.detailFieldIds;

    if (this.isRowsSource) {
      control.setValidators([atLeastOneItemValidator]);
    } else {
      // אין פירוט לבחור — מנקים את הערך כדי שלא יישלח ויידחה בשרת
      if (control.value.length > 0) {
        control.setValue([], { emitEvent: false });
      }
      control.clearValidators();
    }
    control.updateValueAndValidity({ emitEvent: false });
  }


  private resetDependentFields(): void {
    this.dateRangeMode = 'period';
    // תנאי הסינון שייכים למקור הקודם — אינם תקפים למקור אחר
    this.filterRoot = null;
    this.form.patchValue(
      {
        sumFieldId: null,
        groupFieldId: NO_GROUPING,
        dateFromFieldId: null,
        dateToFieldId: null,
        detailFieldIds: [],
        // cardSourceId ו-iconCode נבדקים יחד — השני נגזר מהראשון דרך המנוי
        cardSourceId: this.cardIcons[0]?.value ?? null,
        iconCode: this.cardIcons[0]?.value ?? null
      },
      { emitEvent: false }
    );
  }

  private resetForm(): void {
    this.selectedSource = null;
    this.lastSourceId = null;
    this.dateRangeMode = 'period';
    // לפני startMode, שקובע את המצב מחדש לפי metric
    this.editingMetricId = null;
    this.editingRowVersion = null;
    this.editingFiltersJson = null;
    this.pendingEditMetric = null;
    this.filterRoot = null;
    this.form.reset({
      name: '',
      sourceId: null,
      // הסמל מגיע מרשימת CTRL_ICON — ברירת המחדל נבחרת כשהרשימה נטענת
      cardSourceId: this.cardIcons[0]?.value ?? null,
      iconCode: this.cardIcons[0]?.value ?? null,
      dateRangeType: this.defaultPeriod(),
      dateFromFieldId: null,
      dateToFieldId: null,
      calculationTypeId: null,
      sumFieldId: null,
      // "ללא קיבוץ" ברשימה = 0, ואילו בטופס נשמר null — כך ה-select מציג את השורה
      groupFieldId: NO_GROUPING,
      detailFieldIds: [],
      displayInDashboard: true
    });
    // reset מעדכן ערכים בלי emitEvent, לכן מסדירים את הוולידטורים ידנית
    this.applyCalculationType(this.form.controls.calculationTypeId.value);
  }

 
  private tryApplyEditValues(): void {
    const edit = this.pendingEditMetric;
    if (!edit) {
      return;
    }

    // הערכים נבחרים מתוך הרשימות — לפני שהן הגיעו ה-select מציג ריק
    if (this.sources.length === 0 || this.rangeOptions.length === 0) {
      return;
    }

    const sourceId = edit.sourceId == null ? null : String(edit.sourceId);
    if (sourceId === null) {
      this.pendingEditMetric = null;
      return;
    }

    // מקור שלא ברשימה (למשל הושבת) — לא ניתן להציג את שדותיו
    if (!this.sources.some(option => option.value === sourceId)) {
      this.notifications.error('מקור הנתונים של הנתון אינו זמין — לא ניתן להציג את פרטיו');
      this.pendingEditMetric = null;
      return;
    }

    // קביעת המקור מפעילה טעינת שדות; ערכי התלות יוחלו כשהם יגיעו
    if (this.form.controls.sourceId.value !== sourceId) {
      this.form.controls.sourceId.setValue(sourceId);
      return;
    }

    if (!this.selectedSource || this.selectedSource.sourceId !== Number(sourceId)) {
      return;
    }

    this.form.patchValue({
      name: edit.metricName ?? '',
      // סמל שאינו ברשימה — נשאיר את הבחירה הקיימת במקום להציג ריק
      cardSourceId: this.cardIcons.some(option => option.value === edit.iconCode)
        ? edit.iconCode ?? null
        : this.form.controls.cardSourceId.value,
      iconCode: edit.iconCode ?? null,
      calculationTypeId: edit.calculationTypeId ?? null,
      groupFieldId: edit.groupFieldId ?? NO_GROUPING,
      sumFieldId: edit.sumFieldId ?? null,
      // פירוט נשמר רק למקור שורות — במקור ערך יחיד השדות קבועים בקטלוג
      detailFieldIds: this.isRowsSource
        ? (edit.detailFieldIds ?? []).filter(fieldId =>
            this.selectedSource!.fields.some(field => field.fieldId === fieldId))
        : [],
      displayInDashboard: edit.isActive ?? true
    });

    // תנאי הסינון נשמרו כ-JSON — מוצגים חזרה רק אם שדותיהם שייכים למקור
    this.filterRoot = parseFilterTree(this.editingFiltersJson, this.selectedSource);

    // רכיבי ה-checkbox נקראים מהמערך, ולכן אין צורך בעדכון נוסף
    this.applyCalculationType(this.form.controls.calculationTypeId.value);
    this.pendingEditMetric = null;
  }

  /** תווית השדה לפי מזההו — לתצוגת "שדה תאריך" (הערך עצמו אינו נבחר בטופס) */
  fieldLabel(fieldId: number): string {
    return this.selectedSource?.fields.find(f => f.fieldId === fieldId)?.label ?? '';
  }

  isFieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  /** "שדות להצגה בפירוט" ריקים אחרי שינוי או ניסיון שמירה */
  get isDetailFieldsInvalid(): boolean {
    const control = this.form.controls.detailFieldIds;
    return this.isRowsSource && control.invalid && (control.dirty || control.touched);
  }

  get isScalarSource(): boolean {
    return this.selectedSource !== null && !this.isRowsSource;
  }


  isFieldFilled(fieldName: FormFieldName): boolean {
    const value = this.form.controls[fieldName].value;
    return value !== null && value !== undefined && value !== '';
  }

 
  isFieldEmptyForDisplay(fieldName: FormFieldName): boolean {
    if (!this.isFieldFilled(fieldName)) {
      return true;
    }
    return fieldName === 'groupFieldId' && this.form.controls.groupFieldId.value === NO_GROUPING;
  }

  /** מוסיפה את מחלקת "ריק" לשדה — ה-SCSS צובעת אותו באפור */
  fieldStateClass(fieldName: FormFieldName): Record<string, boolean> {
    return { empty: this.isFieldEmptyForDisplay(fieldName) };
  }

 
  private reportIncompleteForm(): void {
    this.form.markAllAsTouched();
    this.notifications.error(INCOMPLETE_FORM_MESSAGE);
  }

  /** כל הטופס תקין חוץ מ"שדות להצגה בפירוט" — לסיבת החסימה המדויקת */
  private onlyDetailFieldsInvalid(): boolean {
    const { detailFieldIds, ...others } = this.form.controls;
    const othersValid = Object.values(others).every(control => control.valid);
    return !detailFieldIds.valid && othersValid;
  }

  /* ---------------------- תנאי סינון (5.5.5–5.5.8) ---------------------- */

  readonly filterLogicOptions: Array<{ value: FilterLogic; label: string }> = [
    { value: 'AND', label: 'וגם (AND)' },
    { value: 'OR', label: 'או (OR)' }
  ];

  /** שדות שניתנים לסינון במקור הנבחר — נקבעים בקטלוג (IsFilterable) */
  get filterFields(): DataSourceField[] {
    return (this.selectedSource?.fields ?? []).filter(field => field.isFilterable);
  }

  /** תנאי ראשון — נוצר שורש AND אוטומטית */
  addFirstFilterCondition(): void {
    this.filterRoot = {
      kind: 'group',
      id: newFilterId(),
      logic: 'AND',
      children: [newFilterCondition()]
    };
  }

  addFilterCondition(group: FilterGroup): void {
    const next = cloneFilterNode(this.filterRoot) as FilterGroup | null;
    const target = next ? findFilterGroup(next, group.id) : null;
    if (!next || !target) {
      return;
    }
    target.children = [...target.children, newFilterCondition()];
    this.filterRoot = next;
  }

  /** קבוצה חדשה — הכפתור מוסתר ברמה האחרונה, וגם כאן לא נוצרת מתחתיה */
  addFilterGroup(group: FilterGroup): void {
    const next = cloneFilterNode(this.filterRoot) as FilterGroup | null;
    const target = next ? findFilterGroup(next, group.id) : null;
    if (!next || !target || filterDepthOf(next, group.id) >= MAX_FILTER_DEPTH) {
      return;
    }
    target.children = [...target.children, newFilterGroup()];
    this.filterRoot = next;
  }

  /** הסרת תנאי או קבוצה — קבוצה שנשארה ריקה נמחקת עמו */
  removeFilterNode(node: FilterNode): void {
    const next = cloneFilterNode(this.filterRoot) as FilterGroup | null;
    if (!next) {
      return;
    }
    if (next.id === node.id) {
      this.filterRoot = null;
      return;
    }
    if (!removeFromFilterTree(next, node.id)) {
      return;
    }
    this.filterRoot = pruneEmptyFilterGroups(next);
  }

  /** החלפת AND / OR של קבוצה */
  setFilterLogic(group: FilterGroup, logic: FilterLogic): void {
    this.updateFilterGroup(group, target => {
      target.logic = logic === 'OR' ? 'OR' : 'AND';
    });
  }

  /** בחירת שדה — האופרטור והערך שייכים לשדה הקודם ולכן מתאפסים */
  setFilterField(group: FilterGroup, condition: FilterCondition, field: DataSourceField | null): void {
    const fieldId = field?.fieldId ?? null;
    this.updateFilterCondition(group, condition, updated => {
      if (updated.fieldId === fieldId) {
        return;
      }
      updated.fieldId = fieldId;
      updated.operator = '';
      updated.value = null;
      updated.values = [];
    });
  }

  /**
   * האופרטורים הזמינים לתנאי: כל הפעילים מ-CTRL_FilterOperators,
   * פרט ל"ריק" / "אינו ריק" שאינם מוצעים לשדה שלא יכול להיות ריק.
   */
  filterOperatorOptions(condition: FilterCondition): FilterOperator[] {
    const field = this.filterFieldOf(condition.fieldId);
    return this.filterOperators.filter(operator =>
      NULL_OPERATORS.includes((operator.code ?? '').toUpperCase())
        ? field?.isNullable === true
        : true);
  }

  /** בחירת אופרטור — ערך נשמר רק כשהאופרטור מחייב ערך, ובצורתו המתאימה */
  setFilterOperator(group: FilterGroup, condition: FilterCondition, operator: FilterOperator | null): void {
    this.updateFilterCondition(group, condition, updated => {
      updated.operator = operator?.code ?? '';
      if (!operator?.needsValue) {
        // אין רכיב ערך — הערך הקודם מנוקה כדי שלא יישמר תנאי לא הגיוני
        updated.value = null;
        updated.values = [];
      } else if (filterIsMultiValue(updated)) {
        updated.value = null;
      } else {
        updated.values = [];
      }
    });
  }

  /** ערך יחיד — מחרוזת; מתאריך נשמרת כ-YYYY-MM-DD */
  setFilterValue(group: FilterGroup, condition: FilterCondition, value: unknown): void {
    const text = value instanceof Date ? toIsoDate(value) : value == null ? null : String(value);
    this.updateFilterCondition(group, condition, updated => {
      updated.value = text;
    });
  }

  /** ערכי רשימה — IN / NOT_IN */
  setFilterValues(group: FilterGroup, condition: FilterCondition, values: string[] | null): void {
    this.updateFilterCondition(group, condition, updated => {
      updated.values = [...(values ?? [])];
    });
  }

  /** האם לתנאי יש רכיב ערך — לפי needsValue של האופרטור שנבחר */
  filterNeedsValue(condition: FilterCondition): boolean {
    return this.filterOperatorOf(condition)?.needsValue === true;
  }

  /** האם התנאי מקבל כמה ערכים (IN / NOT_IN) — בורר מרובה */
  isFilterMultiValue(condition: FilterCondition): boolean {
    return filterIsMultiValue(condition);
  }

  /** שדה מסוג רשימה — רכיב הערך הוא בורר (ללא מקור ערכים בשלב זה) */
  isFilterListField(condition: FilterCondition): boolean {
    return (this.filterFieldOf(condition.fieldId)?.filterInputType ?? '').toUpperCase() === FILTER_INPUT_LIST;
  }

  /** שדה תאריך — רכיב הערך הוא בורר תאריך */
  isFilterDateField(condition: FilterCondition): boolean {
    return isDateType(this.filterFieldOf(condition.fieldId)?.dataType);
  }

  /** האם הקבוצה נמצאת ברמה שמתחתיה אסור להוסיף קבוצה */
  isFilterMaxDepth(group: FilterGroup): boolean {
    return this.filterRoot === null || filterDepthOf(this.filterRoot, group.id) >= MAX_FILTER_DEPTH;
  }

  filterFieldOf(fieldId: number | null): DataSourceField | null {
    if (fieldId === null) {
      return null;
    }
    return this.filterFields.find(field => field.fieldId === fieldId) ?? null;
  }

  /** הערך של p-datepicker — מחרוזת ה-ISO של התנאי מומרת ל-Date */
  filterDateValue(value: string | null): Date | null {
    if (!value) {
      return null;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  }

  /** תנאי חסר — שדה, אופרטור או ערך חובה; חוסם שמירה */
  get hasIncompleteFilterCondition(): boolean {
    return collectFilterConditions(this.filterRoot).some(condition => {
      if (condition.fieldId === null || !condition.operator) {
        return true;
      }
      if (!this.filterNeedsValue(condition)) {
        return false;
      }
      if (filterIsMultiValue(condition)) {
        return !Array.isArray(condition.values) || condition.values.length === 0;
      }
      return condition.value === null || String(condition.value).trim() === '';
    });
  }

  isFilterGroup = (node: FilterNode): node is FilterGroup => node.kind === 'group';

  trackFilterNode = (_index: number, node: FilterNode): number => node.id;

  private filterOperatorOf(condition: FilterCondition): FilterOperator | null {
    const code = (condition.operator ?? '').toUpperCase();
    if (!code) {
      return null;
    }
    return this.filterOperators.find(operator => (operator.code ?? '').toUpperCase() === code) ?? null;
  }

  private updateFilterGroup(group: FilterGroup, mutate: (group: FilterGroup) => void): void {
    const next = cloneFilterNode(this.filterRoot) as FilterGroup | null;
    const target = next ? findFilterGroup(next, group.id) : null;
    if (!next || !target) {
      return;
    }
    mutate(target);
    this.filterRoot = next;
  }

  /** עדכון תנאי בודד — העץ מוחלף בהעתק, ולכן הקלט של ההורה אינו משתנה במקום */
  private updateFilterCondition(
    group: FilterGroup,
    condition: FilterCondition,
    mutate: (condition: FilterCondition) => void
  ): void {
    this.updateFilterGroup(group, target => {
      const found = target.children.find(
        child => child.kind === 'condition' && child.id === condition.id
      );
      if (found?.kind === 'condition') {
        mutate(found);
      }
    });
  }

  
  /** שמירה בקטלוג המרכזי */
  save(): void {
    // טווח התאריכים אינו נבדק על ידי הוולידטורים של הטופס (תלוי באופן התקופה)
    if (this.isRangeModeInvalid) {
      this.form.controls.dateFromFieldId.markAsTouched();
      this.form.controls.dateToFieldId.markAsTouched();
      this.notifications.error(DATE_RANGE_REQUIRED_MESSAGE);
      return;
    }

    if (!this.form.valid) {
      // ההודעה הייעודית מוצגת כשהיא הסיבה היחידה לחסימה
      if (this.onlyDetailFieldsInvalid()) {
        this.notifications.error(DETAIL_FIELDS_REQUIRED_MESSAGE);
      } else {
        this.reportIncompleteForm();
      }
      return;
    }

    // תנאי סינון אינם חוסמים את השמירה: תנאי חסר נשמט מהעץ (ראו buildFilterJson)

    this.saving = true;

    const metricId = this.editingMetricId;
    if (metricId !== null) {
      // עריכה: עדכון השורה הקיימת — לא נוצרת רשומה חדשה
      this.subscriptions.add(
        this.service.updateMetric(metricId, this.buildDraft(), this.editingRowVersion).subscribe({
          next: () => {
            this.saving = false;
            this.notifications.success('הנתון עודכן');
            this.saved.emit(metricId);
            this.cancel();
          },
          error: (error: unknown) => {
            this.saving = false;
            this.notifications.errorFromServer(error, 'עדכון הנתון נכשל');
          }
        })
      );
      return;
    }

    this.subscriptions.add(
      this.service.save(this.buildDraft()).subscribe({
        next: id => {
          this.saving = false;
          this.notifications.success('הנתון נוסף לקטלוג');
          this.saved.emit(id);
          this.cancel();
        },
        error: (error: unknown) => {
          this.saving = false;
          this.notifications.errorFromServer(error, 'שמירת הנתון נכשלה');
        }
      })
    );
  }

  /** ביטול: סוגר את הדיאלוג בלי לשמור דבר */
  cancel(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  private buildDraft(): MetricDraft {
    const value = this.form.getRawValue();
    const isRange = this.dateRangeMode === 'range';
    const isRows = this.isRowsSource;

    return {
      name: value.name.trim(),
      // המזהה מחרוזת בטופס; השרת מצפה ל-int
      sourceId: value.sourceId === null ? null : Number(value.sourceId),
      // פרוצדורה — DIRECT נקבע מאחורי הקלעים ואינו תלוי בבחירה בטופס
      calculationTypeId: this.isProcedureSource
        ? this.defaultCalculationTypeId()
        : (value.calculationTypeId === null ? null : Number(value.calculationTypeId)),
      // סיכום נשלח רק ב-SUM במקור שורות; applyCalculationType כבר מנקה את הערך אחרת
      sumFieldId: isRows && this.isSumCalculationType(value.calculationTypeId)
        ? value.sumFieldId
        : null,
      // 0 ברשימה = "ללא קיבוץ"; השרת שומר null. מקור ערך יחיד אינו מקובץ.
      groupFieldId: !isRows || value.groupFieldId === NO_GROUPING ? null : value.groupFieldId,
      // null = טווח תאריכים מפורש; אחרת מספר הימים כפי שהוא בקטלוג
      // ("לפי מסנן הלוח" אינו מוצע בטופס — ערך כזה מוחלף בתקופה הראשונה)
      dateRangeType: isRange
        ? null
        : (value.dateRangeType && !isDashboardPeriod(value.dateRangeType)
            ? value.dateRangeType
            : this.defaultPeriod()),
      dateFromFieldId: isRange ? value.dateFromFieldId : null,
      dateToFieldId: isRange ? value.dateToFieldId : null,
      iconCode: value.iconCode,
      detailFieldIds: isRows ? [...value.detailFieldIds] : [],
      displayInDashboard: value.displayInDashboard,
      // מקור ערך יחיד אינו מסונן. מקור שורות שולח את העץ; "{}" = אין תנאים
      // (null היה משאיר בשרת את העץ הישן — ראו UpdateMetricCommand)
      filtersJson: isRows ? this.buildFilterJson() : null
    };
  }

  /**
   * ה-JSON של עץ תנאי הסינון. תנאים חסרים אינם חוסמים את השמירה —
   * הם נשמטים מהעץ, וקבוצה שנשארה בלי ילדים נשמטת גם היא.
   * העץ אינו משפיע על שאר שדות הטופס.
   */
  private buildFilterJson(): string {
    const root = this.filterRoot;
    if (root === null) {
      return '{}';
    }

    const cleaned = toFilterJson(root, this.filterOperators);
    return JSON.stringify(cleaned ?? {});
  }
}

/** אפשרות שדה בתבנית — תואמת לשדות שחוזרים מהשרת */
type DataSourceFieldOption = DataSource['fields'][number];

/**
 * האם התקופה היא "לפי מסנן הלוח" — הערך ההיסטורי DASHBOARD.
 * האפשרות אינה מוצגת בטופס, אך נתונים ותיקים עדיין נושאים אותה.
 */
function isDashboardPeriod(value: string | null | undefined): boolean {
  return (value ?? '').trim().toUpperCase() === DASHBOARD;
}

/**
 * האם סוג הנתון במסד הוא תאריך/שעה — לפי השם שמוחזר מהקטלוג
 * (datetime, date, smalldatetime, time...).
 */
function isDateType(dataType: string | null | undefined): boolean {
  if (!dataType) {
    return false;
  }
  const normalized = dataType.toLowerCase();
  return normalized.includes('date') || normalized.includes('time');
}

/* ---------------------- עזרי עץ תנאי הסינון ---------------------- */

/** תנאי חדש — ריק עד שהמשתמש בוחר שדה ואופרטור */
function newFilterCondition(): FilterCondition {
  return { kind: 'condition', id: newFilterId(), fieldId: null, operator: '', value: null, values: [] };
}

/** קבוצה חדשה — AND כברירת מחדל, בלי ילדים */
function newFilterGroup(): FilterGroup {
  return { kind: 'group', id: newFilterId(), logic: 'AND', children: [] };
}

/** מזהה מקומי בלבד — אינו נשמר בשרת */
function newFilterId(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

/** העתקה עמוקה של צומת — העץ מוחלף ולא משתנה במקום */
function cloneFilterNode(node: FilterNode | null): FilterNode | null {
  if (node === null) {
    return null;
  }
  if (node.kind === 'condition') {
    return { ...node, values: [...node.values] };
  }
  return { ...node, children: node.children.map(child => cloneFilterNode(child) as FilterNode) };
}

/** אופרטור של ערכים מרובים (IN / NOT_IN) — חייב לפחות ערך אחד */
function filterIsMultiValue(condition: FilterCondition): boolean {
  const code = (condition.operator ?? '').toUpperCase();
  return MULTI_VALUE_OPERATORS.includes(code);
}

/**
 * התנאי שלם — יש שדה, אופרטור מוכר, וערך כנדרש ממנו.
 * תנאי חסר נשמט מהעץ שנשלח לשרת ואינו חוסם את השמירה.
 */
function isFilterConditionComplete(condition: FilterCondition, operators: FilterOperator[]): boolean {
  if (condition.fieldId === null || !condition.operator) {
    return false;
  }

  const operator = operators.find(item => item.code.toUpperCase() === condition.operator.toUpperCase());
  if (!operator) {
    return false;
  }

  if (!operator.needsValue) {
    return true;
  }

  if (filterIsMultiValue(condition)) {
    return condition.values.some(value => (value ?? '').trim().length > 0);
  }

  return (condition.value ?? '').toString().trim().length > 0;
}

/**
 * ממיר את העץ ל-JSON שנשמר: תנאים חסרים נשמטים,
 * וקבוצה שנשארה בלי ילדים נשמטת גם היא. null = אין תנאים בכלל.
 */
function toFilterJson(node: FilterNode, operators: FilterOperator[] = []): FilterGroup | FilterCondition | null {
  if (node.kind === 'condition') {
    return isFilterConditionComplete(node, operators) ? node : null;
  }

  const children = node.children
    .map(child => toFilterJson(child, operators))
    .filter((child): child is FilterGroup | FilterCondition => child !== null);

  return children.length === 0 ? null : { ...node, children };
}

function findFilterGroup(group: FilterGroup, id: number): FilterGroup | null {
  if (group.id === id) {
    return group;
  }
  for (const child of group.children) {
    if (child.kind === 'group') {
      const found = findFilterGroup(child, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/** עומק הקבוצה — השורש ברמה 1; 0 = לא נמצאה */
function filterDepthOf(group: FilterGroup, id: number, depth = 1): number {
  if (group.id === id) {
    return depth;
  }
  for (const child of group.children) {
    if (child.kind === 'group') {
      const found = filterDepthOf(child, id, depth + 1);
      if (found > 0) {
        return found;
      }
    }
  }
  return 0;
}

/** מוחק את הצומת עם המזהה — מחזיר האם נמצאה */
function removeFromFilterTree(group: FilterGroup, id: number): boolean {
  const index = group.children.findIndex(child => child.id === id);
  if (index >= 0) {
    group.children = [...group.children.slice(0, index), ...group.children.slice(index + 1)];
    return true;
  }
  for (const child of group.children) {
    if (child.kind === 'group' && removeFromFilterTree(child, id)) {
      return true;
    }
  }
  return false;
}

/**
 * מסיר קבוצות שנשארו בלי ילדים. קבוצה ריקה אינה נשמרת — גם השרת דוחה אותה —
 * ולכן היא אינה נשארת בעץ. עץ שהתרוקן לגמרי חוזר ל-null.
 */
function pruneEmptyFilterGroups(group: FilterGroup): FilterGroup | null {
  group.children = group.children
    .map(child => (child.kind === 'group' ? pruneEmptyFilterGroups(child) : child))
    .filter((child): child is FilterNode => child !== null);

  return group.children.length === 0 ? null : group;
}

/** כל התנאים בעץ, בכל עומק */
function collectFilterConditions(node: FilterNode | null): FilterCondition[] {
  if (node === null) {
    return [];
  }
  if (node.kind === 'condition') {
    return [node];
  }
  return node.children.flatMap(collectFilterConditions);
}

/**
 * קורא את עץ הסינון השמור (FiltersJson). JSON ריק או פגום → אין תנאים.
 * תנאי ששדהו אינו במקור מושמט, וקבוצה שנשארה ריקה מוסרת.
 */
function parseFilterTree(json: string | null | undefined, source: DataSource | null): FilterGroup | null {
  if (!json) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!isPlainObject(parsed) || !Array.isArray(parsed['children'])) {
    return null;
  }

  const fieldIds = new Set((source?.fields ?? []).map(field => field.fieldId));
  const root = readFilterNode(parsed, fieldIds);
  return root?.kind === 'group' ? pruneEmptyFilterGroups(root) : null;
}

/** צומת מהג'ייסון — תנאי, קבוצה, או null לצומת שאינו תקין */
function readFilterNode(value: unknown, fieldIds: Set<number>): FilterNode | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (Array.isArray(value['children'])) {
    const children = value['children']
      .map(child => readFilterNode(child, fieldIds))
      .filter((child): child is FilterNode => child !== null);

    if (children.length === 0) {
      return null;
    }

    return {
      kind: 'group',
      id: newFilterId(),
      logic: String(value['logic'] ?? '').toUpperCase() === 'OR' ? 'OR' : 'AND',
      children
    };
  }

  const fieldId = Number(value['fieldId']);
  if (!Number.isInteger(fieldId) || !fieldIds.has(fieldId)) {
    return null;
  }

  return {
    kind: 'condition',
    id: newFilterId(),
    fieldId,
    operator: typeof value['operator'] === 'string' ? value['operator'] : '',
    value: typeof value['value'] === 'string' ? value['value'] : null,
    values: Array.isArray(value['values'])
      ? value['values'].filter((item): item is string => typeof item === 'string')
      : []
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Date → "YYYY-MM-DD" — התאריך נשמר בעץ כמחרוזת */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
