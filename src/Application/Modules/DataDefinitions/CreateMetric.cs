using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Domain.Entities;

namespace InstaDataApp.Application.Modules.DataDefinitions;


public record CreateMetricCommand(MetricDraftDto Draft) : IRequest<int>;

public class CreateMetricCommandHandler : IRequestHandler<CreateMetricCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;
    private readonly TimeProvider _timeProvider;

    public CreateMetricCommandHandler(IApplicationDbContext context, IUser user, TimeProvider timeProvider)
    {
        _context = context;
        _user = user;
        _timeProvider = timeProvider;
    }

    public async Task<int> Handle(CreateMetricCommand request, CancellationToken cancellationToken)
    {
        // אימות אחד שמחזיר גם את הערכים הקנוניים — בלי שאילתה כפולה לפני השמירה
        var canonical = await MetricDraftCheck.ValidateAndCanonicalizeAsync(
            _context, request.Draft, cancellationToken);

        var metric = BuildMetric(request.Draft, canonical);

        // שמירה אטומית: שורת CTRL_Metrics ושדות הפירוט נשמרים יחד או לא נשמרים כלל.
        // EF עוטף SaveChanges בטרנזקציה משלו, אך כאן נדרש גבול מפורש שאפשר לגלגל לאחור —
        // כדי שכשל באחד השלבים לא יותיר הגדרת נתון חלקית.
        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            _context.CtrlMetrics.Add(metric);
            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }

        return metric.MetricID;
    }

    /// <summary>בונה את שורת CTRL_Metrics; שדות הפירוט נשמרים בשורה נפרדת בסיום</summary>
    private CtrlMetric BuildMetric(MetricDraftDto draft, MetricCanonicalValues canonical)
    {
        // מקור ערך יחיד — אין סיכום, קיבוץ ולא פירוט
        var isRows = canonical.IsRows;

        var metric = new CtrlMetric
        {
            MetricName = draft.Name.Trim(),
            SourceID = draft.SourceId,
            CalculationTypeID = canonical.CalculationTypeId,
            SumFieldID = isRows ? draft.SumFieldId : null,
            GroupFieldID = isRows ? draft.GroupFieldId : null,
            // DASHBOARD או מספר הימים של התקופה; null כשנבחר טווח תאריכים —
            // לעמודה אין מקום לשני השדות, והטווח נגזר בזמן החישוב מהתקופה של הלוח
            DateRangeType = canonical.DateRangeType,
            IconCode = canonical.IconCode,
            // "הצגת הנתון במערכת הניהול והבקרה" — כיבוי משמעו שמירה מוסתרת
            IsActive = draft.DisplayInDashboard,
            // עץ תנאי הסינון כפי שנשלח, אחרי בדיקת השדות והשמטת ערכים ריקים
            FiltersJson = canonical.FiltersJson,
            // עד שיהיה מנגנון התחברות — נכתב "USER" קבוע; כאן יוחלף במזהה המשתמש המחובר
            CreatedBy = _user.Id ?? MetricConstants.FallbackUserName,
            CreatedDate = _timeProvider.GetLocalNow().DateTime
        };

        // המזהה של המדד מתקבל מהמסד רק לאחר השמירה — הקישור נעשה ב-SaveChanges
        metric.DetailFields = isRows ? BuildDetailFields(draft.DetailFieldIds) : [];
        return metric;
    }

    /// <summary>שדות הפירוט לפי סדר התצוגה — בלי כפילויות</summary>
    private static List<CtrlMetricDetailField> BuildDetailFields(IEnumerable<int> fieldIds) =>
        fieldIds
            .Distinct()
            .Select((fieldId, index) => new CtrlMetricDetailField
            {
                FieldID = fieldId,
                DisplayOrder = index + 1
            })
            .ToList();
}
