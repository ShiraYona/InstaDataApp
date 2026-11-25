using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Common.Models;
using InstaDataApp.Application.Modules.DataDefinitions;
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
        Dictionary<int, int?>? userOrder = null;
        List<int>? visibleMetricIds = null;
        if (!string.IsNullOrWhiteSpace(request.UserId))
        {
            var settings = await context.UserMetricSettings
                .AsNoTracking()
                .Where(x => x.UserId == request.UserId && x.IsVisible)
                .Select(x => new { x.MetricId, x.DisplayOrder })
                .ToListAsync(ct);

            userOrder = settings.ToDictionary(x => x.MetricId, x => x.DisplayOrder);
            visibleMetricIds = settings.Select(x => x.MetricId).ToList();
        }

        var query = context.CtrlMetrics.AsNoTracking().Where(m => m.IsActive);
        if (visibleMetricIds is not null)
            query = query.Where(m => visibleMetricIds.Contains(m.MetricID));

        var metrics = await query.ToListAsync(ct);

        if (userOrder is not null)
        {
            metrics = metrics
                .OrderBy(m => userOrder.TryGetValue(m.MetricID, out var o) && o.HasValue ? 0 : 1)
                .ThenBy(m => userOrder.TryGetValue(m.MetricID, out var o2) ? (o2 ?? int.MaxValue) : int.MaxValue)
                .ThenBy(m => m.MetricID)
                .ToList();
        }

        var calcTypes = await context.CtrlCalculationTypes.AsNoTracking()
            .ToDictionaryAsync(c => c.ID, ct);

        var sources = await context.CtrlDataSources.AsNoTracking()
            .ToDictionaryAsync(s => s.SourceID, ct);

        var today = DateOnly.FromDateTime(DateTime.Today);
        var fromDate = request.FromDate;
        var toDate = request.ToDate;

        // אין טווח = ריענון → כל כרטיס לפי ברירת המחדל שלו
        var isRefresh = fromDate is null && toDate is null;

        var rangeByMetric = new Dictionary<int, (DateOnly? From, DateOnly To)>();
        foreach (var metric in metrics)
        {
            var range = isRefresh
                ? ResolveMetricDefaultRange(metric.DateRangeType, today)
                : ResolveMetricRange(metric.DateRangeType, fromDate, toDate ?? today, today);
            rangeByMetric[metric.MetricID] = range;
        }

        var groupsByMetric = new Dictionary<int, List<MetricGroupDto>>();
        var uniqueRanges = rangeByMetric.Values.Distinct().ToList();

        foreach (var range in uniqueRanges)
        {
            try
            {
                var metricIdsInRange = rangeByMetric
                    .Where(kv => kv.Value == range)
                    .Select(kv => kv.Key)
                    .ToHashSet();

                var loaded = await LoadGroupsAsync(request.MetricName, range.From, range.To, ct);
                foreach (var kv in loaded)
                {
                    if (metricIdsInRange.Contains(kv.Key))
                        groupsByMetric[kv.Key] = kv.Value;
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "טעינת הקבוצות נכשלה עבור טווח {From}–{To}", range.From, range.To);
            }
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
                CalcType = calcType?.Value,
                Value = FormatValue(groups.Sum(x => x.TotalValue ?? 0), calcType),
                Groups = groups,
                Updated = true,
                IsError = groups.Any(x => x.IsError),
                Icon = metric.IconCode ?? string.Empty,
                IsStale = false
            });
        }

        return cards;
    }


    private static (DateOnly? From, DateOnly To) ResolveMetricRange(
        string? dateRangeType, DateOnly? dashboardFrom, DateOnly dashboardTo, DateOnly today)
    {
        // NULL / ריק / DASHBOARD / BOARD_FILTER → טווח הלוח (סעיף 6.2.4.4)
        if (string.IsNullOrWhiteSpace(dateRangeType) || MetricConstants.IsDashboard(dateRangeType))
        {
            return (dashboardFrom ?? today.AddDays(-29), dashboardTo);
        }

        if (MetricConstants.TryGetPeriodDays(dateRangeType, out var days))
        {
            return (today.AddDays(-(days - 1)), today);
        }

        var upper = dateRangeType.Trim().ToUpperInvariant();
        switch (upper)
        {
            case MetricConstants.DateRangeCurrentMonth:
                return (new DateOnly(today.Year, today.Month, 1), today);
            case MetricConstants.DateRangeQuarter:
                var quarterStartMonth = ((today.Month - 1) / 3) * 3 + 1;
                return (new DateOnly(today.Year, quarterStartMonth, 1), today);
            case MetricConstants.DateRangeYear:
                return (new DateOnly(today.Year, 1, 1), today);
            default:
                return (dashboardFrom ?? today.AddDays(-29), dashboardTo); // ערך לא מוכר — כמו לוח
        }
    }

private static (DateOnly? From, DateOnly To) ResolveMetricDefaultRange(
    string? dateRangeType, DateOnly today)
{
    if (string.IsNullOrWhiteSpace(dateRangeType) || MetricConstants.IsDashboard(dateRangeType))
        return (today.AddDays(-29), today);

    if (MetricConstants.TryGetPeriodDays(dateRangeType, out var days))
        return (today.AddDays(-(days - 1)), today);

    var upper = dateRangeType.Trim().ToUpperInvariant();
    switch (upper)
    {
        case MetricConstants.DateRangeCurrentMonth:
            return (new DateOnly(today.Year, today.Month, 1), today);
        case MetricConstants.DateRangeQuarter:
            var q = ((today.Month - 1) / 3) * 3 + 1;
            return (new DateOnly(today.Year, q, 1), today);
        case MetricConstants.DateRangeYear:
            return (new DateOnly(today.Year, 1, 1), today);
        default:
            return (today.AddDays(-29), today);
    }
}

    private static bool IsCount(CtrlCalculationType? calc) =>
        string.Equals((calc?.Value ?? "").Trim(), "COUNT", StringComparison.OrdinalIgnoreCase)
        || string.Equals((calc?.SignType ?? "").Trim(), "COUNT", StringComparison.OrdinalIgnoreCase);

    private static string FormatValue(decimal value, CtrlCalculationType? calc) =>
        value.ToString(IsCount(calc) ? "N0" : "0.##", CultureInfo.GetCultureInfo("he-IL"));

    private async Task<Dictionary<int, List<MetricGroupDto>>> LoadGroupsAsync(
        string? metricName, DateOnly? fromDate, DateOnly? toDate, CancellationToken ct)
    {
        var connection = context.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open) await connection.OpenAsync(ct);

        await using var cmd = connection.CreateCommand();
        cmd.CommandType = CommandType.StoredProcedure;
        cmd.CommandText = "dbo.usp_Metrics_GetActiveMetricsGrouped";
        cmd.CommandTimeout = 60;

        AddParam(cmd, "@FromDate", fromDate?.ToDateTime(TimeOnly.MinValue), DbType.Date);
        AddParam(cmd, "@ToDate",   toDate?.ToDateTime(TimeOnly.MinValue),   DbType.Date);

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
