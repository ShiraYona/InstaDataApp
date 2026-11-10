/**
 * מודלים של אפיון "יצירת נתון חדש".
 * תואמים ל-DTOs שבשרת (Application/Modules/DataDefinitions/DataDefinitionContracts.cs).
 */

/**
 * מזהה סוג החישוב — ה-ID מ-CTRL_CalculationTypes,
 * ונשמר בעמודת CTRL_Metrics.CalculationTypeID. מגיע כ-Value ברשימה הנפתחת.
 */
export type CalculationTypeId = number;

/** ערך מתוך רשימה נפתחת (מקור נתונים, סמל כרטיס, תקופה וכו') */

export type CalculationType = 'COUNT' | 'SUM';

export interface LookupOption {
  value: string;
  label: string;
  /**
   * קוד ה-PrimeIcons שמוצג ליד התווית (כמו "pi pi-chart-line").
   * אופציונלי: מגיע עבור סמלי הכרטיס בלבד.
   */
  icon?: string;
}
export interface CardIconOption {
  id: number;
  label: string;
}

export type SourceFieldKind = 'date' | 'number' | 'text';

export interface DataSourceField {
  fieldId: number;
  label: string;
  /** סוג הנתון במסד (int, decimal, datetime...) */
  dataType: string;
  isSummable: boolean;
  isGroupable: boolean;
}

export interface DataSource {
  sourceId: number;
  label: string;
  /** השדה שנקבע כשField תאריך בקטלוג המקור — לתצוגה בלבד */
  dateFieldId: number | null;
  fields: DataSourceField[];
}

/** הגדרות הנתון שנשלחות לשרת */
export interface MetricDraft {
  name: string;
  sourceId: number | null;
  /** מזהה סוג החישוב מ-CTRL_CalculationTypes */
  calculationTypeId: CalculationTypeId | null;
  /** רלוונטי רק ל-SUM */
  sumFieldId: number | null;
  groupFieldId: number | null;
  /** MONTH / QUARTER / YEAR */
  dateRangeType: string;
  /** IconCode מתוך סמלי הכרטיס */
  iconCode: string | null;
  /** שדות הפירוט לפי FieldID, בסדר התצוגה */
  detailFieldIds: number[];
  /** האם להציג את הנתון במערכת הניהול והבקרה (נשמר ב-IsActive) */
  displayInDashboard: boolean;
}

export interface DataDefinitionDraft {
  name: string;
  sourceId: number | null;
  iconId: number | null;
  periodId: number | null;
  calculationType: CalculationType;
  summaryFieldKey: string | null;
  groupByFieldKey: string | null;
  dateFieldKey: string | null;
  detailFields: string[];
  showInDashboard: boolean;
}

export interface PreviewResult {
  rows: Array<{ key: string; label: string; value: number }>;
  total: number;
}

export const CALCULATION_TYPE_OPTIONS: Array<{ value: CalculationType; label: string }> = [
  { value: 'COUNT', label: 'כמות רשומות (COUNT)' },
  { value: 'SUM', label: 'סכום ערכי שדה (SUM)' }
];
