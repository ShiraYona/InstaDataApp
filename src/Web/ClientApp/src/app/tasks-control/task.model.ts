/** מודל התצוגה של מסך המשימות — תואם ל-TaskDto מהשרת. */
export interface Task {
  TaskID: number;
  TaskTitle: string;
  TaskDescription: string;
  TeamID: number;
  AssignedUserID: string | null;
  Priority: Priority;
  Status: Status;
  DueDate: string;
  CompletedDate: string | null;
  CancelledDate: string | null;
  SourceType: Source;
  SourceSystemCode: string | null;
  SourceEntityType: string | null;
  SourceEntityID: string | null;
  SourceURL: string | null;
  MetricID: number | null;
  CreatedBy: string;
  CreatedDate: string;
  UpdatedBy: string | null;
  UpdatedDate: string | null;
  /** בפועל מגיע כ-base64; לא מספר. */
  RowVersion: string;
  /** נוצרה או עודכנה אחרי הצפייה האחרונה של המשתמש — מחושב בשרת. */
  IsNewForMe: boolean;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type Status = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
/** תואם ל-SourceType ב-CTRL_Tasks (7.2.3). */
export type Source = 'MANUAL' | 'DASHBOARD' | 'EXTERNAL';

export interface Comment {
  CommentID: number;
  TaskID: number;
  CommentText: string;
  CreatedBy: string;
  CreatedDate: string;
}

export interface HistoryRow {
  HistoryID: number;
  TaskID: number;
  ActionType: string;
  FieldName: string | null;
  OldValue: string | null;
  NewValue: string | null;
  ChangedBy: string;
  ChangedDate: string;
}
