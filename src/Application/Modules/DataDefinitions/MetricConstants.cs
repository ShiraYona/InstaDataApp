namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>
/// הערכים החוקיים שנשמרים בעמודות המחרוזת של CTRL_Metrics.
/// </summary>
public static class MetricConstants
{
    // ------------------------------------------------------------ סוגי חישוב

    public const string CalculationCount = "COUNT";
    public const string CalculationSum = "SUM";
    public const string CalculationDirect = "DIRECT";

    public static readonly string[] CalculationTypes = [CalculationCount, CalculationSum, CalculationDirect];

    /// <summary>ערך הייצוג ל"ללא קיבוץ" — נשמר כ-NULL בעמודה</summary>
    public const string NoGrouping = "none";

    // -------------------------------------------------------- סוגי מקור נתונים

    /// <summary>CTRL_DataSources.SourceType — טבלה</summary>
    public const string SourceTypeTable = "TABLE";

    /// <summary>CTRL_DataSources.SourceType — פרוצדורה</summary>
    public const string SourceTypeProcedure = "PROCEDURE";

    /// <summary>CTRL_DataSources.OutputType — מחזיר שורות (ספירה / סכימה / פירוט)</summary>
    public const string OutputTypeRows = "ROWS";

    /// <summary>CTRL_DataSources.OutputType — מחזיר ערך סופי יחיד (חישוב ישיר)</summary>
    public const string OutputTypeScalar = "SCALAR";

    // ---------------------------------------------------- תקופת / טווח החישוב

    /// <summary>"לפי מסנן הלוח" — התקופה מגיעה מהמסנן הפעיל במערכת הניהול</summary>
    public const string DateRangeDashboard = "DASHBOARD";

    public const string DateRangeDashboardLabel = "לפי מסנן הלוח";

    /// <summary>הערך ההיסטורי של "לפי מסנן הלוח" — נתונים קיימים עדיין משתמשים בו</summary>
    public const string DateRangeLegacyBoardFilter = "BOARD_FILTER";

    public const string DateRangeLast7Days = "LAST_7_DAYS";

    public const string DateRangeLast30Days = "LAST_30_DAYS";

    public const string DateRangeLast90Days = "LAST_90_DAYS";

    // הערכים הישנים נשמרים לתאימות לאחור — נתונים קיימים בטבלה עדיין משתמשים בהם
    public const string DateRangeCurrentMonth = "MONTH";
    public const string DateRangeQuarter = "QUARTER";
    public const string DateRangeYear = "YEAR";


    public static readonly string[] DateRanges =
        [DateRangeDashboard, DateRangeLast7Days, DateRangeLast30Days, DateRangeLast90Days];

    /// <summary>
    /// כל הערכים החוקיים בעמודה — כולל הישנים, כדי שנתונים קיימים יישארו תקינים.
    /// האימות משתמש בזה; הטופס מציג רק את <see cref="DateRanges"/>.
    /// הטופס שולח את ה-<c>Value</c> של התקופה מ-CTRL_CalculationDays (למשל "30"),
    /// ו-<see cref="ResolveDateRangeAsync"/> מאשר אותו מול הקטלוג — לכן כל ערך שהוא
    /// מספר ימים חיובי חוקי כאן, ולא רק 7 / 30 / 90.
    /// </summary>
    public static readonly string[] AllowedDateRanges =
    [
        .. DateRanges,
        DateRangeLegacyBoardFilter,
        DateRangeCurrentMonth,
        DateRangeQuarter,
        DateRangeYear,
        "7",
        "30",
        "90"
    ];

    /// <summary>
    /// האם הערך הוא תקופה שה-Value שלה מספר ימים (כפי שנשלח מהטופס).
    /// ההכרעה הסופית על קיומה נעשית מול CTRL_CalculationDays.
    /// </summary>
    public static bool IsPeriodDaysValue(string? value) =>
        int.TryParse((value ?? string.Empty).Trim(), out var days) && days > 0;

    public const int DateRangeNameMaxLength = 20;

    /// <summary>האם הערך הוא "לפי מסנן הלוח" — הערך החדש או ההיסטורי</summary>
    public static bool IsDashboard(string? value) =>
        string.Equals(value, DateRangeDashboard, StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, DateRangeLegacyBoardFilter, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// האם הערך הוא מספר ימים של תקופה — הערך עצמו (7 / 30 / 90)
    /// או אחד הקבועים ההיסטוריים (LAST_30_DAYS).
    /// </summary>
    public static bool TryGetPeriodDays(string? value, out int days)
    {
        days = 0;
        var trimmed = (value ?? string.Empty).Trim();
        if (trimmed.Length == 0)
        {
            return false;
        }

        if (int.TryParse(trimmed, out var parsed) && parsed > 0)
        {
            days = parsed;
            return true;
        }

        days = trimmed.ToUpperInvariant() switch
        {
            DateRangeLast7Days => 7,
            DateRangeLast30Days => 30,
            DateRangeLast90Days => 90,
            _ => 0
        };

        return days > 0;
    }

    // ------------------------------------------------------------------ כללי

    /// <summary>
    /// הערך שנכתב ב-CTRL_Metrics.CreatedBy כל עוד לא הוגדר מנגנון התחברות.
    /// עם בניית ניהול המשתמשים — מחליפים במקום אחד (ראו CreateMetricCommandHandler).
    /// </summary>
    public const string FallbackUserName = "USER";

    public const int MetricNameMaxLength = 80;

    public const int IconCodeMaxLength = 50;
}
