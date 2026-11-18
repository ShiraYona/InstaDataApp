namespace InstaDataApp.Application.Common.Models;

/// <summary>
/// מדדי "משימות ובקרה" (7.3.1) — מחושבים בשרת מתוך אותה קבוצת נתונים
/// שהמשתמש רשאי לראות, ללא תלות בסינון ובמיון של הטבלה.
/// </summary>
public class TaskMetricsDto
{
    /// <summary>משימות פתוחות או בטיפול.</summary>
    public int Open { get; set; }

    public int InProgress { get; set; }

    /// <summary>פעילות שתאריך היעד שלהן עבר.</summary>
    public int Late { get; set; }

    /// <summary>פעילות בעדיפות גבוהה או דחופה.</summary>
    public int HighPriority { get; set; }

    /// <summary>הושלמו בתוך חלון החישוב.</summary>
    public int Completed { get; set; }

    /// <summary>מתוך אלה שהושלמו — הושלמו עד תאריך היעד (כולל).</summary>
    public int CompletedOnTime { get; set; }

    /// <summary>אחוז השלמה במועד, מעוגל לשלם; null כשאין נתונים.</summary>
    public int? OnTimeRatePercent =>
        Completed == 0 ? null : (int)Math.Round(CompletedOnTime * 100d / Completed);

    /// <summary>סך הרשומות בקבוצת הנתונים (לפני דפדוף) — לצורך "טען עוד".</summary>
    public int Total { get; set; }
}
