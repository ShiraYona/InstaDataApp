namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>טווח התאריכים שמועבר למקור הנתונים בזמן החישוב</summary>
public readonly record struct DateRange(DateTime From, DateTime To);

/// <summary>
/// תרגום תקופת החישוב השמורה במדד לטווח תאריכים מפורש.
/// <para>
/// כל תקופה מתורגמת ל-<c>From</c> ו-<c>To</c> <b>לפני</b> שהמקור מופעל, כדי שכל
/// שכבת חישוב תקבל תמיד טווח תאריכים ולא תיאור טקסטואלי של תקופה.
/// </para>
/// <para>
/// "לפי מסנן הלוח" (<c>DASHBOARD</c>) אינו מתורגם כאן: הטווח שלו הוא הטווח שהמשתמש
/// בחר בלוח, והוא מועבר כפרמטר — ראו <see cref="Resolve(string?, DateRange, DateTime)"/>.
/// </para>
/// </summary>
public static class DateRangeResolver
{
    /// <summary>
    /// מתרגם את הערך השמור ב-<c>CTRL_Metrics.DateRangeType</c> לטווח.
    /// </summary>
    /// <param name="storedDateRange">
    /// <c>DASHBOARD</c> / <c>BOARD_FILTER</c>, מספר ימים ("30") או ערך ישן
    /// (<c>LAST_30_DAYS</c>); <c>null</c> כשלמדד הוגדר טווח תאריכים מפורש.
    /// </param>
    /// <param name="dashboardRange">הטווח שנבחר במסנן הלוח — משמש ל-DASHBOARD ולערך ריק.</param>
    /// <param name="today">היום הנוכחי — מוזרק כדי לאפשר בדיקה דטרמיניסטית.</param>
    public static DateRange Resolve(string? storedDateRange, DateRange dashboardRange, DateTime today)
    {
        if (string.IsNullOrWhiteSpace(storedDateRange) || MetricConstants.IsDashboard(storedDateRange))
        {
            return dashboardRange;
        }

        if (MetricConstants.TryGetPeriodDays(storedDateRange, out var days))
        {
            // "30 ימים" = היום ושלושים הימים שקדמו לו (כולל היום)
            var from = today.Date.AddDays(-(days - 1));
            return new DateRange(from, today.Date);
        }
        return dashboardRange;
    }

    /// <summary>
    /// האם למדד הוגדר טווח תאריכים מפורש (שני שדות תאריך במקום תקופה).
    /// במקרה כזה <c>DateRangeType</c> ריק, והטווח הוא שני השדות שנבחרו.
    /// </summary>
    public static bool IsExplicitRange(string? storedDateRange) =>
        string.IsNullOrWhiteSpace(storedDateRange);
}
