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
    /// <summary>הטקסט שמוצג למשתמש עבור <see cref="DateRangeBoardFilter"/></summary>
    public const string DateRangeBoardFilterLabel = "לפי מסנן הלוח";
    /// <summary>טווח של 7 הימים האחרונים</summary>
    public const string DateRangeLast7Days = "LAST_7_DAYS";
    /// <summary>טווח של 30 הימים האחרונים</summary>
    public const string DateRangeLast30Days = "LAST_30_DAYS";
    /// <summary>טווח של 90 הימים האחרונים</summary>
    public const string DateRangeLast90Days = "LAST_90_DAYS";

    // הערכים הישנים נשמרים לתאימות לאחור — נתונים קיימים בטבלה עדיין משתמשים בהם
    public const string DateRangeCurrentMonth = "MONTH";
    public const string DateRangeQuarter = "QUARTER";
    public const string DateRangeYear = "YEAR";

    /// <summary>
    /// התקופות המוצעות בטופס — הסדר כאן קובע את סדר הרשימה, והראשונה היא ברירת המחדל.
    /// </summary>
    public static readonly string[] DateRanges =
        [DateRangeBoardFilter, DateRangeLast7Days, DateRangeLast30Days, DateRangeLast90Days];

    /// <summary>
    /// כל הערכים החוקיים בעמודה — כולל הישנים, כדי שנתונים קיימים יישארו תקינים.
    /// האימות משתמש בזה; הטופס מציג רק את <see cref="DateRanges"/>.
    /// </summary>
    public static readonly string[] AllowedDateRanges =
        [.. DateRanges, DateRangeCurrentMonth, DateRangeQuarter, DateRangeYear];

    // סמלי הכרטיס אינם מוגדרים כאן — הם נקראים מטבלת העזר CTRL_CardIcons
    // (ראו GetCardIconsQuery), כדי שניתן יהיה להוסיף סמל בלי שינוי קוד.
}
