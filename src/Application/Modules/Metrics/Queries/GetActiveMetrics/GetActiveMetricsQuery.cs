using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Data.Common;
using System.Globalization;

namespace InstaDataApp.Application.Modules.Metrics.Queries.GetActiveMetrics;

public record GetActiveMetricsQuery(string? MetricName = null, int? Days = null)
    : IRequest<List<MetricCardDto>>;

public class GetActiveMetricsQueryHandler(IApplicationDbContext context, ILogger<GetActiveMetricsQueryHandler> logger)
    : IRequestHandler<GetActiveMetricsQuery, List<MetricCardDto>>
{
    public async Task<List<MetricCardDto>> Handle(GetActiveMetricsQuery request, CancellationToken ct)
    {
        var metrics = await context.CtrlMetrics.AsNoTracking()
            .Where(m => m.IsActive)
            .ToListAsync(ct);
var calcTypes = await context.CtrlCalculationTypes.AsNoTracking()
    .ToDictionaryAsync(c => c.ID, ct);

        var sources = await context.CtrlDataSources.AsNoTracking()
            .ToDictionaryAsync(s => s.SourceID, ct);

        Dictionary<int, List<MetricGroupDto>> groupsByMetric;
        try
        {
            groupsByMetric = await LoadGroupsAsync(request.MetricName, request.Days, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "טעינת הקבוצות נכשלה");
            groupsByMetric = new();
        }

        var cards = new List<MetricCardDto>(metrics.Count);

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
                Value = groups.Sum(x => x.TotalValue ?? 0).ToString("N2", CultureInfo.GetCultureInfo("he-IL")),
                Groups = groups,
                Updated = true,
                SignType = calcTypes.TryGetValue(metric.CalculationTypeID, out var calcType)
                    ? calcType.SignType
                    : null,
                Icon = metric.IconCode ?? string.Empty,
                IsStale = false
            });
        }

        return cards;
    }

    private async Task<Dictionary<int, List<MetricGroupDto>>> LoadGroupsAsync(
        string? metricName, int? days, CancellationToken ct)
    {
        var connection = context.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open) await connection.OpenAsync(ct);

        await using var cmd = connection.CreateCommand();
        cmd.CommandType = CommandType.StoredProcedure;
        cmd.CommandText = "dbo.usp_Metrics_GetActiveMetricsGrouped";
        cmd.CommandTimeout = 120;

        AddParam(cmd, "@MetricName", string.IsNullOrWhiteSpace(metricName) ? null : metricName,
            DbType.String, 80);
        AddParam(cmd, "@Days", days, DbType.Int32);

        var result = new Dictionary<int, List<MetricGroupDto>>();

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        var metricIdOrdinal = reader.GetOrdinal("MetricID");
        var valueOrdinal    = reader.GetOrdinal("Value");
        var recordsOrdinal  = reader.GetOrdinal("Records");
        var totalOrdinal    = reader.GetOrdinal("TotalValue");

        while (await reader.ReadAsync(ct))
        {
            var id = reader.GetInt32(metricIdOrdinal);
            if (!result.TryGetValue(id, out var list))
                result[id] = list = new List<MetricGroupDto>();

            list.Add(new MetricGroupDto
            {
                Value = reader.IsDBNull(valueOrdinal) ? "" : reader.GetValue(valueOrdinal)?.ToString() ?? "",
                Records = reader.IsDBNull(recordsOrdinal) ? 0 : (int)Convert.ToInt64(reader.GetValue(recordsOrdinal)),
                TotalValue = reader.IsDBNull(totalOrdinal) ? null : Convert.ToDecimal(reader.GetValue(totalOrdinal))
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
