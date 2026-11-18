namespace InstaDataApp.Domain.Entities;

/// <summary>
/// מיפוי לטבלת CTRL_TaskHistory — יומן שינויים על משימה.
/// </summary>
public class CtrlTaskHistory
{
    public long HistoryID { get; set; }
    public long TaskID { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string? FieldName { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string ChangedBy { get; set; } = string.Empty;
    public DateTime ChangedDate { get; set; }
}
