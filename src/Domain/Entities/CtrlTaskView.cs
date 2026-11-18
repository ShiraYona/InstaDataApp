namespace InstaDataApp.Domain.Entities;

/// <summary>
/// מיפוי לטבלת CTRL_TaskViews — מתי כל משתמש צפה לאחרונה בכל משימה.
/// הבסיס ל-KPI "משימות חדשות מאז הצפייה האחרונה" (7.3.1).
/// </summary>
public class CtrlTaskView
{
    public long TaskID { get; set; }
    public string UserID { get; set; } = string.Empty;
    public DateTime LastViewedDate { get; set; }
}
