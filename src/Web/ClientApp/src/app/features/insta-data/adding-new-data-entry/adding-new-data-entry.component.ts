import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Subscription } from 'rxjs';

import {
  CalculationType,
  DataSource,
  LookupOption,
  MetricDraft,
  PreviewResult
} from '../../../shared/models/data-definition.model';
import { DataDefinitionService } from '../../../shared/services/data-definition.service';
import { NotificationService } from '../../../shared/services/notification.service';

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

const SUM_CALCULATION_TYPE: CalculationType = 'SUM';


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
  | 'calculationType'
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
    CheckboxModule,
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

  readonly form = this.fb.group({
    name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    // המזהה נשמר כמחרוזת, בהתאמה ל-optionValue של p-select ול-LookupOption.value
    sourceId: this.fb.control<string | null>(null, { validators: [Validators.required] }),

    cardSourceId: this.fb.control<string | null>(null),

    iconCode: this.fb.control<string | null>(null),
    dateRangeType: this.fb.control<string | null>(null, { validators: [Validators.required] }),
    calculationType: this.fb.control<CalculationType>(DEFAULT_CALCULATION_TYPE, { nonNullable: true }),
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

  get isSummaryVisible(): boolean {

    return this.form.controls.calculationType.value === SUM_CALCULATION_TYPE;
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
    return this.labelOf(this.calculationTypeOptions, this.form.controls.calculationType.value);
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

  /**
   * הבחירה של שדות הפירוט מתבצעת על ידי ה-p-checkbox עצמו:
   * `[value]="option.fieldId"` + `formControlName="detailFieldIds"` —
   * PrimeNG מוסיף/מסיר את הערך מהמערך שהוא שומר ב-model שלו.
   * לא צריך כאן שום לוגיקת סימון ידנית.
   */

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
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /** טוען את תקופות החישוב וקובע את ברירת המחדל לפי מה שחוזר מהשרת */
  private loadLookups(): void {
    this.subscriptions.add(
      this.service.getCalculationPeriods().subscribe({
        next: periods => {
          this.rangeOptions = periods;
          this.selectDefaultPeriod();
        },
        error: (error: unknown) => this.notifications.errorFromServer(error, 'טעינת תקופות החישוב נכשלה')
      })
    );

    this.subscriptions.add(
      this.service.getCardIcons().subscribe({
        next: icons => {
          this.cardIcons = icons;
          this.selectDefaultIcon();
        },
        error: (error: unknown) => this.notifications.errorFromServer(error, 'טעינת סמלי הכרטיס נכשלה')
      })
    );

    this.subscriptions.add(
      this.service.getCalculationTypes().subscribe({
        next: types => {
          this.calculationTypeOptions = types;
          // רשימת הסוגים משמשת לתצוגה בלבד; הוולידציה של שדה הסיכום נגזרת מהערך עצמו
          this.applyCalculationType(this.form.controls.calculationType.value);
        },
        error: (error: unknown) => this.notifications.errorFromServer(error, 'טעינת סוגי החישוב נכשלה')
      })
    );
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

  private loadSources(): void {
    this.subscriptions.add(
      this.service.getSources().subscribe({
        next: sources => {
          this.sources = sources;
          this.selectDefaultIcon();
          this.selectDefaultSource();
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
            },
            error: (error: unknown) => this.notifications.errorFromServer(error, 'טעינת שדות המקור נכשלה')
          });
      })
    );
  }

  /** SUM מחייב בחירת שדה סיכום; COUNT מסתיר אותו */
  private watchCalculationTypeChanges(): void {
    this.subscriptions.add(
      this.form.controls.calculationType.valueChanges.subscribe(type => {
        this.applyCalculationType(type);
      })
    );
  }


  
  private applyDefaultsAfterSourceSelected(source: DataSource): void {
    this.form.patchValue({
      calculationType: DEFAULT_CALCULATION_TYPE,
      dateRangeType: this.findBoardFilterPeriod(),
      groupFieldId: NO_GROUPING,
      sumFieldId: source.fields.find(f => f.isSummable)?.fieldId ?? null,
      detailFieldIds: source.fields.slice(0, DEFAULT_DETAIL_FIELD_COUNT).map(f => f.fieldId)
    });

    this.applyCalculationType(this.form.controls.calculationType.value);
  }

  private applyCalculationType(type: CalculationType): void {
    const sumControl = this.form.controls.sumFieldId;
    // הדרישה לסיכום נקבעת לפי סוג החישוב: רק SUM דורש שדה סיכום
    if (type === SUM_CALCULATION_TYPE) {
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
    this.form.reset({
      name: '',
      sourceId: null,
      cardSourceId: null,
      iconCode: null,
      dateRangeType: this.findBoardFilterPeriod(),
      calculationType: DEFAULT_CALCULATION_TYPE,
      sumFieldId: null,
      // "ללא קיבוץ" ברשימה = 0, ואילו בטופס נשמר null — כך ה-select מציג את השורה
      groupFieldId: NO_GROUPING,
      detailFieldIds: [],
      displayInDashboard: true
    });
    // reset מעדכן ערכים בלי emitEvent, לכן מסדירים את הוולידטורים ידנית
    this.applyCalculationType(DEFAULT_CALCULATION_TYPE);
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
      calculationType: value.calculationType,
      // סיכום נשלח רק ב-SUM; ב-COUNT \u200FapplyCalculationType כבר מנקה את הערך
      sumFieldId: value.calculationType === SUM_CALCULATION_TYPE ? value.sumFieldId : null,
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
