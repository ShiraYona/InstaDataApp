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

public record GetMetricDetailsQuery(string Key, string? GroupValue = null, int? SourceId = null)
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
        var calc = await context.CtrlCalculationTypes.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ID == metric!.CalculationTypeID, ct);
        metric!.CalculationType = calc;
        if (metric is null) return null;

        var source = await context.CtrlDataSources.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SourceID == metric.SourceID, ct);
        if (source is null)
            return new MetricDetailDto { Key = request.Key, Title = metric.MetricName, IsStale = true };

        var fields = await context.CtrlDataSourceFields.AsNoTracking()
            .Where(f => f.IsActive).ToListAsync(ct);

        // עמודת המערכת — לפי GroupFieldID בלבד
        var groupField = fields.FirstOrDefault(f => f.FieldID == metric.GroupFieldID);
var sumField = fields.FirstOrDefault(f => f.FieldID == metric.SumFieldID)
            ?? fields.FirstOrDefault(f => f.SourceID == metric.SourceID
                                       && f.FieldID == metric.SumFieldID);
        var dto = new MetricDetailDto
        {
            Key = request.Key,
            Title = metric.MetricName,
            SourceName = source.SourceName,
            CreatedDate = metric.CreatedDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            GroupFieldName = groupField?.FieldName,
            GroupFieldLabel = groupField?.DisplayName ?? "מערכת",
            SignType = metric.CalculationType?.SignType,
            ValueFieldName = sumField?.DisplayName ?? sumField?.FieldName
        };

        var connection = await OpenAsync(ct);

        // ערך הנתון — אותו חישוב כמו בכרטיס הקובייה
        dto.DataValue = await CardValueAsync(connection, source, metric, sumField?.FieldName, groupField?.FieldName, ct);

        // ==== חלוקה לפי מערכת: GROUP BY על עמודת המערכת ====
        var groupFieldName = groupField?.FieldName;
        var sumFieldName = sumField?.FieldName;
        var calcType = (metric.CalculationType?.Value ?? "").Trim().ToUpperInvariant();

        dto.Systems = await SystemGroupsAsync(connection, source, groupFieldName, sumFieldName, calcType, ct);
        foreach (var row in dto.Systems)
        {
            dto.TotalRecords += row.Records;
            dto.TotalValue = (dto.TotalValue ?? 0) + (row.TotalValue ?? 0);
        }

        // ==== רשומות הנתון — אותה טבלה, מסוננת לפי הערך שנבחר ====
        dto.Columns = await BuildColumnsAsync(connection, source, fields, metric, ct);
        dto.Records = await RecordsAsync(connection, source, groupFieldName,
            request.GroupValue, dto.Columns, ct);
        dto.RecordsInSample = dto.Records.Count;
        return dto;

    }


    // ---------- עמודות הרשומות: מזהה, תאריך, מערכת, סכום, ואז השאר ----------
    // מסנן רק שדות שבאמת קיימים בטבלה (CTRL_DataSourceFields לא תמיד מסונכרן)
    private async Task<List<DetailColumnDto>> BuildColumnsAsync(DbConnection conn, CtrlDataSource source,
        List<CtrlDataSourceField> fields, CtrlMetric metric, CancellationToken ct)
    {
        var actual = await ActualColumnsAsync(conn, source.ObjectName, source.SchemaName ?? "dbo", ct);

        var visible = fields.Where(f => f.SourceID == source.SourceID && f.IsVisible
                                     && actual.Contains(f.FieldName))
            .OrderBy(f => f.DisplayOrder).ToList();

        var dateName = fields.FirstOrDefault(f => f.FieldID == source.DateFieldID)?.FieldName;
        var groupName = fields.FirstOrDefault(f => f.SourceID == source.SourceID
                                                 && f.FieldID == metric.GroupFieldID)?.FieldName;
        var sumName = fields.FirstOrDefault(f => f.SourceID == source.SourceID
                                               && f.FieldID == metric.SumFieldID)?.FieldName;

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
            DataType = f.DataType ?? string.Empty
        }).ToList();
    }

    private static readonly Dictionary<string, HashSet<string>> ColumnsCache = new();

    private static async Task<HashSet<string>> ActualColumnsAsync(DbConnection conn, string objectName,
        string schema, CancellationToken ct)
    {
        var full = $"{schema}.{objectName}";
        if (ColumnsCache.TryGetValue(full, out var cached)) return cached;

        await using var cmd = CreateCommand(conn,
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @s AND TABLE_NAME = @t",
            new Dictionary<string, object?> { ["@s"] = schema, ["@t"] = objectName });

        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct)) set.Add(reader.GetString(0));
        ColumnsCache[full] = set;
        return set;
    }


    private async Task<DbConnection> OpenAsync(CancellationToken ct)
    {
        var connection = context.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open) await connection.OpenAsync(ct);
        return connection;
    }

    // ---------- ערך הכרטיס כמו בקובייה ----------
    private async Task<string> CardValueAsync(DbConnection conn, CtrlDataSource source, CtrlMetric metric,
        string? sumField, string? groupField, CancellationToken ct)
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

        var raw = await ScalarAsync(conn, $"SELECT {aggregate} FROM [{source.ObjectName}]", null, ct);
        return raw is null or DBNull ? "0" : Convert.ToDecimal(raw).ToString("N2", CultureInfo.GetCultureInfo("he-IL"));
    }

    // ---------- שורה אחת בטבלת המערכות ----------
    private async Task<List<SystemGroupDto>> SystemGroupsAsync(DbConnection conn, CtrlDataSource source,
        string? groupFieldName, string? sumFieldName, string calcType, CancellationToken ct)
    {
        var result = new List<SystemGroupDto>();
        if (!Safe.IsMatch(source.ObjectName) || groupFieldName is null || !Safe.IsMatch(groupFieldName))
        {
            result.Add(new SystemGroupDto { SourceId = source.SourceID, SourceName = source.SourceName, IsError = true });
            return result;
        }

        try
        {
            var sumExpr = sumFieldName is not null && Safe.IsMatch(sumFieldName)
                ? $"ISNULL(SUM(TRY_CAST([{sumFieldName}] AS decimal(38,4))),0)"
                : "CAST(NULL AS decimal(38,4))";

            var sql = $@"
SELECT [{groupFieldName}] AS g, COUNT_BIG(*) AS c, {sumExpr} AS s
FROM [{source.ObjectName}]
GROUP BY [{groupFieldName}]
ORDER BY COUNT_BIG(*) DESC";

            await using var cmd = CreateCommand(conn, sql, null);
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


    // ---------- רשומות הנתון ----------
    private async Task<List<Dictionary<string, object?>>> RecordsAsync(DbConnection conn, CtrlDataSource source,
        string? groupField, string? groupValue, List<DetailColumnDto> columns, CancellationToken ct)
    {
        if (!Safe.IsMatch(source.ObjectName)) return new();
        if (columns.Count == 0) return new();

        var cols = string.Join(", ", columns.Select(c => $"[{c.FieldName}]"));
        var parameters = new Dictionary<string, object?>();
        var where = "";

        if (groupField is not null && !string.IsNullOrWhiteSpace(groupValue)
            && Safe.IsMatch(groupField) && columns.Any(c => c.FieldName == groupField))
        {
            where = $" WHERE CAST([{groupField}] AS nvarchar(400)) = @g";
            parameters["@g"] = groupValue;
        }

        var sql = $"SELECT TOP ({MaxRows}) {cols} FROM [{source.ObjectName}]{where}";

        return await ReadRowsAsync(conn, sql, parameters, columns, ct);
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
