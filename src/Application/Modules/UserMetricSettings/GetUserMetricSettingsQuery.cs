using InstaDataApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.UserMetricSettings;

/// <summary>
/// שליפת הכרטיסים של המשתמש הנוכחי, ממוינים:
/// 1) מה שהמשתמש סידר אישית (DisplayOrder) — לפי DisplayOrder עולה.
/// 2) נתונים חדשים או כאלה שעדיין לא הותאמו — לפי CreatedDate יורד, ואז MetricId יורד.
/// </summary>
public record GetUserMetricSettingsQuery(string UserId) : IRequest<MetricSettingsDto>;

public class GetUserMetricSettingsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetUserMetricSettingsQuery, MetricSettingsDto>
{
    public async Task<MetricSettingsDto> Handle(
        GetUserMetricSettingsQuery request, CancellationToken ct)
    {
        // 1. כל הנתונים הפעילים — עדיין לא ממוינים.
        var metrics = await db.Metrics
            .AsNoTracking()
            .Where(m => m.IsActive)
            .Select(m => new
            {
                m.MetricID,
                m.MetricName,
                m.IconCode,
                m.CreatedDate,
            })
            .ToListAsync(ct);

        // 2. הגדרות אישיות של המשתמש הזה בלבד.
        var userSettings = await db.UserMetricSettings
            .AsNoTracking()
            .Where(x => x.UserId == request.UserId)
            .ToDictionaryAsync(
                x => x.MetricId,
                x => new { x.DisplayOrder, x.IsVisible },
                ct);

        // 3. מיזוג + מיון.
        var items = metrics
            .Select(m =>
            {
                userSettings.TryGetValue(m.MetricID, out var s);
                return new
                {
                    m.MetricID,
                    m.MetricName,
                    m.IconCode,
                    m.CreatedDate,
                    DisplayOrder = s?.DisplayOrder,
                    // ברירת מחדל: נתון חדש / לא הותאם — מוצג.
                    IsVisible = s?.IsVisible ?? true,
                };
            })
            .OrderBy(x => x.DisplayOrder.HasValue ? 0 : 1)   // מסודרים קודם
            .ThenBy(x => x.DisplayOrder ?? int.MaxValue)      // לפי מיקום אישי
            .ThenByDescending(x => x.CreatedDate)             // חדשים — תאריך יורד
            .ThenByDescending(x => x.MetricID)                // שובר שוויון
            .Select(x => new MetricSettingsItemDto(
                x.MetricID,
                x.MetricName,
                x.IconCode,
                x.DisplayOrder,
                x.IsVisible))
            .ToList();

        return new MetricSettingsDto(items);
    }
}
