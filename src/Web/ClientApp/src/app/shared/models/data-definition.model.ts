

export type CalculationTypeId = number;

/** ערך מתוך רשימה נפתחת (מקור נתונים, סמל כרטיס, תקופה וכו') */
export interface LookupOption {
  value: string;
  label: string;
  icon?: string;
  /** סימון מפורש מהשרת: האם סוג החישוב הזה הוא "סכימה" */
  isSum?: boolean;
}

export interface CardIconOption {
  id: number;
  label: string;
}

export interface DataSourceField {
  fieldId: number;
  label: string;
  /** שם השדה הטכני במסד */
  fieldName: string;
  /** סוג הנתון במסד (int, decimal, datetime...) */
  dataType: string;
  isSummable: boolean;
  isGroupable: boolean;
  /** האם השדה זמין לסינון — נקבע בקטלוג */
  isFilterable: boolean;
  /** TEXT / NUMBER / DATE / LIST — קובע את רכיב הקלט של המסנן */
  filterInputType?: string | null;
  /** CATALOG / FIXED — מהיכן מגיעים ערכי המסנן */
  valueSource?: string | null;
  /** האם השדה יכול להיות ריק — IS_NULL / IS_NOT_NULL מוצעים רק לו */
  isNullable?: boolean | null;
}

/** אופרטור לתנאי סינון — מ-CTRL_FilterOperators */
export interface FilterOperator {
  /** הקוד הקנוני (EQ / NE / GT / IN / IS_NULL …) — נשמר בעץ הסינון */
  code: string;
  label: string;
  /** false = אין רכיב ערך לתנאי עם האופרטור הזה */
  needsValue: boolean;
  /** true = בורר ערכים מרובה (IN / NOT_IN) */
  isMultiValue: boolean;
}

export interface DataSource {
  sourceId: number;
  label: string;
  /** TABLE / PROCEDURE */
  sourceType: string;
  /** ROWS / SCALAR */
  outputType: string;
  /** השדה שנקבע כשדה תאריך בקטלוג המקור — לתצוגה בלבד */
  dateFieldId: number | null;
  /**
   * לפרוצדורה בלבד — האם הוגדרו בקטלוג פרמטרי תאריך התחלה וסיום.
   * הערכים אינם נדרשים מהמשתמש: הטווח נגזר מתקופת החישוב.
   */
  hasDateParameters?: boolean;
  fields: DataSourceField[];
}

/* ------------------------------------------------------------------ סינון */

export type FilterLogic = 'AND' | 'OR';

/** תנאי סינון אחד — fieldId מתוך שדות המקור שנבחר */
export interface FilterCondition {
  kind: 'condition';
  id: number;
  fieldId: number | null;
  operator: string;
  /** ערך יחיד (טקסט / מספר / תאריך) */
  value: string | null;
  /** ערכים מרובים (כשהקלט הוא רשימה) */
  values: string[];
}

/** קבוצת תנאים — AND / OR בין הילדים, עד maxFilterDepth רמות */
export interface FilterGroup {
  kind: 'group';
  id: number;
  logic: FilterLogic;
  children: FilterNode[];
}

export type FilterNode = FilterGroup | FilterCondition;

/** הגדרות הנתון שנשלחות לשרת */
export interface MetricDraft {
  name: string;
  sourceId: number | null;
  /** מזהה סוג החישוב מ-CTRL_CalculationTypes */
  calculationTypeId: CalculationTypeId | null;
  /** רלוונטי רק ל-SUM */
  sumFieldId: number | null;
  groupFieldId: number | null;
  /**
   * תקופת החישוב: `DASHBOARD` (לפי מסנן הלוח) או מספר הימים ("30").
   * `null` = נבחר טווח תאריכים מפורש בשני השדות שלמטה.
   */
  dateRangeType: string | null;
  /** שדה התאריך שממנו מתחיל הטווח — רלוונטי רק כשקיים טווח מפורש */
  dateFromFieldId: number | null;
  /** שדה התאריך שבו נגמר הטווח — יחד עם dateFromFieldId */
  dateToFieldId: number | null;
  /** IconCode מתוך סמלי הכרטיס */
  iconCode: string | null;
  /** שדות הפירוט לפי FieldID, בסדר התצוגה */
  detailFieldIds: number[];
  /** האם להציג את הנתון במערכת הניהול והבקרה (נשמר ב-IsActive) */
  displayInDashboard: boolean;
  /**
   * עץ תנאי הסינון (JSON). `undefined` = לא נשלח בעריכה, והשרת משאיר את הערך השמור;
   * `null` = מפורש "אין תנאים" ומנקה את הישן.
   */
  filtersJson?: string | null;
}

export interface PreviewResult {
  rows: Array<{ key: string; label: string; value: number | null }>;
  total: number;
}
