using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Common.Models;
using InstaDataApp.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Data.Common;
using System.Globalization;
using System.Text.RegularExpressions;

namespace InstaDataApp.Application.Modules.Metrics.Queries.GetMetricDetails;

public record GetMetricDetailsQuery(string Key, string? GroupValue = null, int? SourceId = null,
    string? Search = null, int? MaxRowsOverride = null,
    DateOnly? FromDate = null, DateOnly? ToDate = null)
    : IRequest<MetricDetailDto?>;

public class GetMetricDetailsQueryHandler(IApplicationDbContext context, ILogger<GetMetricDetailsQueryHandler> logger)
    : IRequestHandler<GetMetricDetailsQuery, MetricDetailDto?>
{
    private static readonly Regex Safe = new("^[A-Za-z_][A-Za-z0-9_$#]*$", RegexOptions.Compiled);
    private const int MaxRows = 500;

    public async Task<MetricDetailDto?> Handle(GetMetricDetailsQuery request, CancellationToken ct)
    {
        if (!int.TryParse(request.Key, out var metricId)) return null;

        var metric = await context.CtrlMetrics.AsNoTracking()
            .FirstOrDefaultAsync(m => m.MetricID == metricId, ct);
        if (metric is null) return null;

        var calc = await context.CtrlCalculationTypes.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ID == metric.CalculationTypeID, ct);
        metric.CalculationType = calc;

        var source = await context.CtrlDataSources.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SourceID == metric.SourceID, ct);
        if (source is null)
            return new MetricDetailDto { Key = request.Key, Title = metric.MetricName, IsStale = true };

        // כל השדות, כולל כאלה שאינם מסומנים פעילים — כדי ששדה התאריך של המקור יימצא גם אז.
        // הסינון לתצוגה (IsVisible + קיום בטבלה בפועל) נעשה ב-BuildColumnsAsync.
        var fields = await context.CtrlDataSourceFields.AsNoTracking()
            .ToListAsync(ct);

        // עמודת המערכת — לפי GroupFieldID במסגרת אותו מקור בלבד
        var groupField = fields.FirstOrDefault(f => f.FieldID == metric.GroupFieldID
                                                 && f.SourceID == metric.SourceID);
        var sumField = fields.FirstOrDefault(f => f.FieldID == metric.SumFieldID
                                               && f.SourceID == metric.SourceID);
        var dto = new MetricDetailDto
        {
            Key = request.Key,
            Title = metric.MetricName,
            SourceName = source.SourceName,
            CreatedDate = metric.CreatedDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            GroupFieldName = groupField?.FieldName,
            GroupFieldLabel = "מערכת",
            SignType = metric.CalculationType?.SignType,
            CalcType = metric.CalculationType?.Value,
ValueFieldName = sumField?.FieldName,
        };

        var connection = await OpenAsync(ct);

        // שדה התאריך של המקור — לסינון תקופה כמו בכרטיס.
        // מאומת מול העמודות האמיתיות: רק עמודה קיימת ומטיפוס תאריך
        var sourceColumns = await ActualColumnsAsync(connection, source.ObjectName,
            source.SchemaName ?? "dbo", ct);
        // לא מסתמכים על רשימת השדות הפעילים: שדה התאריך של המקור מפורש ב-CTRL_DataSources
        var dateFieldName = await context.CtrlDataSourceFields.AsNoTracking()
            .Where(f => f.SourceID == source.SourceID && f.FieldID == source.DateFieldID)
            .Select(f => f.FieldName)
            .FirstOrDefaultAsync(ct);
        var dateExpr = dateFieldName is not null
                       && Safe.IsMatch(dateFieldName)
                       && IsDateColumn(sourceColumns, dateFieldName)
            ? $"[{dateFieldName}]"
            : null;

        // טווח התקופה של הקובייה — מוחל על הקוביות, על טבלת הקבוצות ועל טבלת הרשומות
        var (periodWhere, periodParams) = PeriodWhere(dateExpr, request.FromDate, request.ToDate);

        logger.LogInformation(
            "DETAIL PERIOD: metric={Metric} from={From} to={To} dateField={DateField} dateExpr={DateExpr} where={Where}",
            metricId, request.FromDate, request.ToDate, dateFieldName, dateExpr, periodWhere);

        dto.DataValue = await CardValueAsync(connection, source, metric, sumField?.FieldName, groupField?.FieldName,
            periodWhere, periodParams, ct);

        var groupFieldName = groupField?.FieldName;
        var sumFieldName = sumField?.FieldName;
        var calcType = (metric.CalculationType?.Value ?? "").Trim().ToUpperInvariant();

        dto.Systems = await SystemGroupsAsync(connection, source, groupFieldName, sumFieldName, calcType,
            periodWhere, periodParams, ct);
        foreach (var row in dto.Systems)
        {
            dto.TotalRecords += row.Records;
            dto.TotalValue = (dto.TotalValue ?? 0) + (row.TotalValue ?? 0);
        }

        // אין שדה קיבוץ — טבלת הקבוצות ריקה, ולכן הסה"כ מחושב ישירות על אותן רשומות מסוננות
        if (groupFieldName is null || dto.Systems.Count == 0)
            dto.TotalRecords = await CountAsync(connection, source, periodWhere, periodParams, ct);

        dto.Columns = await BuildColumnsAsync(connection, source, fields, metric, ct);

        // מיון דטרמיניסטי — כדי שמנות (עמודים / ייצוא) לא יחפפו זו לזו
        var order = await OrderBySqlAsync(connection, source, dto.Columns, dateExpr, ct);

        dto.Records = await RecordsAsync(connection, source, groupFieldName,
            request.GroupValue, request.Search, request.MaxRowsOverride ?? MaxRows, dto.Columns,
            periodWhere, periodParams, order, ct);
        dto.RecordsInSample = dto.Records.Count;
        return dto;

    }


    // ---------- עמודות הרשומות: מזהה, תאריך, מערכת, סכום, ואז השאר ----------
    // מסנן רק שדות שבאמת קיימים בטבלה (CTRL_DataSourceFields לא תמיד מסונכרן)
    private async Task<List<DetailColumnDto>> BuildColumnsAsync(DbConnection conn, CtrlDataSource source,
        List<CtrlDataSourceField> fields, CtrlMetric metric, CancellationToken ct)
    {
        var actual = await ActualColumnsAsync(conn, source.ObjectName, source.SchemaName ?? "dbo", ct);

        // עמודת התאריך מוצגת רק אם היא באמת עמודת תאריך
        var dateName = fields.FirstOrDefault(f => f.FieldID == source.DateFieldID
                                                && f.SourceID == source.SourceID)?.FieldName;
        if (!IsDateColumn(actual, dateName)) dateName = null;

        var groupName = fields.FirstOrDefault(f => f.SourceID == source.SourceID
                                                 && f.FieldID == metric.GroupFieldID)?.FieldName;
        var sumName = fields.FirstOrDefault(f => f.SourceID == source.SourceID
                                               && f.FieldID == metric.SumFieldID)?.FieldName;

        // רק השדות שהנתון מגדיר + עמודת מפתח לזההות
        var relevantNames = new[] { dateName, groupName, sumName }
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var visible = fields.Where(f => f.SourceID == source.SourceID && f.IsVisible
                                     && actual.ContainsKey(f.FieldName)
                                     && relevantNames.Contains(f.FieldName))
            .OrderBy(f => f.DisplayOrder).ToList();

        var ordered = new List<CtrlDataSourceField>();
        void Add(string? name)
        {
            var f = visible.FirstOrDefault(v => v.FieldName == name);
            if (f is not null && !ordered.Contains(f)) ordered.Add(f);
        }

        Add(dateName);
        Add(groupName);
        Add(sumName);

        foreach (var f in visible) if (!ordered.Contains(f)) ordered.Add(f);

return ordered.Select(f => new DetailColumnDto
{
    FieldName = f.FieldName,
    Label = string.IsNullOrWhiteSpace(f.DisplayName) ? f.FieldName : f.DisplayName!,
    DataType = f.DataType ?? string.Empty,
    IsHidden = f.FieldName == groupName || f.FieldName == sumName   // ← זה החדש
}).ToList();
    }

    private static readonly Dictionary<string, Dictionary<string, string>> ColumnsCache = new();

    // מחזיר מילון: שם עמודה → טיפוס הנתונים שלה בטבלה בפועל
    private static async Task<Dictionary<string, string>> ActualColumnsAsync(DbConnection conn, string objectName,
        string schema, CancellationToken ct)
    {
        var full = $"{schema}.{objectName}";
        if (ColumnsCache.TryGetValue(full, out var cached)) return cached;

        await using var cmd = CreateCommand(conn,
            "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @s AND TABLE_NAME = @t",
            new Dictionary<string, object?> { ["@s"] = schema, ["@t"] = objectName });

        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
            map[reader.GetString(0)] = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
        ColumnsCache[full] = map;
        return map;
    }

    // האם העמודה קיימת בטבלה ובאמת מטיפוס תאריך
    private static bool IsDateColumn(Dictionary<string, string> actual, string? column)
    {
        if (string.IsNullOrWhiteSpace(column)) return false;
        if (!actual.TryGetValue(column, out var type)) return false;
        return type.Equals("date", StringComparison.OrdinalIgnoreCase)
            || type.Equals("datetime", StringComparison.OrdinalIgnoreCase)
            || type.Equals("datetime2", StringComparison.OrdinalIgnoreCase)
            || type.Equals("smalldatetime", StringComparison.OrdinalIgnoreCase)
            || type.Equals("datetimeoffset", StringComparison.OrdinalIgnoreCase);
    }


    private async Task<DbConnection> OpenAsync(CancellationToken ct)
    {
        var connection = context.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open) await connection.OpenAsync(ct);
        return connection;
    }

    // ---------- ערך הכרטיס כמו בקובייה ----------
    private async Task<string> CardValueAsync(DbConnection conn, CtrlDataSource source, CtrlMetric metric,
        string? sumField, string? groupField, string periodWhere,
        Dictionary<string, object?> periodParams, CancellationToken ct)
    {
        if (!Safe.IsMatch(source.ObjectName)) return "0";

        var calc = (metric.CalculationType?.Value ?? "").Trim().ToUpperInvariant();
        string aggregate;

        if (calc == "COUNT")
        {
            aggregate = "CAST(COUNT_BIG(*) AS decimal(38,4))";
        }
        else if (sumField is not null && Safe.IsMatch(sumField))
        {
            aggregate = $"ISNULL(SUM(TRY_CAST([{sumField}] AS decimal(38,4))),0)";
        }
        else if (groupField is not null && Safe.IsMatch(groupField))
        {
            // נפילה לאחור — כמו הקוד הקודם
            aggregate = $"ISNULL(SUM(TRY_CAST([{groupField}] AS decimal(38,4))),0)";
        }
        else
        {
            return "0";
        }

               var raw = await ScalarAsync(conn, $"SELECT {aggregate} FROM [{source.ObjectName}]{periodWhere}", periodParams, ct);
        return raw is null or DBNull ? "0" : Convert.ToDecimal(raw).ToString(
            calc == "COUNT" ? "N0" : "0.##", CultureInfo.GetCultureInfo("he-IL"));

    }

    // ---------- שורה אחת בטבלת המערכות ----------
        // ---------- שורה אחת בטבלת המערכות ----------
    private async Task<List<SystemGroupDto>> SystemGroupsAsync(DbConnection conn, CtrlDataSource source,
        string? groupFieldName, string? sumFieldName, string calcType,
        string periodWhere, Dictionary<string, object?> periodParams, CancellationToken ct)
    {
        var result = new List<SystemGroupDto>();
        if (!Safe.IsMatch(source.ObjectName) || groupFieldName is null || !Safe.IsMatch(groupFieldName))
        {
            return result;   // אין שדה קיבוץ — הטבלה לא תוצג
        }

        try
        {
            var isCount = calcType == "COUNT";
            var valueExpr = isCount
                ? "CAST(COUNT_BIG(*) AS decimal(38,4))"
                : sumFieldName is not null && Safe.IsMatch(sumFieldName)
                    ? $"ISNULL(SUM(TRY_CAST([{sumFieldName}] AS decimal(38,4))),0)"
                    : "CAST(NULL AS decimal(38,4))";

            var sql = $@"
SELECT [{groupFieldName}] AS g, COUNT_BIG(*) AS c, {valueExpr} AS s
FROM [{source.ObjectName}]{periodWhere}
GROUP BY [{groupFieldName}]
ORDER BY COUNT_BIG(*) DESC";

            await using var cmd = CreateCommand(conn, sql, periodParams);
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
            {
                var value = reader.IsDBNull(0) ? "(ריק)" : Convert.ToString(reader.GetValue(0))!;
                result.Add(new SystemGroupDto
                {
                    SourceId = source.SourceID,
                    SourceName = value,
                    GroupValue = value,
                    Records = Convert.ToInt64(reader.GetValue(1)),
                    TotalValue = reader.IsDBNull(2) ? null : Convert.ToDecimal(reader.GetValue(2))
                });
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "System grouping failed for {Source}", source.SourceName);
            result.Add(new SystemGroupDto { SourceId = source.SourceID, SourceName = source.SourceName, IsError = true });
        }
        return result;
    }
    // ---------- ספירת רשומות מסוננות (בלי קיבוץ) ----------
    private static async Task<long> CountAsync(DbConnection conn, CtrlDataSource source, string periodWhere,
        Dictionary<string, object?> periodParams, CancellationToken ct)
    {
        if (!Safe.IsMatch(source.ObjectName)) return 0;
        var raw = await ScalarAsync(conn, $"SELECT COUNT_BIG(*) FROM [{source.ObjectName}]{periodWhere}", periodParams, ct);
        return raw is null or DBNull ? 0 : Convert.ToInt64(raw);
    }
    
    // ---------- תנאי התקופה — לפי התאריכים שהתקבלו (אותו טווח של הקובייה) ----------
    // הטווח נסגר בחצות של יום הסיום, ולכן הסוף הוא "לפני יום המחרת" ולא עד חצות היום עצמו
    private static (string Where, Dictionary<string, object?> Params) PeriodWhere(
        string? dateExpr, DateOnly? fromDate, DateOnly? toDate)
    {
        var parameters = new Dictionary<string, object?>();
        if (dateExpr is null) return ("", parameters);

        var conditions = new List<string>();
        if (fromDate is not null)
        {
            conditions.Add($"{dateExpr} >= @pFrom");
            parameters["@pFrom"] = fromDate.Value.ToDateTime(TimeOnly.MinValue);
        }
        if (toDate is not null)
        {
            conditions.Add($"{dateExpr} < @pTo");
            parameters["@pTo"] = toDate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
        }

        return (conditions.Count > 0 ? " WHERE " + string.Join(" AND ", conditions) : "", parameters);
    }

    // ---------- רשומות הנתון ----------
    private async Task<List<Dictionary<string, object?>>> RecordsAsync(DbConnection conn, CtrlDataSource source,
        string? groupField, string? groupValue, string? search, int maxRows, List<DetailColumnDto> columns,
        string periodWhere, Dictionary<string, object?> periodParams, string? orderBy, CancellationToken ct)
    {
        if (!Safe.IsMatch(source.ObjectName)) return new();
        if (columns.Count == 0) return new();

        var cols = string.Join(", ", columns.Select(c => $"[{c.FieldName}]"));
        // תנאי התקופה מגיעים מוכנים ועם הפרמטרים שלהם — מתווספים לתנאים של הקיבוץ והחיפוש
        var parameters = new Dictionary<string, object?>(periodParams);
        var conditions = new List<string>();

        // התקופה מוחלת גם בפירוט — רשומות מחוץ לטווח לא מוצגות
        if (!string.IsNullOrEmpty(periodWhere))
            conditions.Add(periodWhere.Replace(" WHERE ", ""));

        if (groupField is not null && !string.IsNullOrWhiteSpace(groupValue)
            && Safe.IsMatch(groupField) && columns.Any(c => c.FieldName == groupField))
        {
            conditions.Add($"CAST([{groupField}] AS nvarchar(400)) = @g");
            parameters["@g"] = groupValue;
        }

        // חיפוש טקסטואלי על העמודות המותרות להצגה בלבד
        if (!string.IsNullOrWhiteSpace(search) && search.Trim().Length > 0)
        {
            var pattern = "%" + search.Trim().Replace("@", "@@").Replace("[", "[[]")
                                                  .Replace("%", "@%").Replace("_", "@_") + "%";
            parameters["@q"] = pattern;
            var matches = columns.Select(c => $"CAST([{c.FieldName}] AS nvarchar(400)) LIKE @q ESCAPE '@'");
            conditions.Add("(" + string.Join(" OR ", matches) + ")");
        }

        var where = conditions.Count > 0 ? " WHERE " + string.Join(" AND ", conditions) : "";
        var order = orderBy is not null ? $" ORDER BY {orderBy}" : "";
        var sql = $"SELECT TOP ({maxRows}) {cols} FROM [{source.ObjectName}]{where}{order}";

        return await ReadRowsAsync(conn, sql, parameters, columns, ct);
    }

    // ---------- מיון דטרמיניסטי: תאריך המקור, ומפתח ראשי/עמודה ראשונה כמפתח משני ----------
    private async Task<string?> OrderBySqlAsync(DbConnection conn, CtrlDataSource source,
        List<DetailColumnDto> columns, string? dateExpr, CancellationToken ct)
    {
        var parts = new List<string>();
        if (dateExpr is not null) parts.Add($"{dateExpr} DESC");

        var keyCols = await PrimaryKeyColumnsAsync(conn, source.ObjectName, source.SchemaName ?? "dbo", ct);
        foreach (var k in keyCols)
            if (columns.Any(c => c.FieldName.Equals(k, StringComparison.OrdinalIgnoreCase)))
                parts.Add($"[{k}] ASC");

        // אין מפתח ראשי גלוי — עוגן על העמודה הראשונה כדי למנוע חפיפה או דילוג בין מנות
        if (parts.Count == 0 || (keyCols.Count == 0 && dateExpr is null))
            parts.Add($"[{columns[0].FieldName}] ASC");

        return parts.Count > 0 ? string.Join(", ", parts) : null;
    }

    private static readonly Dictionary<string, List<string>> KeyColumnsCache = new();

    private static async Task<List<string>> PrimaryKeyColumnsAsync(DbConnection conn, string objectName,
        string schema, CancellationToken ct)
    {
        var full = $"{schema}.{objectName}";
        if (KeyColumnsCache.TryGetValue(full, out var cached)) return cached;

        await using var cmd = CreateCommand(conn, @"
SELECT c.name
FROM sys.indexes i
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
JOIN sys.tables t ON t.object_id = i.object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE i.is_primary_key = 1 AND s.name = @s AND t.name = @t
ORDER BY ic.key_ordinal",
            new Dictionary<string, object?> { ["@s"] = schema, ["@t"] = objectName });

        var keys = new List<string>();
        try
        {
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct)) keys.Add(reader.GetString(0));
        }
        catch (Exception)
        {
            // אין הרשאה לקטלוג — נמשיך בלי מפתח ראשי
        }
        KeyColumnsCache[full] = keys;
        return keys;
    }

    // ---------- תשתית ----------
    private static async Task<object?> ScalarAsync(DbConnection conn, string sql,
        Dictionary<string, object?>? parameters, CancellationToken ct, Func<DbDataReader, object?>? projector = null)
    {
        await using var cmd = CreateCommand(conn, sql, parameters);
        if (projector is not null)
        {
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            return projector(reader);
        }
        return await cmd.ExecuteScalarAsync(ct);
    }

    private static async Task<List<Dictionary<string, object?>>> ReadRowsAsync(DbConnection conn, string sql,
        Dictionary<string, object?> parameters, List<DetailColumnDto> columns, CancellationToken ct)
    {
        await using var cmd = CreateCommand(conn, sql, parameters);
        var result = new List<Dictionary<string, object?>>();

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var dict = new Dictionary<string, object?>(columns.Count);
            for (var i = 0; i < reader.FieldCount && i < columns.Count; i++)
                dict[columns[i].FieldName] = reader.IsDBNull(i) ? null : reader.GetValue(i);
            result.Add(dict);
        }
        return result;
    }

    private static DbCommand CreateCommand(DbConnection conn, string sql, Dictionary<string, object?>? parameters)
    {
        var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.CommandType = CommandType.Text;
        cmd.CommandTimeout = 30;
        if (parameters is null) return cmd;

        foreach (var kv in parameters)
        {
            var p = cmd.CreateParameter();
            p.ParameterName = kv.Key;
            p.Value = kv.Value ?? DBNull.Value;
            cmd.Parameters.Add(p);
        }
        return cmd;
    }
}
