using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Common.Models;
using InstaDataApp.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Data.Common;
using System.Globalization;

namespace InstaDataApp.Application.Modules.Metrics.Queries.GetActiveMetrics;

public record GetActiveMetricsQuery(
    string? MetricName = null,
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    string? UserId = null)
    : IRequest<List<MetricCardDto>>;

public class GetActiveMetricsQueryHandler(IApplicationDbContext context, ILogger<GetActiveMetricsQueryHandler> logger)
    : IRequestHandler<GetActiveMetricsQuery, List<MetricCardDto>>
{
    public async Task<List<MetricCardDto>> Handle(GetActiveMetricsQuery request, CancellationToken ct)
    {
List<int>? visibleMetricIds = null;
if (!string.IsNullOrWhiteSpace(request.UserId))
{
visibleMetricIds = await context.UserMetricSettings
    .AsNoTracking()
    .Where(x => x.UserId == request.UserId && x.IsVisible)
    .Select(x => x.MetricId)
    .ToListAsync(ct);
}

var query = context.CtrlMetrics.AsNoTracking().Where(m => m.IsActive);
if (visibleMetricIds is not null)
    query = query.Where(m => visibleMetricIds.Contains(m.MetricID));

var metrics = await query.ToListAsync(ct);

var calcTypes = await context.CtrlCalculationTypes.AsNoTracking()
    .ToDictionaryAsync(c => c.ID, ct);

        var sources = await context.CtrlDataSources.AsNoTracking()
            .ToDictionaryAsync(s => s.SourceID, ct);

        Dictionary<int, List<MetricGroupDto>> groupsByMetric;
        try
        {
            groupsByMetric = await LoadGroupsAsync(request.MetricName, request.FromDate, request.ToDate, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "טעינת הקבוצות נכשלה");
            groupsByMetric = new();
        }

        var cards = new List<MetricCardDto>(metrics.Count);
if (metrics.Count == 0)
    return cards;

        foreach (var metric in metrics)
        {
            if (!sources.TryGetValue(metric.SourceID, out var source))
            {
                cards.Add(new MetricCardDto
                {
                    Key = metric.MetricID.ToString(),
                    Title = metric.MetricName,
                    IsStale = true
                });
                continue;
            }

            var groupField = await context.CtrlDataSourceFields.AsNoTracking()
                .FirstOrDefaultAsync(f => f.FieldID == metric.GroupFieldID && f.SourceID == source.SourceID, ct);

            var sumField = await context.CtrlDataSourceFields.AsNoTracking()
                .FirstOrDefaultAsync(f => f.FieldID == metric.SumFieldID && f.SourceID == source.SourceID, ct);

            var dateFieldName = await context.CtrlDataSourceFields.AsNoTracking()
                .Where(f => f.SourceID == source.SourceID && f.FieldID == source.DateFieldID)
                .Select(f => f.FieldName)
                .FirstOrDefaultAsync(ct);

            var groups = groupsByMetric.TryGetValue(metric.MetricID, out var g) ? g : new();

            calcTypes.TryGetValue(metric.CalculationTypeID, out var calcType);

            cards.Add(new MetricCardDto
            {
                Key = metric.MetricID.ToString(),
                Title = metric.MetricName,
                Source = source.SourceName,
                SourceObject = $"{source.SchemaName ?? "dbo"}.{source.ObjectName}",
                ValueField = sumField?.FieldName ?? groupField?.FieldName,
                GroupField = groupField?.FieldName,
                GroupFieldLabel = groupField?.DisplayName ?? groupField?.FieldName,
                DateField = dateFieldName,
                SignType = calcType?.SignType,
                // סוג החישוב עצמו כדי שהמסך יזהה COUNT בלי להסתמך על SignType
                CalcType = calcType?.Value,
                Value = groups.Sum(x => x.TotalValue ?? 0).ToString(
                    IsCount(calcType) ? "N0" : "N2",
                    CultureInfo.GetCultureInfo("he-IL")),
                Groups = groups,
                Updated = true,
                IsError = groups.Any(x => x.IsError),
                Icon = metric.IconCode ?? string.Empty,
                IsStale = false
            });
        }

        return cards;
    }

    // סוג החישוב האמיתי נמצא ב-Value; SignType נבדק כגיבוי בלבד
    private static bool IsCount(CtrlCalculationType? calc) =>
        string.Equals((calc?.Value ?? "").Trim(), "COUNT", StringComparison.OrdinalIgnoreCase)
        || string.Equals((calc?.SignType ?? "").Trim(), "COUNT", StringComparison.OrdinalIgnoreCase);

    private async Task<Dictionary<int, List<MetricGroupDto>>> LoadGroupsAsync(
        string? metricName, DateOnly? fromDate, DateOnly? toDate, CancellationToken ct)
    {
        var connection = context.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open) await connection.OpenAsync(ct);

        await using var cmd = connection.CreateCommand();
        cmd.CommandType = CommandType.StoredProcedure;
        cmd.CommandText = "dbo.usp_Metrics_GetActiveMetricsGrouped";
        cmd.CommandTimeout = 60;

        // הפרוצדורה מקבלת טווח תאריכים בלבד; סינון לפי שם הנתון נעשה למטה
        AddParam(cmd, "@FromDate", fromDate?.ToDateTime(TimeOnly.MinValue), DbType.Date);
        AddParam(cmd, "@ToDate",   toDate?.ToDateTime(TimeOnly.MinValue),   DbType.Date);

        // סינון לפי שם — על שם הנתון ב-CTRL_Metrics, או על שם המערכת (Value)
        var needle = string.IsNullOrWhiteSpace(metricName) ? null : metricName.Trim();
        var matchingIds = needle is null
            ? null
            : await context.CtrlMetrics.AsNoTracking()
                .Where(m => m.IsActive && m.MetricName.Contains(needle))
                .Select(m => m.MetricID)
                .ToListAsync(ct);

        var result = new Dictionary<int, List<MetricGroupDto>>();

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var metricId = reader.GetInt32(0);
            var value   = reader.IsDBNull(1) ? string.Empty : Convert.ToString(reader.GetValue(1)) ?? string.Empty;
            var records = reader.IsDBNull(2) ? 0 : Convert.ToInt32(reader.GetValue(2));
            var total   = reader.IsDBNull(3) ? (decimal?)null : Convert.ToDecimal(reader.GetValue(3));

            // הפרוצדורה מסמנת שגיאה בערך עצמו: "[שגיאה: ...]"
            var isError = value.StartsWith("[", StringComparison.Ordinal) && value.Contains("שגיאה");

            if (needle is not null)
            {
                var byName  = matchingIds!.Contains(metricId);
                var byValue = value.Contains(needle, StringComparison.OrdinalIgnoreCase);
                if (!byName && !byValue) continue;
            }

            if (!result.TryGetValue(metricId, out var list))
                result[metricId] = list = new List<MetricGroupDto>();

            list.Add(new MetricGroupDto
            {
                Value      = value,
                Records    = records,
                TotalValue = total,
                IsError    = isError
            });
        }

        return result;
    }

    private static void AddParam(DbCommand cmd, string name, object? value, DbType type, int? size = null)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = name;
        p.DbType = type;
        if (size is int s) p.Size = s;
        p.Value = value ?? DBNull.Value;
        cmd.Parameters.Add(p);
    }
}
