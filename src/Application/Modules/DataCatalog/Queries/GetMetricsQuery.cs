using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Modules.DataDefinitions;
using InstaDataApp.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.DataCatalog.Queries;

public record GetMetricsQuery : IRequest<List<MetricListItemDto>>;

/// <summary>רשומת נתון לתצוגת מסך ניהול הנתונים.</summary>
public record MetricListItemDto(
    int MetricId,
    string MetricName,
    int SourceId,
    int CalculationTypeId,
    string? CalculationType,
    int? SumFieldId,
    int? GroupFieldId,
    string? DateRangeType,
    string? IconCode,
    bool IsActive,
    /// <summary>שדות הפירוט לפי סדר התצוגה — נדרשים למילוי הטופס בעריכה</summary>
    List<int> DetailFieldIds,
    /// <summary>
    /// מספר הימים כפי שהוא מוצג ברשימת הטופס (Value של CTRL_CalculationDays),
    /// או BOARD_FILTER. העריכה מחזירה זאת כי הטופס שולח את ה-Value, לא את ה-Name.
    /// </summary>
    string? DateRangeValue);

public class GetMetricsQueryHandler : IRequestHandler<GetMetricsQuery, List<MetricListItemDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMetricsQueryHandler(IApplicationDbContext context) => _context = context;

    /// <summary>
    /// שליפת כל הנתונים. סוג החישוב נטען מ-CTRL_CalculationTypes
    /// באמצעות LEFT JOIN — נתון עם CalculationTypeID שאינו קיים עדיין
    /// לא ייעלם מהרשימה, רק יגיע בלי סוג.
    /// מחזיר DTO ולא את הישות, כדי לא לחשוף את שדות ה-navigation וה-RowVersion.
    /// שדות הפירוט נטענים בהטרמה, לפי DisplayOrder — כדי שטופס העריכה ימלא אותם.
    /// </summary>
    public async Task<List<MetricListItemDto>> Handle(GetMetricsQuery request, CancellationToken cancellationToken)
    {
        var rows = await (from m in _context.Metrics.AsNoTracking()
                          join t in _context.CalculationTypes.AsNoTracking()
                              on m.CalculationTypeID equals t.Id into calcTypes
                          from t in calcTypes.DefaultIfEmpty()
                          orderby m.MetricID descending
                          select new
                          {
                              Metric = m,
                              CalculationTypeName = t == null ? null : t.Name
                          })
            .ToListAsync(cancellationToken);

        var metricIds = rows.Select(row => row.Metric.MetricID).ToList();

        // DetailFields.ID נטען עם אילוץ המפתח הזר — כאן רק המזהים והסדר
        var detailFieldIdsByMetric = (await _context.MetricDetailFields.AsNoTracking()
                .Where(detail => metricIds.Contains(detail.MetricID))
                .OrderBy(detail => detail.DisplayOrder)
                .Select(detail => new { detail.MetricID, detail.FieldID })
                .ToListAsync(cancellationToken))
            .GroupBy(detail => detail.MetricID)
            .ToDictionary(group => group.Key, group => group.Select(detail => detail.FieldID).ToList());

        // הנחת יסוד: העמודה שומרת מספר ימים (INT); null = "לפי מסנן הלוח"
        return rows
            .Select(row => new MetricListItemDto(
                row.Metric.MetricID,
                row.Metric.MetricName,
                row.Metric.SourceID,
                row.Metric.CalculationTypeID,
                row.CalculationTypeName,
                row.Metric.SumFieldID,
                row.Metric.GroupFieldID,
                ToDateRangeValue(row.Metric.DateRangeType),
                row.Metric.IconCode,
                row.Metric.IsActive,
                detailFieldIdsByMetric.GetValueOrDefault(row.Metric.MetricID) ?? [],
                ToDateRangeValue(row.Metric.DateRangeType)))
            .ToList();
    }

    /// <summary>
    /// הטופס עובד עם ה-Value של התקופה ("30" / "7" / "90"). במסד נשמר ה-Name
    /// ("30 ימים") או BOARD_FILTER, ולכן ממירים חזרה ל-Value.
    /// ערך ריק או null פירושו "לפי מסנן הלוח"; ערך מספרי ישן מוחזר כמו שהוא.
    /// </summary>
    private static string ToDateRangeValue(string? stored)
    {
        return string.IsNullOrWhiteSpace(stored)
            ? MetricConstants.DateRangeBoardFilter
            : stored.Trim();
    }
}
