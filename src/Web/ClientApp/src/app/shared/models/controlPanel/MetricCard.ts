export interface MetricCard {
  key?: string;
  title?: string;
  icon?: string;
  value?: string;
  unit?: string;
  source?: string;
  sourceObject?: string;
  valueField?: string;
  groupField?: string;
  groupFieldLabel?: string;
  /** ערך הקבוצה שהכרטיס מייצג — כל החישובים של הכרטיס עבורו */
  groupValue?: string;
  /** ערכי הקבוצה — לחלון הפירוט */
  groups?: { value: string; records: number; totalValue?: number }[];
  dateField?: string;
  isStale?: boolean;
  trend?: number;
  hasComparison?: boolean;
  trendPositive?: boolean;
  status?: string;
  updated?: boolean;
  targetText?: string;
  signType?: string;
}