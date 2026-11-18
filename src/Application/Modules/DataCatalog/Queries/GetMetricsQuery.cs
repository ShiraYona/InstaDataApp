using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Modules.DataDefinitions;
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
    /// או DASHBOARD. העריכה מחזירה זאת כי הטופס שולח את ה-Value, לא את ה-Name.
    /// <c>null</c> = למדד הוגדר טווח תאריכים מפורש.
    /// </summary>
    string? DateRangeValue,
    /// <summary>
    /// חתימת הגרסה (RowVersion) — נשלחת חזרה בעדכון כדי לזהות התנגשות עדכון.
    /// מוצגת כ-Base64.
    /// </summary>
    string? RowVersion,
    /// <summary>עץ תנאי הסינון שנשמר (JSON) — נטען חזרה לטופס העריכה</summary>
    string? FiltersJson);

public class GetMetricsQueryHandler : IRequestHandler<GetMetricsQuery, List<MetricListItemDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMetricsQueryHandler(IApplicationDbContext context) => _context = context;


    public async Task<List<MetricListItemDto>> Handle(GetMetricsQuery request, CancellationToken cancellationToken)
    {
        var rows = await (from m in _context.CtrlMetrics.AsNoTracking()
                          join t in _context.CtrlCalculationTypes.AsNoTracking()
                              on m.CalculationTypeID equals t.ID into calcTypes
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
        var detailFieldIdsByMetric = (await _context.CtrlMetricDetailFields.AsNoTracking()
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
               // ResolveDateRangeValue(row.Metric.DateRangeType, dateRangeValues),
              //  row.Metric.RowVersion.Length == 0 ? null : Convert.ToBase64String(row.Metric.RowVersion),
              //  row.Metric.FiltersJson))
            .ToList();
    }

    /// <summary>
    /// הטופס עובד עם ה-Value של התקופה ("30" / "7" / "90"). במסד נשמר ה-Name
    /// ("30 ימים") או BOARD_FILTER, ולכן ממירים חזרה ל-Value.
    /// ערך ריק או null פירושו "לפי מסנן הלוח"; ערך מספרי ישן מוחזר כמו שהוא.
    /// </summary>
    private static string ToDateRangeValue(string? stored)

    //private static string? ResolveDateRangeValue(
    //    string? stored,
    //    IReadOnlyDictionary<string, string> dateRangeValues)
    {
        return string.IsNullOrWhiteSpace(stored)
            ? MetricConstants.DateRangeBoardFilter
            : stored.Trim();
       // if (string.IsNullOrWhiteSpace(stored))
        //{
        //    return null;
       //}

        // ערך ישן (BOARD_FILTER) מוחזר כ-DASHBOARD כדי שהטופס יבחר את אותה אפשרות
      //  if (MetricConstants.IsDashboard(stored))
       // {
       //     return MetricConstants.DateRangeDashboard;
      //  }

       // if (dateRangeValues.TryGetValue(stored, out var value))
       // {
       //     return value;
       // }

       // var trimmed = stored.Trim();

        // נתונים ישנים: "7" / "30" / "90" נשמרו כמספר, והם כבר ה-Value
        //return int.TryParse(trimmed, out _) ? trimmed : null;
    }
}
