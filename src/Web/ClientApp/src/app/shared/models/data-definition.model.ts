
export type CalculationType = 'COUNT' | 'SUM';

export interface LookupOption {
  id: number;
  label: string;
}
export interface CardIconOption {
  id: number;
  label: string;
}

export type SourceFieldKind = 'date' | 'number' | 'text';

export interface DataSourceField {
  key: string;
  label: string;
  kind: SourceFieldKind;
}

export interface DataSource {
  id: number;
  label: string;
  fields: DataSourceField[];
  dateMode: { field: string | null; label: string; note: string };
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
