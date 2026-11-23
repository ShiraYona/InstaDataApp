using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Modules.DataDefinitions;
using InstaDataApp.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.DataCatalog.Commands;

/// <summary>
/// עדכון נתון קיים — אותו גוף כמו יצירה, אך מעדכן שורה במקום להוסיף.
/// <para>
/// <c>RowVersion</c> (אופציונלי): אם הלקוח שלח את הערך שנשלף בעת פתיחת הטופס,
/// עדכון של מישהו אחר בינתיים נדחה ב-<see cref="DbUpdateConcurrencyException"/>.
/// </para>
/// מחזיר <c>false</c> אם הנתון לא נמצא — כדי שה-Controller יחזיר 404.
/// </summary>
public record UpdateMetricCommand(int MetricId, MetricDraftDto Draft, byte[]? RowVersion = null) : IRequest<bool>;

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
        // אותו אימות ואותם ערכים קנוניים כמו ביצירה — פעם אחת בלבד
        var canonical = await MetricDraftCheck.ValidateAndCanonicalizeAsync(
            _context, request.Draft, cancellationToken);

        var metric = await _context.CtrlMetrics
            .Include(m => m.DetailFields)
            .FirstOrDefaultAsync(m => m.MetricID == request.MetricId, cancellationToken);

        if (metric is null)
        {
            return false;
        }

        if (request.RowVersion is { Length: > 0 })
        {
            // הערך שנשלף בטופס — EF יבדוק אותו בעדכון ויזרוק DbUpdateConcurrencyException
            // אם השורה השתנתה בינתיים (המתורגם ל-409 ב-CustomExceptionHandler)
            _context.CtrlMetrics.Entry(metric).Property(m => m.RowVersion).OriginalValue = request.RowVersion;
        }

        ApplyDraft(metric, request.Draft, canonical);

        // העדכון ושדות הפירוט (הסרה והוספה) מתבצעים בטרנזקציה אחת —
        // אין מצב שבו השורה עודכנה והפירוט לא, או להיפך.
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }

        return true;
    }

    /// <summary>
    /// מעדכן את שדות השורה. CreatedBy / CreatedDate לא נוגעים;
    /// RowVersion מנוהל על ידי המסד.
    /// </summary>
    private void ApplyDraft(CtrlMetric metric, MetricDraftDto draft, MetricCanonicalValues canonical)
    {
        // מקור ערך יחיד — אין סיכום, קיבוץ ולא פירוט
        var isRows = canonical.IsRows;

        metric.MetricName = draft.Name.Trim();
        metric.SourceID = draft.SourceId;
        metric.CalculationTypeID = canonical.CalculationTypeId;
        metric.SumFieldID = isRows ? draft.SumFieldId : null;
        metric.GroupFieldID = isRows ? draft.GroupFieldId : null;
        // DASHBOARD / מספר הימים של התקופה; null כשנבחר טווח תאריכים מפורש
        metric.DateRangeType = canonical.DateRangeType;
        metric.IconCode = canonical.IconCode;
        metric.IsActive = draft.DisplayInDashboard;
        // null = "לא נשלח עץ סינון" — הטופס שולח אותו בכל שמירה,
        // ואם אין בו תנאים (המשתמש מחק את כולם) נשמר null ומנקה את הישן
        metric.FiltersJson = draft.FiltersJson is null && isRows
            ? metric.FiltersJson
            : canonical.FiltersJson;
        metric.UpdatedBy = _user.Id ?? MetricConstants.FallbackUserName;
        metric.UpdatedDate = _timeProvider.GetLocalNow().DateTime;

        ReplaceDetailFields(metric, isRows ? draft.DetailFieldIds : []);
    }

   
    private static void ReplaceDetailFields(CtrlMetric metric, IEnumerable<int> fieldIds)
    {
        metric.DetailFields.Clear();

        var displayOrder = 1;
        foreach (var fieldId in fieldIds.Distinct())
        {
            metric.DetailFields.Add(new CtrlMetricDetailField
            {
                MetricID = metric.MetricID,
                FieldID = fieldId,
                DisplayOrder = displayOrder++
            });
        }
    }
}
