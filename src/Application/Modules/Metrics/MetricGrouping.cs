using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.Metrics;
/// <param name="Column">שם העמודה המפורש (FieldName)</param>
/// <param name="Label">כיתוב לתצוגה (DisplayName, ואם אין — FieldName)</param>
public sealed record GroupColumn(string Column, string Label);

public static class MetricGrouping
{
    public static async Task<GroupColumn?> ResolveGroupColumnAsync(
        IApplicationDbContext context, CtrlMetric metric, CancellationToken ct)
    {
        if (metric.GroupFieldID is not int groupFieldId)
        {
            return null;
        }

        var field = await context.CtrlDataSourceFields.AsNoTracking()
            .FirstOrDefaultAsync(f => f.FieldID == groupFieldId && f.SourceID == metric.SourceID, ct);

        if (field is null || string.IsNullOrWhiteSpace(field.FieldName))
        {
            return null;
        }

        var label = string.IsNullOrWhiteSpace(field.DisplayName) ? field.FieldName : field.DisplayName!;
        return new GroupColumn(field.FieldName, label);
    }
    public static bool Matches(this GroupColumn? column, string? value) =>
        column is not null && !string.IsNullOrWhiteSpace(value);
}
