namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>
/// הערכים החוקיים שנשמרים בעמודות המחרוזת של CTRL_Metrics.
/// </summary>
public static class MetricConstants
{
    public const string CalculationCount = "COUNT";
    public const string CalculationSum = "SUM";
    public const string CalculationDirect = "DIRECT";

    public static readonly string[] CalculationTypes = [CalculationCount, CalculationSum, CalculationDirect];

    /// <summary>ערך הייצוג ל"ללא קיבוץ" — נשמר כ-NULL בעמודה</summary>
    public const string NoGrouping = "none";

    /// <summary>"לפי מסנן הלוח" — התקופה מגיעה מהמסנן הפעיל במערכת הניהול</summary>
    public const string DateRangeBoardFilter = "BOARD_FILTER";

    public const string DateRangeBoardFilterLabel = "לפי מסנן הלוח";

    public const string DateRangeLast7Days = "LAST_7_DAYS";

    public const string DateRangeLast30Days = "LAST_30_DAYS";

    public const string DateRangeLast90Days = "LAST_90_DAYS";

    // הערכים הישנים נשמרים לתאימות לאחור — נתונים קיימים בטבלה עדיין משתמשים בהם
    public const string DateRangeCurrentMonth = "MONTH";
    public const string DateRangeQuarter = "QUARTER";
    public const string DateRangeYear = "YEAR";

  
    public static readonly string[] DateRanges =
        [DateRangeBoardFilter, DateRangeLast7Days, DateRangeLast30Days, DateRangeLast90Days];

    /// <summary>
    /// כל הערכים החוקיים בעמודה — כולל הישנים, כדי שנתונים קיימים יישארו תקינים.
    /// האימות משתמש בזה; הטופס מציג רק את <see cref="DateRanges"/>.
    /// מספרי הימים (7 / 30 / 90) נשמרים כמחרוזת — הם מגיעים מ-CTRL_CalculationDays.Value.
    /// </summary>
    public static readonly string[] AllowedDateRanges =
        [.. DateRanges, DateRangeCurrentMonth, DateRangeQuarter, DateRangeYear, "7", "30", "90"];


    /// <summary>
    /// הערך שנכתב ב-CTRL_Metrics.CreatedBy כל עוד לא הוגדר מנגנון התחברות.
    /// עם בניית ניהול המשתמשים — מחליפים במקום אחד (ראו CreateMetricCommandHandler).
    /// </summary>
    public const string FallbackUserName = "USER";

    public const int MetricNameMaxLength = 80;

    public const int IconCodeMaxLength = 50;
}
