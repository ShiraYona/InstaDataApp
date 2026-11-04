import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
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

const DEFAULT_CALCULATION_TYPE: CalculationType = 'COUNT';

const DEFAULT_DETAIL_FIELD_COUNT = 3;

const INCOMPLETE_FORM_MESSAGE = 'יש למלא את כל שדות החובה המסומנים ב-*';

const NO_GROUPING = 0;

const BOARD_FILTER = 'BOARD_FILTER';

const SUM_CALCULATION_TYPE: CalculationType = 'SUM';


const LEGACY_LOOKUP_LABELS: Record<string, string> = {
  MONTH: 'חודש נוכחי',
  QUARTER: 'רבעון נוכחי',
  YEAR: 'שנה נוכחית'
};


@Component({
  selector: 'app-adding-new-data-entry',
  standalone: true,
  imports: [
    ReactiveFormsModule,
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
  private readonly messages = inject(MessageService);
  private readonly subscriptions = new Subscription();


  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Output() saved = new EventEmitter<number>();

  /** מספר הימים לחישוב — נטען מ-CTRL_CalculationDays */
  rangeOptions: LookupOption[] = [];

  /** סוגי החישוב — נטענים מ-CTRL_CalculationTypes */
  calculationTypeOptions: LookupOption[] = [];

  /** סמלי הכרטיס — נטענים מ-CTRL_Symbols */
  cardIcons: LookupOption[] = [];

  /** רשימת מקורות הנתונים — נטענת פעם אחת */
  sources: LookupOption[] = [];
  /** המקור שנבחר, כולל השדות שהוגדרו עבורו */
  selectedSource: DataSource | null = null;

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
    detailFieldIds: this.fb.control<number[]>([], { nonNullable: true }),
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
   * "שדה תאריך" אינו שדה בחירה — הוא מוצג כשדה טקסט מושבת,
   * והערך שלו מגיע מקטלוג מקור הנתונים (dateFieldId).
   */
  get dateFieldLabel(): string {
    const id = this.selectedSource?.dateFieldId;
    return id != null ? this.fieldLabel(id) : '';
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

  constructor() {
    this.loadLookups();
    // הרשימות והמנויים מוכנים לפני שבוחרים ברירת מחדל — אחרת הבחירה לא נרשמת
    this.watchSourceChanges();
    this.watchCardSourceChanges();
    this.watchCalculationTypeChanges();
    // שינוי בהגדרות מייתר תצוגה מקדימה קודמת
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

  // ---------------------------------------------------------------- טעינה

  /** טוען את תקופות החישוב וקובע את ברירת המחדל לפי מה שחוזר מהשרת */
  private loadLookups(): void {
    this.subscriptions.add(
      this.service.getCalculationPeriods().subscribe({
        next: periods => {
          this.rangeOptions = periods;
          this.selectDefaultPeriod();
        },
        error: () => this.messages.add({
          severity: 'error',
          summary: 'שגיאה',
          detail: 'טעינת תקופות החישוב נכשלה',
          life: 4000
        })
      })
    );

    this.subscriptions.add(
      this.service.getCardIcons().subscribe({
        next: icons => {
          this.cardIcons = icons;
          this.selectDefaultIcon();
        },
        error: () => this.messages.add({
          severity: 'error',
          summary: 'שגיאה',
          detail: 'טעינת סמלי הכרטיס נכשלה',
          life: 4000
        })
      })
    );

    this.subscriptions.add(
      this.service.getCalculationTypes().subscribe({
        next: types => {
          this.calculationTypeOptions = types;
          // רשימת הסוגים משמשת לתצוגה בלבד; הוולידציה של שדה הסיכום נגזרת מהערך עצמו
          this.applyCalculationType(this.form.controls.calculationType.value);
        },
        error: () => this.messages.add({
          severity: 'error',
          summary: 'שגיאה',
          detail: 'טעינת סוגי החישוב נכשלה',
          life: 4000
        })
      })
    );
  }

  /**
   * "סמל כרטיס" הוא בחירה עצמאית מרשימת CTRL_CardIcons,
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
   * בורר ברירת מחדל לתקופה — רק אם המשתמש לא בחר בינתיים.
   * בדמו "לפי מסנן הלוח" היא הברירה הראשונה (BOARD_FILTER); אם השרת לא החזיר אותה,
   * נופלים חזרה לתקופה הראשונה ברשימה.
   */
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
        error: () => this.messages.add({
          severity: 'error',
          summary: 'שגיאה',
          detail: 'טעינת מקורות הנתונים נכשלה',
          life: 4000
        })
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

  /**
   * בחירת מקור → טוען שדות ומעדכן את רשימות הסיכום/קיבוץ/פירוט.
   * שדה התאריך אינו נבחר כאן: הוא מגיע כערך תצוגה מהקטלוג של המקור.
   */
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

        // מעקב אחרי הבקשה האחרונה: בחירה מהירה של שני מקורות עלולה להחזיר
        // את תשובת המקור הקודם אחרי החדש, ואז השדות מוצגים של מקור שאינו נבחר.
        this.sourceRequest?.unsubscribe();
        this.sourceRequest = // המזהה בטופס הוא מחרוזת; הנתיב בשרת מצפה למספר
          this.service.getSourceFields(Number(sourceId)).subscribe({
            next: source => {
              this.selectedSource = source;
              this.applyDefaultsAfterSourceSelected(source);
            },
            error: () => this.messages.add({
              severity: 'error',
              summary: 'שגיאה',
              detail: 'טעינת שדות המקור נכשלה',
              life: 4000
            })
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

  // ---------------------------------------------------------------- לוגיקה

  /**
   * אחרי טעינת שדות: כל השדות התלויים במקור חוזרים לברירת מחדל,
   * והפירוט הוא שלושת השדות הראשונים.
   */
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

  // ---------------------------------------------------------------- פעולות

  /** תווית השדה לפי מזההו — לתצוגת "שדה תאריך" (הערך עצמו אינו נבחר בטופס) */
  fieldLabel(fieldId: number): string {
    return this.selectedSource?.fields.find(f => f.fieldId === fieldId)?.label ?? '';
  }

  isFieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  /**
   * טופס לא תקין → סימון כל השדות כנגועים (כדי שיודגשו) והודעת שגיאה כללית אחת.
   * אין פירוט איזה שדה חסר — ההודעה זהה בכל מקרה.
   */
  private reportIncompleteForm(): void {
    this.form.markAllAsTouched();
    this.messages.add({
      severity: 'error',
      summary: 'שגיאה',
      detail: INCOMPLETE_FORM_MESSAGE,
      life: 4000
    });
  }

  /**
   * תצוגה מקדימה — מחשבת על בסיס ההגדרות בלי לשמור דבר.
   * נדרשים רק השדות המזעריים (שם ומקור); שאר ההגדרות נשלחות רק אם מולאו,
   * כדי שלא לחסום תצוגה מקדימה בגלל שדה סיכום שלא נבחר במצב SUM.
   */
  preview(): void {
    const name = this.form.controls.name;
    const sourceId = this.form.controls.sourceId;

    if (name.invalid || sourceId.invalid) {
      name.markAsTouched();
      sourceId.markAsTouched();
      this.reportIncompleteForm();
      return;
    }

    this.previewing = true;
    this.subscriptions.add(
      this.service.preview(this.buildDraft()).subscribe({
        next: result => {
          this.previewing = false;
          this.previewResult = result;
          this.messages.add({
            severity: 'info',
            summary: 'תצוגה מקדימה',
            detail: `התקבלו ${result.rows.length} שורות · סה"כ ${result.total}`,
            life: 3000
          });
        },
        error: () => {
          this.previewing = false;
          this.messages.add({
            severity: 'error',
            summary: 'שגיאה',
            detail: 'לא ניתן היה להפיק תצוגה מקדימה',
            life: 4000
          });
        }
      })
    );
  }

  /** שמירה בקטלוג המרכזי */
  save(): void {
    if (!this.form.valid) {
      this.reportIncompleteForm();
      return;
    }

    this.saving = true;
    this.subscriptions.add(
      this.service.save(this.buildDraft()).subscribe({
        next: id => {
          this.saving = false;
          this.messages.add({
            severity: 'success',
            summary: 'נשמר',
            detail: 'הנתון נוסף לקטלוג',
            life: 3000
          });
          this.saved.emit(id);
          this.cancel();
        },
        error: () => {
          this.saving = false;
          this.messages.add({
            severity: 'error',
            summary: 'שגיאה',
            detail: 'שמירת הנתון נכשלה',
            life: 4000
          });
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
      sumFieldId: value.calculationType === 'SUM' ? value.sumFieldId : null,
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