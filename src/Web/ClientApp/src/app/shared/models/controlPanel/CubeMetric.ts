export type CubeStatus = 'ok' | 'warn' | 'danger';
export interface CubeMetric {
  key: string;
  title: string;
  icon: string;
  value: string;
  unit?: string;
  source: string;
  trend: number;
  hasComparison?: boolean;
  trendPositive: boolean;
  status: CubeStatus;
  updated: boolean;
  /** כיתוב עמודת הקיבוץ (מוצג בכותרת הכרטיס) */
  groupFieldLabel?: string;
  /** ערך הקבוצה שהכרטיס מייצג */
    groupValue?: string;
  /** ערכי הקבוצה — לחלון הפירוט */
  groups?: ControlPanelCubeGroup[];
  targetText?: string;
  signType?: string;
}
export interface ControlPanelCubeGroup {
  value: string;
  records: number;
  totalValue?: number;
}
