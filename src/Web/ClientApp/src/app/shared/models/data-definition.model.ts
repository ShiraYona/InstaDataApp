/**
 * מודלים של אפיון "יצירת נתון חדש".
 * תואמים ל-DTOs שבשרת (Application/Modules/DataDefinitions/DataDefinitionContracts.cs).
 */

/** סוג החישוב — נשמר כמחרוזת בעמודת CTRL_Metrics.CalculationType */
export type CalculationType = 'COUNT' | 'SUM' | 'DIRECT';

/** ערך מתוך רשימה נפתחת (מקור נתונים, סמל כרטיס, תקופה וכו') */
export interface LookupOption {
  value: string;
  label: string;
  /**
   * קוד ה-PrimeIcons שמוצג ליד התווית (כמו "pi pi-chart-line").
   * אופציונלי: מגיע עבור סמלי הכרטיס בלבד.
   */
  icon?: string;
}

/** שדה של מקור נתונים — הקוד (FieldID) מזהה אותו בשמירה */
export interface DataSourceField {
  fieldId: number;
  label: string;
  /** סוג הנתון במסד (int, decimal, datetime...) */
  dataType: string;
  isSummable: boolean;
  isGroupable: boolean;
}

/** מקור נתונים יחד עם השדות שהוגדרו עבורו */
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
  calculationType: CalculationType;
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

/** תוצאת תצוגה מקדימה — ללא שמירה */
export interface PreviewResult {
  rows: Array<{ key: string; label: string; value: number }>;
  total: number;
}
