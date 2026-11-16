using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Modules.DataDefinitions;
using InstaDataApp.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.DataCatalog.Commands;

/// <summary>
/// עדכון נתון קיים — אותו גוף כמו <see cref="CreateMetricCommand"/>, אך מעדכן שורה
/// במקום להוסיף. מחזיר <c>false</c> אם הנתון לא נמצא, כדי שה-Controller יחזיר 404.
/// </summary>
public record UpdateMetricCommand(int MetricId, MetricDraftDto Draft) : IRequest<bool>;

public class UpdateMetricCommandHandler : IRequestHandler<UpdateMetricCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;
    private readonly TimeProvider _timeProvider;

    public UpdateMetricCommandHandler(IApplicationDbContext context, IUser user, TimeProvider timeProvider)
    {
        _context = context;
        _user = user;
        _timeProvider = timeProvider;
    }

    public async Task<bool> Handle(UpdateMetricCommand request, CancellationToken cancellationToken)
    {
        // אותו אימות ואותם ערכים קנוניים כמו ביצירה — לפני שנוגעים במסד
        await MetricDraftCheck.ValidateAsync(_context, request.Draft, cancellationToken);
        var canonical = await MetricDraftCheck.CanonicalizeAsync(_context, request.Draft, cancellationToken);

        var metric = await _context.Metrics
            .Include(m => m.DetailFields)
            .FirstOrDefaultAsync(m => m.MetricID == request.MetricId, cancellationToken);

        if (metric is null)
        {
            return false;
        }

        ApplyDraft(metric, request.Draft, canonical);

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    /// <summary>
    /// מעדכן את שדות השורה. CreatedBy / CreatedDate / RowVersion אינם נוגעים —
    /// שני האחרונים מנוהלים על ידי EF (rowversion) ומשמשים לזיהוי התנגשות עדכון.
    /// </summary>
    private void ApplyDraft(Metric metric, MetricDraftDto draft, MetricCanonicalValues canonical)
    {
        metric.MetricName = draft.Name.Trim();
        metric.SourceID = draft.SourceId;
        metric.CalculationTypeID = canonical.CalculationTypeId;
        metric.SumFieldID = draft.SumFieldId;
        metric.GroupFieldID = draft.GroupFieldId;
        metric.DateRangeType = canonical.DateRangeType;
        metric.IconCode = canonical.IconCode;
        metric.IsActive = draft.DisplayInDashboard;
        metric.UpdatedBy = _user.Id ?? MetricConstants.FallbackUserName;
        metric.UpdatedDate = _timeProvider.GetLocalNow().DateTime;

        ReplaceDetailFields(metric, draft.DetailFieldIds);
    }

    /// <summary>
    /// שדות הפירוט מוחלפים במלואם: המפתח המורכב (MetricID, FieldID) מונע עדכון ערך קיים,
    /// ולכן מסירים את הרשומות הישנות לפני הוספת החדשות — באותה שיחה, בסדר נכון.
    /// </summary>
    private static void ReplaceDetailFields(Metric metric, IEnumerable<int> fieldIds)
    {
        metric.DetailFields.Clear();

        var displayOrder = 1;
        foreach (var fieldId in fieldIds.Distinct())
        {
            metric.DetailFields.Add(new MetricDetailField
            {
                MetricID = metric.MetricID,
                FieldID = fieldId,
                DisplayOrder = displayOrder++
            });
        }
    }
}
