export interface SourceBreakdown {
  sourceId?: number;
  sourceName?: string;
  objectName?: string;
  records?: number;
  totalValue?: number;
  valueField?: string;
  isError?: boolean;
  isCurrent?: boolean;
  isGrouped?: boolean;
  groupColumnMissing?: boolean;
}