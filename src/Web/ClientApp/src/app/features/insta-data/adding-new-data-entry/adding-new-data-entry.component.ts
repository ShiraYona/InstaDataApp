import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Subscription } from 'rxjs';

import {
  CALCULATION_TYPE_OPTIONS,
  CalculationType,
  DataDefinitionDraft,
  DataSource,
  LookupOption,
  PreviewResult
} from '../../../shared/models/data-definition.model';
import {
  CALCULATION_PERIOD_OPTIONS,
  CARD_ICON_OPTIONS,
  DataDefinitionService
} from '../../../shared/services/data-definition.service';
import { NotificationService } from '../../../shared/services/notification.service';

/** ערכי ברירת המחדל של טופס חדש — לפי האפיון: "ערכי ברירת מחדל" */
const DEFAULT_CALCULATION_TYPE: CalculationType = 'COUNT';

/** כמה שדות מסומנים כברירת מחדל ב"שדות להצגה בפירוט" — כמו בדמו */
const DEFAULT_DETAIL_FIELD_COUNT = 3;

/** ערך "קיבוץ לפי" שפירושו ללא קיבוץ — כמו בדמו */
const NO_GROUPING = 'none';

/**
 * טופס יצירת נתון חדש, המוצג כדיאלוג של PrimeNG.
 * כל הלוגיקה של האפיון יושבת כאן; הרכיב אינו שומר דבר בעצמו —
 * את השמירה מבצע השירות, והאב שולט בפתיחה/סגירה דרך [(visible)].
 */
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
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly subscriptions = new Subscription();

  /** האם הדיאלוג פתוח */
  @Input({ required: true }) visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  /** נפלט לאחר שמירה מוצלחת — האב מרענן את הרשימה */
  @Output() saved = new EventEmitter<number>();

  readonly iconOptions: LookupOption[] = CARD_ICON_OPTIONS;
  readonly calculationTypeOptions = CALCULATION_TYPE_OPTIONS;
  readonly rangeOptions: LookupOption[] = CALCULATION_PERIOD_OPTIONS;

  /** רשימת מקורות הנתונים — נטענת פעם אחת */
  sources: LookupOption[] = [];
  /** המקור שנבחר, כולל השדות שהוגדרו עבורו */
  selectedSource: DataSource | null = null;

  saving = false;
  previewing = false;
  /** תוצאת תצוגה מקדימה אחרונה — מוצגת בפאנל שמעל הכפתורים */
  previewResult: PreviewResult | null = null;

  /** נשמר כדי לזהות שינוי אמיתי במקור (מול טופס שנוקה) */
  private lastSourceId: number | null = null;

  readonly form = this.fb.group({
    name: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    sourceId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    iconId: this.fb.control<number>(CARD_ICON_OPTIONS[0].id, { nonNullable: true }),
    periodId: this.fb.control<number>(CALCULATION_PERIOD_OPTIONS[0].id, { nonNullable: true }),
    calculationType: this.fb.control<CalculationType>(DEFAULT_CALCULATION_TYPE, { nonNullable: true }),
    summaryFieldKey: this.fb.control<string | null>(null, { validators: [Validators.required] }),
    groupByFieldKey: this.fb.control<string | null>(NO_GROUPING),
    detailFields: this.fb.control<string[]>([], { nonNullable: true }),
    // ברירת המחדל: הנתון מוצג במערכת — לפי האפיון
    showInDashboard: this.fb.control<boolean>(true, { nonNullable: true })
  });

  // --- רשימות נגזרות ---

  get isSummaryVisible(): boolean {
    return this.form.controls.calculationType.value === 'SUM';
  }

  /** שדות הפירוט — כמו בדמו, מתוך השדות שהוגדרו במקור הנבחר */
  get detailFieldOptions(): Array<{ key: string; label: string }> {
    return this.selectedSource ? this.selectedSource.fields : [];
  }

  /**
   * "שדה תאריך" אינו שדה בחירה — הוא מוצג כשדה טקסט מושבת,
   * והערך שלו מגיע מקטלוג מקור הנתונים (dateMode.field), כמו בדמו.
   */
  get dateFieldLabel(): string {
    const key = this.selectedSource?.dateMode.field;
    return key ? this.fieldLabel(key) : '';
  }

  /** רק שדות מספריים יכולים לשמש לסיכום */
  get summaryFields() {
    return this.selectedSource ? this.selectedSource.fields.filter(f => f.kind === 'number') : [];
  }

  /** כמו בדמו: כל שדות המקור זמינים לקיבוץ (התאריך והמספרים כולל) */
  get groupByFields() {
    return this.selectedSource ? this.selectedSource.fields : [];
  }

  /** אפשרויות "קיבוץ לפי" — כוללות "ללא קיבוץ" בראש הרשימה */
  get groupByOptions(): Array<{ key: string; label: string }> {
    return [{ key: NO_GROUPING, label: 'ללא קיבוץ' }, ...this.groupByFields];
  }

  /** שם הנתון כפי שהוזן — לתצוגה המקדימה */
  get draftName(): string {
    return this.form.controls.name.value.trim();
  }

  constructor() {
    // כשהרכיב נטען כנתיב עצמאי — הדיאלוג נפתח מיד עם הכניסה למסך
    this.visible = true;
    this.loadSources();
    this.watchSourceChanges();
    this.watchCalculationTypeChanges();
    // שינוי בהגדרות מייתר תצוגה מקדימה קודמת
    this.subscriptions.add(this.form.valueChanges.subscribe(() => (this.previewResult = null)));
    this.selectDefaultSource();
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

  private loadSources(): void {
    this.subscriptions.add(
      this.service.getSources().subscribe({
        next: sources => {
          this.sources = sources;
          this.selectDefaultSource();
        },
        error: () => {
          this.notifications.error('לא ניתן היה לטעון את מקורות הנתונים');
        }
      })
    );
  }

  /**
   * כמו בדמו: הדיאלוג נפתח עם מקור הנתונים הראשון כבר בחור,
   * ולכן "שדה תאריך" ו"שדות להצגה בפירוט" אינם ריקים בפתיחה.
   * הרשימה נטענת אחרי שהדיאלוג כבר פתוח, ולכן משלימים רק כשיש רשימה
   * ועדיין לא נבחר מקור — כדי לא לדרוס בחירה של המשתמש.
   */
  private selectDefaultSource(): void {
    if (this.sources.length === 0 || this.form.controls.sourceId.value !== null) {
      return;
    }
    this.form.controls.sourceId.setValue(this.sources[0].id);
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

        this.subscriptions.add(
          this.service.getSourceFields(sourceId).subscribe({
            next: source => {
              this.selectedSource = source;
              this.applyDefaultsAfterSourceSelected(source);
            },
            error: () => {
              this.notifications.error('לא ניתן היה לטעון את שדות המקור');
            }
          })
        );
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
   * אחרי טעינת שדות — כמו editorFields(src, {}) בדמו:
   * כל השדות התלויים במקור חוזרים לברירת מחדל, והפירוט הוא שלושת השדות הראשונים.
   */
  private applyDefaultsAfterSourceSelected(source: DataSource): void {
    this.form.patchValue({
      calculationType: DEFAULT_CALCULATION_TYPE,
      periodId: CALCULATION_PERIOD_OPTIONS[0].id,
      groupByFieldKey: NO_GROUPING,
      summaryFieldKey: source.fields.find(f => f.kind === 'number')?.key ?? null,
      detailFields: source.fields.slice(0, DEFAULT_DETAIL_FIELD_COUNT).map(f => f.key)
    });

    this.applyCalculationType(this.form.controls.calculationType.value);
  }

  private applyCalculationType(type: CalculationType): void {
    const summaryControl = this.form.controls.summaryFieldKey;
    if (type === 'COUNT') {
      // הסתרת הסיכום — מנקים גם את הערך כדי שלא יישמר שדה מוסתר
      summaryControl.setValue(null);
      summaryControl.clearValidators();
    } else {
      summaryControl.setValidators([Validators.required]);
    }
    summaryControl.updateValueAndValidity();
  }

  /** איפוס שדות שתלויים במקור — אחרת נשארים ערכים של מקור אחר */
  private resetDependentFields(): void {
    this.form.patchValue(
      {
        summaryFieldKey: null,
        groupByFieldKey: NO_GROUPING,
        detailFields: []
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
      iconId: CARD_ICON_OPTIONS[0].id,
      periodId: CALCULATION_PERIOD_OPTIONS[0].id,
      calculationType: DEFAULT_CALCULATION_TYPE,
      summaryFieldKey: null,
      groupByFieldKey: NO_GROUPING,
      detailFields: [],
      showInDashboard: true
    });
    // reset מעדכן ערכים בלי emitEvent, לכן מסדירים את הוולידטורים ידנית
    this.applyCalculationType(DEFAULT_CALCULATION_TYPE);
  }

  // ---------------------------------------------------------------- פעולות

  /** תווית השדה של המקור — לתצוגת "שדה תאריך" (הערך עצמו אינו נבחר בטופס) */
  fieldLabel(key: string): string {
    return this.selectedSource?.fields.find(f => f.key === key)?.label ?? '';
  }

  isFieldInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  /** תצוגה מקדימה — מחשבת על בסיס ההגדרות בלי לשמור דבר */
  preview(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.notifications.error('יש למלא את כל שדות החובה');
      return;
    }

    this.previewing = true;
    this.subscriptions.add(
      this.service.preview(this.buildDraft()).subscribe({
        next: result => {
          this.previewing = false;
          this.previewResult = result;
        },
        error: () => {
          this.previewing = false;
          this.notifications.error('לא ניתן היה להפיק תצוגה מקדימה');
        }
      })
    );
  }

  /** שמירה בקטלוג המרכזי */
  save(): void {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      this.notifications.error('יש למלא את כל שדות החובה');
      return;
    }

    this.saving = true;
    this.subscriptions.add(
      this.service.save(this.buildDraft()).subscribe({
        next: id => {
          this.saving = false;
          this.notifications.success('הנתון נשמר והוא זמין כעת');
          this.saved.emit(id);
          this.cancel();
        },
        error: () => {
          this.saving = false;
          this.notifications.error('לא ניתן היה לשמור את הנתון');
        }
      })
    );
  }

  /** ביטול: סוגר את הדיאלוג בלי לשמור דבר */
  cancel(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    // כשהדיאלוג פתוח ישירות מנתיב — אין לאן לסגור, לכן יוצאים מהמסך
    this.leaveIfRouted();
  }

  /**
   * הרכיב משמש בשני אופנים: כדיאלוג שנפתח על ידי האב (דרך @Input visible),
   * או כמסך שנטען ישירות מנתיב. בנתיב אין מי שיסגור את הדיאלוג,
   * ולכן יוצאים חזרה למסך הבית.
   */
  private leaveIfRouted(): void {
    const onDedicatedRoute = !!this.route.snapshot.routeConfig?.path;
    if (onDedicatedRoute) {
      void this.router.navigate(['/']);
    }
  }

  private buildDraft(): DataDefinitionDraft {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      sourceId: value.sourceId,
      // שדה התאריך נקבע בקטלוג המקור, לא בטופס
      dateFieldKey: this.selectedSource?.dateMode.field ?? null,
      calculationType: value.calculationType,
      summaryFieldKey: value.calculationType === 'SUM' ? value.summaryFieldKey : null,
      // "ללא קיבוץ" הוא ערך תצוגה בלבד — נשמר כ-null
      groupByFieldKey: value.groupByFieldKey === NO_GROUPING ? null : value.groupByFieldKey,
      detailFields: [...value.detailFields],
      iconId: value.iconId,
      periodId: value.periodId,
      showInDashboard: value.showInDashboard
    };
  }
}
