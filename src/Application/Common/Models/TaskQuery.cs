namespace InstaDataApp.Application.Common.Models;

/// <summary>
/// שאילתת רשימת המשימות — סינון, מיון ודפדוף בצד השרת.
/// כל השדות אופציונליים; ריק = ללא הגבלה.
/// </summary>
public class TaskQuery
{
    /// <summary>חיפוש חופשי — מזהה, נושא, תיאור או מזהה ישות המקור.</summary>
    public string? Search { get; set; }

    /// <summary>סטטוסים מבוקשים (OR ביניהם).</summary>
    public string[]? Status { get; set; }

    /// <summary>עדיפויות מבוקשות (OR ביניהן).</summary>
    public string[]? Priority { get; set; }

    /// <summary>סוגי מקור מבוקשים (OR ביניהם).</summary>
    public string[]? SourceType { get; set; }

    /// <summary>מצב טיפול מבוקש: LATE / TODAY / SOON.</summary>
    public string[]? State { get; set; }

    public int? TeamID { get; set; }
    public string? AssignedUserID { get; set; }

    /// <summary>תאריך יעד — גבול תחתון (yyyy-MM-dd, כולל).</summary>
    public string? DueFrom { get; set; }

    /// <summary>תאריך יעד — גבול עליון (yyyy-MM-dd, כולל).</summary>
    public string? DueTo { get; set; }

    /// <summary>הצג רק משימות של המשתמש הנוכחי (תצוגת "המשימות שלי").</summary>
    public bool MineOnly { get; set; }

    /// <summary>הצג רק משימות שעבר תאריך היעד שלהן.</summary>
    public bool OverdueOnly { get; set; }

    /// <summary>תחילת חלון החישוב (ימים אחורה) — כברירת מחדל 30.</summary>
    public int? Period { get; set; }

    /// <summary>
    /// לחיצה על מדד סיכום (7.3.3.5). שכבה נוספת מעל הסינון הרגיל — לא דורסת
    /// את בחירת המשתמש: OPEN / PROGRESS / LATE / HIGH.
    /// </summary>
    public string? MetricFocus { get; set; }

    /// <summary>
    /// שדה המיון: TaskID / TaskTitle / SourceType / TeamID / AssignedUserID /
    /// Priority / Status / CreatedDate / DueDate.
    /// </summary>
    public string? SortKey { get; set; }

    /// <summary>asc / desc.</summary>
    public string? SortDirection { get; set; }

    /// <summary>כמה רשומות לדלג (עמוד × גודל).</summary>
    public int? Skip { get; set; }

    /// <summary>כמה רשומות להחזיר — ברירת מחדל 20, מקסימום 200.</summary>
    public int? Take { get; set; }
}
