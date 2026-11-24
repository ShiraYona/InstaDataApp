using System.Data;
using System.Data.Common;
using System.Globalization;
using System.Text.RegularExpressions;
using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Domain.Entities;

namespace InstaDataApp.Application.Modules.DataDefinitions;


public record GetMetricPreviewQuery(MetricDraftDto Draft) : IRequest<PreviewResultDto>;

public class GetMetricPreviewQueryHandler : IRequestHandler<GetMetricPreviewQuery, PreviewResultDto>
{
    // שמות טבלה/עמודה מוזרקים ל-SQL — מאשרים אותם כמו בשאר השאילתות
    private static readonly Regex Safe = new("^[A-Za-z_][A-Za-z0-9_$#]*$", RegexOptions.Compiled);

    private readonly IApplicationDbContext _context;

    public GetMetricPreviewQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<PreviewResultDto> Handle(GetMetricPreviewQuery request, CancellationToken cancellationToken)
    {
        var draft = request.Draft;

        // אותה בדיקה כמו בשמירה — התצוגה המקדימה לא אמורה להראות מה שהשמירה תדחה
        var canonical = await MetricDraftCheck.ValidateAndCanonicalizeAsync(_context, draft, cancellationToken);

        var fieldIds = draft.DetailFieldIds
            .Concat(new[] { draft.SumFieldId, draft.GroupFieldId }.OfType<int>())
            .Concat(new[] { draft.DateFromFieldId, draft.DateToFieldId }.OfType<int>())
            .Where(id => canonical.FieldDataTypes.ContainsKey(id))
            .Distinct()
            .ToList();

        var labels = await _context.CtrlDataSourceFields.AsNoTracking()
            .Where(f => f.SourceID == draft.SourceId && fieldIds.Contains(f.FieldID))
            .ToDictionaryAsync(f => f.FieldID, f => f.DisplayName, cancellationToken);

        var rows = draft.DetailFieldIds
            .Select(id => new PreviewRowDto
            {
                Key = id.ToString(),
                Label = labels.TryGetValue(id, out var label) ? label : string.Empty,
                Value = 0
            })
            .ToList();

        // --- חישוב אמיתי על המקור: אותה שיטה של הקובייה (COUNT / SUM) ---
        var source = await _context.DataSources.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SourceID == draft.SourceId, cancellationToken);

        // DIRECT — אין סכימה, מציגים רק את השורות (הערכים אינם מספריים)
        if (source is null || !Safe.IsMatch(source.ObjectName))
        {
            return new PreviewResultDto { Rows = rows, Total = 0 };
        }

               var calculationType = await _context.CalculationTypes.AsNoTracking()
            .FirstOrDefaultAsync(type => type.Id == draft.CalculationTypeId, cancellationToken);

        // כמו הקובייה: ה-Value הוא הקוד הקנוני (COUNT / SUM), לא ה-Name
        var calcCode = (calculationType?.Value ?? string.Empty).Trim().ToUpperInvariant();
        if (calcCode.Length == 0)
        {
            // גיבוי: קטלוג שאין בו Value — ממירים מה-Name
            calcCode = CalculationTypeMap.ToCode(calculationType?.Name);
        }

        var aggregate = calcCode switch
        {
            MetricConstants.CalculationCount => "CAST(COUNT_BIG(*) AS decimal(38,4))",
            MetricConstants.CalculationSum => await SumAggregateAsync(draft, cancellationToken),
            _ => null
        };

        if (aggregate is null)
        {
            return new PreviewResultDto { Rows = rows, Total = 0 };
        }

        var (where, parameters) = await PeriodWhereAsync(source, draft.DateRangeType, cancellationToken);

        var connection = _context.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        await using var command = connection.CreateCommand();
        command.CommandText = $"SELECT {aggregate} FROM [{source.ObjectName}]{where}";
        foreach (var (name, value) in parameters)
        {
            var parameter = command.CreateParameter();
            parameter.ParameterName = name;
            parameter.Value = value;
            command.Parameters.Add(parameter);
        }

                decimal total;
        try
        {
            var raw = await command.ExecuteScalarAsync(cancellationToken);
            total = raw is null or DBNull ? 0m : Convert.ToDecimal(raw, CultureInfo.InvariantCulture);
        }
        catch (Exception ex)
        {
            // נפילה ל-0 אם ה-SQL נכשל — במקום 500 שמאתחל את הטופס
            // שגיאה בחישוב — מוצג 0 במקום 500
            _ = ex;
            return new PreviewResultDto { Rows = rows, Total = 0 };
        }


        return new PreviewResultDto { Rows = rows, Total = (long)Math.Round(total) };
    }
    /// <summary>שמות העמודות בטבלה בפועל וטיפוסן — כמו ActualColumnsAsync בקובייה</summary>
    private static async Task<Dictionary<string, string>> ActualColumnsAsync(
        DbConnection conn, DataSource source, CancellationToken cancellationToken)
    {
        var schema = source.SchemaName ?? "dbo";
        await using var command = conn.CreateCommand();
        command.CommandText =
            "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @s AND TABLE_NAME = @t";
        var ps = command.CreateParameter(); ps.ParameterName = "@s"; ps.Value = schema; command.Parameters.Add(ps);
        var pt = command.CreateParameter(); pt.ParameterName = "@t"; pt.Value = source.ObjectName; command.Parameters.Add(pt);

        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            map[reader.GetString(0)] = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
        }
        return map;
    }

    /// <summary>האם העמודה קיימת בטבלה ובאמת מטיפוס תאריך — כמו IsDateColumn בקובייה</summary>
    private static bool IsDateColumn(Dictionary<string, string> actual, string? column)
    {
        if (string.IsNullOrWhiteSpace(column) || !actual.TryGetValue(column, out var type))
        {
            return false;
        }
        return type.Equals("date", StringComparison.OrdinalIgnoreCase)
            || type.Equals("datetime", StringComparison.OrdinalIgnoreCase)
            || type.Equals("datetime2", StringComparison.OrdinalIgnoreCase)
            || type.Equals("smalldatetime", StringComparison.OrdinalIgnoreCase)
            || type.Equals("datetimeoffset", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// SUM — על שדה הסיכום. כך מחושב הערך בקובייה (GetMetricDetailsQuery.CardValueAsync),
    /// אבל אם השדה אינו קיים בטבלה בפועל, נופלים לשדה הקיבוץ (אותו כלל).
    /// </summary>
    private async Task<string?> SumAggregateAsync(MetricDraftDto draft, CancellationToken cancellationToken)
    {
        var candidates = new[] { draft.SumFieldId, draft.GroupFieldId }
            .OfType<int>()
            .Distinct()
            .ToList();

        if (candidates.Count == 0)
        {
            return null;
        }

        var names = await _context.DataSourceFields
            .Where(f => f.SourceID == draft.SourceId && candidates.Contains(f.FieldID))
            .ToDictionaryAsync(f => f.FieldID, f => f.FieldName, cancellationToken);

        var column = candidates
            .Select(id => names.TryGetValue(id, out var name) ? name : null)
            .FirstOrDefault(name => name is not null && !string.IsNullOrWhiteSpace(name) && Safe.IsMatch(name));

        return column is null
            ? null
            : $"ISNULL(SUM(TRY_CAST([{column}] AS decimal(38,4))),0)";
    }

    /// <summary>
    /// תנאי תקופה לפי התאריך של המקור וסוג התקופה שנשמר.
    /// BOARD_FILTER — אין מסנן לוח בתצוגה מקדימה, לכן מציגים את כל הנתונים.
    /// </summary>
    private async Task<(string Where, Dictionary<string, object?> Params)> PeriodWhereAsync(
        DataSource source,
        string? dateRangeType,
        CancellationToken cancellationToken)
    {
        var parameters = new Dictionary<string, object?>();
        var value = (dateRangeType ?? string.Empty).Trim();

        if (value.Length == 0
            || string.Equals(value, MetricConstants.DateRangeBoardFilter, StringComparison.Ordinal))
        {
            return ("", parameters);
        }

        // תקופות ישנות: MONTH / QUARTER / YEAR
        var days = value.ToUpperInvariant() switch
        {
            MetricConstants.DateRangeCurrentMonth => DateTime.DaysInMonth(DateTime.Today.Year, DateTime.Today.Month),
            MetricConstants.DateRangeQuarter => 90,
            MetricConstants.DateRangeYear => 365,
            _ => await DaysFromPeriodAsync(value, cancellationToken)
        };

        if (days <= 0)
        {
            return ("", parameters);
        }

        var dateFieldName = source.DateFieldID is null
            ? null
            : await _context.DataSourceFields.AsNoTracking()
                .Where(f => f.SourceID == source.SourceID && f.FieldID == source.DateFieldID)
                .Select(f => f.FieldName)
                .FirstOrDefaultAsync(cancellationToken);

        if (dateFieldName is null || !Safe.IsMatch(dateFieldName))
        {
            return ("", parameters);
        }

        // כמו הקובייה: הסינון מוחל רק אם העמודה באמת קיימת בטבלה ומטיפוס תאריך
        var connection = _context.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }
        var actualColumns = await ActualColumnsAsync(connection, source, cancellationToken);
        if (!IsDateColumn(actualColumns, dateFieldName))
        {
            return ("", parameters);
        }

        // כמו PeriodWhere ב-GetMetricDetailsQuery: הסוף הוא "לפני יום המחרת"
        var to = DateTime.Today.AddDays(1);
        var from = DateTime.Today.AddDays(-days);

        parameters["@pFrom"] = from;
        parameters["@pTo"] = to;

        return ($" WHERE [{dateFieldName}] >= @pFrom AND [{dateFieldName}] < @pTo", parameters);
    }

    /// <summary>
    /// המרת הבחירה בטופס למספר ימים: ה-Value של CTRL_CalculationDays ("30"),
    /// או ה-Name ("30 ימים") שמגיע לנתונים שנשמרו.
    /// </summary>
    private async Task<int> DaysFromPeriodAsync(string value, CancellationToken cancellationToken)
    {
        if (int.TryParse(value, out var parsed))
        {
            var byValue = await _context.CalculationDays.AsNoTracking()
                .FirstOrDefaultAsync(period => period.Value == parsed, cancellationToken);
            return byValue?.Value ?? parsed;
        }

        var byName = await _context.CalculationDays.AsNoTracking()
            .FirstOrDefaultAsync(period => period.Name == value, cancellationToken);
        return byName?.Value ?? 0;
    }
}
