namespace InstaDataApp.Domain.Entities;

/// <summary>
/// מיפוי לטבלת CTRL_TaskComments — הערות טיפול על משימה.
/// </summary>
public class CtrlTaskComment
{
    public long CommentID { get; set; }
    public long TaskID { get; set; }
    public string CommentText { get; set; } = string.Empty;
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedDate { get; set; }
}
