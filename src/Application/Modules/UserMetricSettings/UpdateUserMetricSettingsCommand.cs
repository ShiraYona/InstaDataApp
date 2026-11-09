using InstaDataApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.UserMetricSettings;

/// <summary>
/// שמירת סדר הכרטיסים ומצב ההצגה של המשתמש.
/// כל פריט שמגיע — נכתב (upsert) לטבלת CTRL_UserMetricSettings.
/// </summary>
public record UpdateUserMetricSettingsCommand(
    string UserId,
    IReadOnlyList<MetricSettingsItemDto> Items) : IRequest;

public class UpdateUserMetricSettingsCommandHandler(
    IApplicationDbContext db,
    TimeProvider time)
    : IRequestHandler<UpdateUserMetricSettingsCommand>
{
    public async Task Handle(UpdateUserMetricSettingsCommand request, CancellationToken ct)
    {
        // 1. ולידציה: אין מזהים כפולים.
        var duplicate = request.Items
            .GroupBy(x => x.MetricId)
            .Any(g => g.Count() > 1);
        if (duplicate)
        {
            throw new ArgumentException("רשימת הכרטיסים מכילה מזהה נתון כפול.");
        }

        // 2. שליפת השורות הקיימות של המשתמש הזה בלבד.
        var existing = await db.UserMetricSettings
            .Where(x => x.UserId == request.UserId)
            .ToDictionaryAsync(x => x.MetricId, ct);

        var now = time.GetUtcNow().UtcDateTime;

        // 3. upsert לכל פריט.
        foreach (var item in request.Items)
        {
            if (item.DisplayOrder is <= 0)
            {
                throw new ArgumentException(
                    $"DisplayOrder של נתון {item.MetricId} חייב להיות חיובי או null.");
            }

            if (existing.TryGetValue(item.MetricId, out var row))
            {
                row.DisplayOrder = item.DisplayOrder;
                row.IsVisible = item.IsVisible;
                row.UpdatedDate = now;
            }
            else
            {
                db.UserMetricSettings.Add(new Domain.Entities.UserMetricSetting
                {
                    UserId = request.UserId,
                    MetricId = item.MetricId,
                    DisplayOrder = item.DisplayOrder,
                    IsVisible = item.IsVisible,
                    UpdatedDate = now,
                });
            }
        }

        // 4. שמירה אחת בסוף — לא בתוך הלולאה.
        await db.SaveChangesAsync(ct);
    }
}
