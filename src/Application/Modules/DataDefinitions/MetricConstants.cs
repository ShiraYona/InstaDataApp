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

    public const string NoGrouping = "none";

    // -------------------------------------------------------- סוגי מקור נתונים
    public const string SourceTypeTable = "TABLE";

    public const string SourceTypeProcedure = "PROCEDURE";

    public const string OutputTypeRows = "ROWS";

    public const string OutputTypeScalar = "SCALAR";

    // ---------------------------------------------------- תקופת / טווח החישוב

    public const string DateRangeDashboard = "DASHBOARD";

    public const string DateRangeDashboardLabel = "לפי מסנן הלוח";

    public const string DateRangeLegacyBoardFilter = "BOARD_FILTER";

    public const string DateRangeLast7Days = "LAST_7_DAYS";

    public const string DateRangeLast30Days = "LAST_30_DAYS";

    public const string DateRangeLast90Days = "LAST_90_DAYS";

    public const string DateRangeCurrentMonth = "MONTH";
    public const string DateRangeQuarter = "QUARTER";
    public const string DateRangeYear = "YEAR";


    public static readonly string[] DateRanges =
        [DateRangeDashboard, DateRangeLast7Days, DateRangeLast30Days, DateRangeLast90Days];

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

    public static bool IsPeriodDaysValue(string? value) =>
        int.TryParse((value ?? string.Empty).Trim(), out var days) && days > 0;

    public const int DateRangeNameMaxLength = 20;

    public static bool IsDashboard(string? value) =>
        string.Equals(value, DateRangeDashboard, StringComparison.OrdinalIgnoreCase)
        || string.Equals(value, DateRangeLegacyBoardFilter, StringComparison.OrdinalIgnoreCase);

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

    public const string FallbackUserName = "USER";

    public const int MetricNameMaxLength = 80;

    public const int IconCodeMaxLength = 50;
}
