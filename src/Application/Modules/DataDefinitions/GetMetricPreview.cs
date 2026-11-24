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
    private static readonly Regex Safe = new("^[A-Za-z_][A-Za-z0-9_$#]*$", RegexOptions.Compiled);

    private readonly IApplicationDbContext _context;

    public GetMetricPreviewQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<PreviewResultDto> Handle(GetMetricPreviewQuery request, CancellationToken cancellationToken)
    {
        var draft = request.Draft;
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

        var source = await _context.CtrlDataSources.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SourceID == draft.SourceId, cancellationToken);

        if (source is null || !Safe.IsMatch(source.ObjectName))
        {
            return new PreviewResultDto { Rows = rows, Total = 0 };
        }

        var calculationType = await _context.CtrlCalculationTypes.AsNoTracking()
            .FirstOrDefaultAsync(type => type.ID == draft.CalculationTypeId, cancellationToken);

        var calcCode = (calculationType?.Value ?? string.Empty).Trim().ToUpperInvariant();
        if (calcCode.Length == 0)
        {
            calcCode = CalculationTypeMap.ToCode(calculationType);
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
        var (where, parameters) = await PeriodWhereAsync(source, canonical.DateRangeType, cancellationToken);

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
            // שגיאה בחישוב — מוצג 0 במקום 500
            _ = ex;
            return new PreviewResultDto { Rows = rows, Total = 0 };
        }


        return new PreviewResultDto { Rows = rows, Total = (long)Math.Round(total) };
    }
    private static async Task<Dictionary<string, string>> ActualColumnsAsync(
        DbConnection conn, CtrlDataSource source, CancellationToken cancellationToken)
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

        var names = await _context.CtrlDataSourceFields
            .Where(f => f.SourceID == draft.SourceId && candidates.Contains(f.FieldID))
            .ToDictionaryAsync(f => f.FieldID, f => f.FieldName, cancellationToken);

        var column = candidates
            .Select(id => names.TryGetValue(id, out var name) ? name : null)
            .FirstOrDefault(name => name is not null && !string.IsNullOrWhiteSpace(name) && Safe.IsMatch(name));

        return column is null
            ? null
            : $"ISNULL(SUM(TRY_CAST([{column}] AS decimal(38,4))),0)";
    }

    private async Task<(string Where, Dictionary<string, object?> Params)> PeriodWhereAsync(
        CtrlDataSource source,
        string? dateRangeType,
        CancellationToken cancellationToken)
    {
        var parameters = new Dictionary<string, object?>();
        var value = (dateRangeType ?? string.Empty).Trim();

        if (value.Length == 0 || MetricConstants.IsDashboard(value))
        {
            return ("", parameters);
        }

        var days = MetricConstants.TryGetPeriodDays(value, out var periodDays)
            ? periodDays
            : value.ToUpperInvariant() switch
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
            : await _context.CtrlDataSourceFields.AsNoTracking()
                .Where(f => f.SourceID == source.SourceID && f.FieldID == source.DateFieldID)
                .Select(f => f.FieldName)
                .FirstOrDefaultAsync(cancellationToken);

        if (dateFieldName is null || !Safe.IsMatch(dateFieldName))
        {
            return ("", parameters);
        }

        // סינון התקופה מוחל רק אם העמודה באמת קיימת בטבלה ומטיפוס תאריך
        var columnsConnection = _context.Database.GetDbConnection();
        if (columnsConnection.State != ConnectionState.Open)
        {
            await columnsConnection.OpenAsync(cancellationToken);
        }
        var actualColumns = await ActualColumnsAsync(columnsConnection, source, cancellationToken);
        if (!IsDateColumn(actualColumns, dateFieldName))
        {
            return ("", parameters);
        }
        var to = DateTime.Today.AddDays(1);
        var from = DateTime.Today.AddDays(-days);

        parameters["@pFrom"] = from;
        parameters["@pTo"] = to;

        return ($" WHERE [{dateFieldName}] >= @pFrom AND [{dateFieldName}] < @pTo", parameters);
    }

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
