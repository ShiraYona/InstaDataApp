export interface DataSource {
  name: string;
  dateField: string;
  fields: Record<string, string>;
}