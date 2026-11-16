export interface MetricDefinition {
  id: string;
  name: string;
  source: string;
  group: string;
  detailFields: string[];
  valueField?: string;
}