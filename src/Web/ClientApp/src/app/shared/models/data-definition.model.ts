/**
 * מודלים של אפיון "יצירת נתון חדש".
 * החתימות מיועדות להישאר זהות כשהנתונים יגיעו מהשרת — רק מקור הנתונים יחליף.
 */

/** סוג החישוב שנעשה על שדות הנתון */
export type CalculationType = 'COUNT' | 'SUM';

/** ערך מתוך רשימה נפתחת (מקור, סמל כרטיס, תקופה וכו') */
export interface LookupOption {
  id: number;
  label: string;
}

/** סוגי השדות שהמקור חושף. קובע לאן כל שדה יכול לשמש בטופס. */
export type SourceFieldKind = 'date' | 'number' | 'text';

/**
 * שדה שהוגדר עבור מקור נתונים.
 * same idea כמו DataSourceField בצד השרת.
 */
export interface DataSourceField {
  key: string;
  label: string;
  kind: SourceFieldKind;
}

/** מקור נתונים יחד עם השדות שהוגדרו עבורו */
export interface DataSource {
  id: number;
  label: string;
  fields: DataSourceField[];
  /**
   * אופן קביעת שדה התאריך של הנתון.
   * הצגה בלבד — הערך נקבע בקטלוג מקור הנתונים ואינו ניתן לעריכה בטופס.
   */
  dateMode: { field: string | null; label: string; note: string };
}

/** הגדרות הנתון שנשמרות */
export interface DataDefinitionDraft {
  name: string;
  sourceId: number | null;
  iconId: number | null;
  periodId: number | null;
  calculationType: CalculationType;
  /** רלוונטי רק ל-SUM */
  summaryFieldKey: string | null;
  groupByFieldKey: string | null;
  dateFieldKey: string | null;
  /** מפתחות שדות מתוך השדות שהוגדרו במקור (DataSourceField.key) */
  detailFields: string[];
  /** האם הנתון מוצג במערכת הניהול והבקרה */
  showInDashboard: boolean;
}

/** תוצאת תצוגה מקדימה — ללא שמירה */
export interface PreviewResult {
  rows: Array<{ key: string; label: string; value: number }>;
  total: number;
}

/** ערכי בחירה קבועים (בשרת יגיעו כטבלאות עזר) */
export const CALCULATION_TYPE_OPTIONS: Array<{ value: CalculationType; label: string }> = [
  { value: 'COUNT', label: 'כמות רשומות (COUNT)' },
  { value: 'SUM', label: 'סכום ערכי שדה (SUM)' }
];
