using FluentValidation.Results;
using InstaDataApp.Application.Common.Exceptions;
using InstaDataApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ValidationException = InstaDataApp.Application.Common.Exceptions.ValidationException;



namespace InstaDataApp.Application.Modules.UserMetricSettings;

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
        // 1. ולידציות על הרשימה עצמה — לפני כל גישה ל-DB.
        var failures = new List<ValidationFailure>();

        if (request.Items.GroupBy(x => x.MetricId).Any(g => g.Count() > 1))
        {
            failures.Add(new ValidationFailure(
                nameof(request.Items), "רשימת הכרטיסים מכילה מזהה נתון כפול."));
        }

        var badOrder = request.Items
            .Where(x => x.DisplayOrder is <= 0)
            .Select(x => x.MetricId)
            .ToList();
        if (badOrder.Count > 0)
        {
            failures.Add(new ValidationFailure(
                nameof(request.Items),
                $"DisplayOrder חייב להיות חיובי או null. נתונים שגויים: {string.Join(", ", badOrder)}."));
        }

        // 2. אימות מול הקטלוג: כל MetricId חייב להיות קיים ופעיל.
        var requestedIds = request.Items.Select(x => x.MetricId).ToList();

        var validIds = await db.Metrics
            .AsNoTracking()
            .Where(m => m.IsActive && requestedIds.Contains(m.MetricId))
            .Select(m => m.MetricId)
            .ToListAsync(ct);

        var invalidIds = requestedIds.Except(validIds).ToList();
        if (invalidIds.Count > 0)
        {
            failures.Add(new ValidationFailure(
                nameof(request.Items),
                $"הנתונים הבאים אינם קיימים או אינם פעילים: {string.Join(", ", invalidIds)}."));
        }

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }

        // 3. שליפת השורות הקיימות של המשתמש הזה בלבד.
        var existing = await db.UserMetricSettings
            .Where(x => x.UserId == request.UserId)
            .ToDictionaryAsync(x => x.MetricId, ct);

        var now = time.GetUtcNow().UtcDateTime;

        // 4. upsert לכל פריט — הנתונים כבר אומתו, אין כאן זריקות.
        foreach (var item in request.Items)
        {
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

        // 5. שמירה אחת בסוף — לא בתוך הלולאה.
        await db.SaveChangesAsync(ct);
    }
}
