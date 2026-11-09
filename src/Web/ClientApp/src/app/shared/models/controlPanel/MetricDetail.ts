export interface SystemGroup {
  sourceId: number;
  sourceName: string;
  groupValue?: string;
  records: number;
  totalValue?: number | null;
  isError?: boolean;
}

export interface DetailColumn {
  fieldName: string;
  label: string;
  dataType: string;
}

export interface MetricDetail {
  key: string;
  title: string;
  dataValue: string;
  recordsInSample: number;
  sourceName: string;
  createdDate: string;
  valueFieldName?: string | null;
  groupFieldName?: string | null;
  groupFieldLabel: string;
  totalRecords: number;
  totalValue?: number | null;
  systems: SystemGroup[];
  columns: DetailColumn[];
  records: Record<string, unknown>[];
  isStale: boolean;
  signType?: string | null;
}
