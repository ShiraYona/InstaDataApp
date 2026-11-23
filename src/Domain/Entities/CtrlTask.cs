namespace InstaDataApp.Domain.Entities;

/// <summary>
/// מיפוי לטבלת CTRL_Tasks — משימות ובקרה תפעולית.
/// </summary>
public class CtrlTask
{
    public long TaskID { get; set; }
    public string TaskTitle { get; set; } = string.Empty;
    public string? TaskDescription { get; set; }
    public int TeamID { get; set; }
    public string? AssignedUserID { get; set; }
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateOnly DueDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public DateTime? CancelledDate { get; set; }
    public string SourceType { get; set; } = string.Empty;
    public string? SourceSystemCode { get; set; }
    public string? SourceEntityType { get; set; }
    public string? SourceEntityID { get; set; }
    public string? SourceURL { get; set; }
    public int? MetricID { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public byte[] RowVersion { get; set; } = Array.Empty<byte>();
}
