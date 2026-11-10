import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Subscription } from 'rxjs';
import { CALCULATION_TYPE_OPTIONS, CalculationType, CalculationTypeId, DataDefinitionDraft, DataSource, LookupOption, MetricDraft, PreviewResult } from '../shared/models/data-definition.model';
import { CALCULATION_PERIOD_OPTIONS, CARD_ICON_OPTIONS, DataDefinitionService } from '../shared/services/data-definition.service';
import { NotificationService } from '../shared/services/notification.service';
import { MetricListItemDto } from '../web-api-client';


const DEFAULT_CALCULATION_TYPE: CalculationType = 'COUNT';

const DEFAULT_DETAIL_FIELD_COUNT = 3;

const INCOMPLETE_FORM_MESSAGE = 'יש למלא את כל שדות החובה המסומנים ב-*';

const DETAIL_FIELDS_REQUIRED_MESSAGE = 'יש לבחור לפחות שדה אחד להצגה בפירוט';

/**
 * "שדות להצגה בפירוט" חייבים להכיל לפחות שדה אחד —
 * נתון בלי שדות פירוט אינו יכול להישמר.
 */
function atLeastOneItemValidator(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;
  return Array.isArray(value) && value.length > 0 ? null : { required: true };
}

const NO_GROUPING = 0;

const BOARD_FILTER = 'BOARD_FILTER';

/** תווית הסכימה נגזרת משורת הקטלוג (ראה GetCalculationTypesQueryHandler) */
const SUM_LABEL_MARKER = '(SUM)';

/**
 * האם הבחירה היא סוג החישוב "סכימה".
 * הערך שנבחר הוא ה-ID מ-CTRL_CalculationTypes; נקרא לו "SUM" לפי התווית,
 * שמוחזרת כ"<Name> (<Value>)" — למשל "סכימת ערכי שדה (SUM)".
 */
function isSumCalculationType(calculationTypeId: CalculationTypeId | null, options: LookupOption[]): boolean {
  if (calculationTypeId === null) {
    return false;
  }
  const label = options.find(option => Number(option.value) === calculationTypeId)?.label ?? '';
  return label.includes(SUM_LABEL_MARKER);
}


const LEGACY_LOOKUP_LABELS: Record<string, string> = {
  MONTH: 'חודש נוכחי',
  QUARTER: 'רבעון נוכחי',
  YEAR: 'שנה נוכחית'
};

/** השדות שהמשתמש ממלא — לחיווי ויזואלי של "מלא / ריק" */
type FormFieldName =
  | 'name'
  | 'sourceId'
  | 'cardSourceId'
  | 'dateRangeType'
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
    SelectModule
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

  /**
   * הנתון שנערך — null/undefined במצב "יצירת נתון חדש".
   * כשהוא מועבר, הדיאלוג נפתח עם ערכי הנתון, והשמירה מעדכנת אותו במקום ליצור חדש.
   */
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
  previewing = false;
  /** תוצאת תצוגה מקדימה אחרונה — מוצגת בפאנל שמעל הכפתורים */
  previewResult: PreviewResult | null = null;


  private lastSourceId: string | null = null;

  private sourceRequest?: Subscription;

  /** מזהה הנתון הנערך — null במצב יצירה. קובע גם את הכותרת ואת סוג השמירה */
  private editingMetricId: number | null = null;

  /**
   * ערכי העריכה שממתינים להשלמת הטעינות (תקופות / סמלים / מקורות).
   * אסור להחילם לפני שהרשימות הגיעו — אחרת ברירות המחדל של "נתון חדש"
   * ידרסו את הערכים השמורים.
   */
  private pendingEditMetric: MetricListItemDto | null = null;

  readonly form = this.fb.group({
    name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    // המזהה נשמר כמחרוזת, בהתאמה ל-optionValue של p-select ול-LookupOption.value
    sourceId: this.fb.control<string | null>(null, { validators: [Validators.required] }),

    cardSourceId: this.fb.control<string | null>(null),

    iconCode: this.fb.control<string | null>(null),
    dateRangeType: this.fb.control<string | null>(null, { validators: [Validators.required] }),
    // ה-ID של סוג החישוב מ-CTRL_CalculationTypes — נשמר כמספר כדי להתאים ל-optionValue
    calculationTypeId: this.fb.control<CalculationTypeId | null>(null, { validators: [Validators.required] }),
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

    return isSumCalculationType(this.form.controls.calculationTypeId.value, this.calculationTypeOptions);
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

  /** שם הנתון כפי שהוזן — לתצוגה המקדימה */
  get draftName(): string {
    return this.form.controls.name.value.trim();
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
    // הערך החדש נקבע על ידי המסגרת, ולא על ידי הקלט עצמו — מסמנים כנוגע
    // כדי ששגיאת "יש לבחור לפחות שדה אחד" תופיע ברגע ביטול הסימון האחרון.
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
    // בחירת מקור מחזירה את השדות אחר כך; את התוצאה הישנה מנקים מיד עם שינוי ההגדרה
    this.subscriptions.add(this.form.valueChanges.subscribe(() => (this.previewResult = null)));
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
      this.editingMetricId = this.metric?.metricId ?? null;
      this.pendingEditMetric = this.isEditing ? this.metric : null;
      this.tryApplyEditValues();
    }
  }

  /** קובע את מצב הפתיחה: יצירת נתון חדש, או עריכת נתון שנבחר */
  private startMode(metric: MetricListItemDto | null): void {
    this.editingMetricId = metric?.metricId ?? null;
    this.pendingEditMetric = this.isEditing ? metric : null;

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
          // אין ברירת מחדל קשיחה: נבחרת שורת הסכימה אם קיימת, אחרת הראשונה ברשימה
          const sum = types.find(option => option.label.includes(SUM_LABEL_MARKER));
          this.applyCalculationType((sum ?? types[0])?.value ?? null);
          this.tryApplyEditValues();
        },
        error: (error: unknown) => this.notifications.errorFromServer(error, 'טעינת סוגי החישוב נכשלה')
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

  private findBoardFilterPeriod(): string | null {
    return this.rangeOptions.find(option => option.value === BOARD_FILTER)?.value
      ?? this.rangeOptions[0]?.value
      ?? null;
  }

  private selectDefaultPeriod(): void {
    if (this.rangeOptions.length > 0 && this.form.controls.dateRangeType.value === null) {
      this.form.controls.dateRangeType.setValue(this.findBoardFilterPeriod());
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
      this.form.patchValue({
        dateRangeType: edit.dateRangeValue ?? this.form.controls.dateRangeType.value,
        groupFieldId: edit.groupFieldId ?? NO_GROUPING,
        sumFieldId: edit.sumFieldId ?? null,
        detailFieldIds: (edit.detailFieldIds ?? []).filter(fieldId =>
          source.fields.some(field => field.fieldId === fieldId))
      });
    } else {
      this.form.patchValue({
        dateRangeType: this.findBoardFilterPeriod(),
        groupFieldId: NO_GROUPING,
        sumFieldId: source.fields.find(f => f.isSummable)?.fieldId ?? null,
        detailFieldIds: source.fields.slice(0, DEFAULT_DETAIL_FIELD_COUNT).map(f => f.fieldId)
      });
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
    // הדרישה לסיכום נקבעת לפי סוג החישוב: רק SUM דורש שדה סיכום
    if (isSumCalculationType(typeId, this.calculationTypeOptions)) {
      sumControl.setValidators([Validators.required]);
    } else {
      // הסתרת הסיכום — מנקים גם את הערך כדי שלא יישמר שדה מוסתר
      sumControl.setValue(null);
      sumControl.clearValidators();
    }
    sumControl.updateValueAndValidity();
  }

  /** איפוס שדות שתלויים במקור — אחרת נשארים ערכים של מקור אחר */
  private resetDependentFields(): void {
    this.form.patchValue(
      {
        sumFieldId: null,
        groupFieldId: NO_GROUPING,
        detailFieldIds: [],
        // "סמל כרטיס" אינו תלוי במקור — נשמר כפי שהוא
      },
      { emitEvent: false }
    );
  }

  private resetForm(): void {
    this.selectedSource = null;
    this.lastSourceId = null;
    this.previewResult = null;
    // לפני startMode, שקובע את המצב מחדש לפי metric
    this.editingMetricId = null;
    this.pendingEditMetric = null;
    this.form.reset({
      name: '',
      sourceId: null,
      cardSourceId: null,
      iconCode: null,
      dateRangeType: this.findBoardFilterPeriod(),
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

  /**
   * ממלא את הטופס מערכי הנתון הנערך — רק כשיש את כל מה שנדרש:
   * הרשימות (מקורות / תקופות / סמלים / סוגי חישוב) ושדות המקור.
   * נקראת מכל טעינה שמסתיימת, ומדלגת עד שהתנאים מתקיימים.
   * בסיום מנקה את הערכים הממתינים, כדי שברירות המחדל של "נתון חדש"
   * לא ידרסו את השמורים.
   */
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
      dateRangeType: edit.dateRangeValue ?? this.findBoardFilterPeriod(),
      groupFieldId: edit.groupFieldId ?? NO_GROUPING,
      sumFieldId: edit.sumFieldId ?? null,
      detailFieldIds: (edit.detailFieldIds ?? []).filter(fieldId =>
        this.selectedSource!.fields.some(field => field.fieldId === fieldId)),
      displayInDashboard: edit.isActive ?? true
    });

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
    return control.invalid && (control.dirty || control.touched);
  }


  isFieldFilled(fieldName: FormFieldName): boolean {
    const value = this.form.controls[fieldName].value;
    return value !== null && value !== undefined && value !== '';
  }

  /**
   * מזהה הבחירה (0 = "ללא קיבוץ") אינו "ערך" לתצוגה —
   * לכן "קיבוץ לפי" נחשב מלא רק כשנבחר שדה קיבוץ אמיתי.
   */
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

  /**
   * טופס לא תקין → סימון כל השדות כנגועים (כדי שיודגשו) והודעת שגיאה כללית אחת.
   * אין פירוט איזה שדה חסר — ההודעה זהה בכל מקרה.
   */
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

  
  preview(): void {
    const name = this.form.controls.name;
    const sourceId = this.form.controls.sourceId;
    const detailFieldIds = this.form.controls.detailFieldIds;

    // תצוגה מקדימה בלי שדות פירוט אינה נותנת מידע — וממילא אי אפשר לשמור כך
    if (name.invalid || sourceId.invalid || detailFieldIds.invalid) {
      name.markAsTouched();
      sourceId.markAsTouched();
      detailFieldIds.markAsTouched();
      this.reportIncompleteForm();
      return;
    }

    this.previewing = true;
    this.subscriptions.add(
      this.service.preview(this.buildDraft()).subscribe({
        next: result => {
          this.previewing = false;
          this.previewResult = result;
          this.notifications.info(
            `התקבלו ${result.rows.length} שורות · סה"כ ${result.total}`,
            'תצוגה מקדימה'
          );
        },
        error: (error: unknown) => {
          this.previewing = false;
          this.notifications.errorFromServer(error, 'לא ניתן היה להפיק תצוגה מקדימה');
        }
      })
    );
  }

  /** שמירה בקטלוג המרכזי */
  save(): void {
    if (!this.form.valid) {
      // ההודעה הייעודית מוצגת כשהיא הסיבה היחידה לחסימה
      if (this.onlyDetailFieldsInvalid()) {
        this.notifications.error(DETAIL_FIELDS_REQUIRED_MESSAGE);
      } else {
        this.reportIncompleteForm();
      }
      return;
    }

    this.saving = true;

    const metricId = this.editingMetricId;
    if (metricId !== null) {
      // עריכה: עדכון השורה הקיימת — לא נוצרת רשומה חדשה
      this.subscriptions.add(
        this.service.updateMetric(metricId, this.buildDraft()).subscribe({
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
    return {
      name: value.name.trim(),
      // המזהה מחרוזת בטופס; השרת מצפה ל-int
      sourceId: value.sourceId === null ? null : Number(value.sourceId),
      calculationTypeId: value.calculationTypeId === null ? null : Number(value.calculationTypeId),
      // סיכום נשלח רק ב-SUM; ב-COUNT \u200FapplyCalculationType כבר מנקה את הערך
      sumFieldId: isSumCalculationType(value.calculationTypeId, this.calculationTypeOptions)
        ? value.sumFieldId
        : null,
      // 0 ברשימה = "ללא קיבוץ"; השרת שומר null
      groupFieldId: value.groupFieldId === NO_GROUPING ? null : value.groupFieldId,
      // ברירת מחדל סבירה אם הקטלוג עדיין לא נטען
      dateRangeType: value.dateRangeType ?? this.findBoardFilterPeriod() ?? '',
      iconCode: value.iconCode,
      detailFieldIds: [...value.detailFieldIds],
      displayInDashboard: value.displayInDashboard
    };
  }
}

/** אפשרות שדה בתבנית — תואמת לשדות שחוזרים מהשרת */
type DataSourceFieldOption = DataSource['fields'][number];
