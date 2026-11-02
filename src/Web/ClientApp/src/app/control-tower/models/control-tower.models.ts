/** מזהה מסך (route) של מערכת הניהול והבקרה. */
export type PageKey = 'dash' | 'metrics' | 'layout' | 'tasks' | 'alerts' | 'reports';

/** מקור נתונים בקטלוג – שמות השדות מוצגים למשתמש. */
export interface DataSourceDef {
  name: string;
  dateField: string;
  fields: Record<string, string>;
}

/** רשומת נתונים מתוך מקור (נתוני דמו). */
export interface DataRecord {
  id: string;
  date: string;
  amount: number;
  account: string;
  status: string;
  [key: string]: string | number;
}

/** סוג חישוב של כרטיס נתון. */
export type MetricCalc = 'count' | 'sum';

/** כרטיס נתון בלוח הבקרה / בקטלוג. */
export interface Metric {
  id: string;
  name: string;
  source: string;
  calc: MetricCalc;
  sumField: string;
  group: string;
  detailFields: string[];
  icon: string;
  active: boolean;
  range: PeriodKey | 'all';
}

export type PeriodKey = 'all' | 'week' | 'month' | 'quarter';

export interface TaskItem {
  id: number;
  title: string;
  owner: string;
  status: string;
  priority: string;
}

export type AlertOperator = 'gt' | 'lt' | 'eq';

export interface AlertRule {
  id: string;
  metric: string;
  operator: AlertOperator;
  threshold: number;
  enabled: boolean;
  name?: string;
}

export interface Report {
  id: string;
  name: string;
  frequency: string;
  metrics: string[];
  active: boolean;
}

export interface SourceHealth {
  last: string;
  status: 'ok' | 'stale';
}

/** מצב האפליקציה שנשמר ב־localStorage (שינוי מהדמו נשמר בין רענונים). */
export interface ControlTowerState {
  metrics: Metric[];
  cols: number;
  period: PeriodKey;
  tasks: TaskItem[];
  alertRules: AlertRule[];
  targets: Record<string, number>;
  reports: Report[];
  dataHealth: Record<string, SourceHealth>;
}

/** מצב השוואת תקופות של כרטיס. */
export interface CardComparison {
  current: number;
  prior: number;
  pct: number | null;
}

/** שורה בטבלת ניתוח עומק / קיבוץ. */
export interface GroupRow {
  key: string;
  count: number;
  sum: number;
}

/** פילטר פעיל בניתוח העומק. */
export interface DrillFilter {
  field: string;
  value: string;
}
