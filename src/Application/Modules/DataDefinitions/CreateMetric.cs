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
        // האימות והערכים הקנוניים — לפני שנוגעים במסד
        await MetricDraftCheck.ValidateAsync(_context, request.Draft, cancellationToken);
        var canonical = await MetricDraftCheck.CanonicalizeAsync(_context, request.Draft, cancellationToken);

        var metric = BuildMetric(request.Draft, canonical);

        _context.Metrics.Add(metric);
        await _context.SaveChangesAsync(cancellationToken);

        return metric.MetricID;
    }

    /// <summary>בונה את שורת CTRL_Metrics יחד עם שדות הפירוט שלה</summary>
    private Metric BuildMetric(MetricDraftDto draft, MetricCanonicalValues canonical)
    {
        return new Metric
        {
            MetricName = draft.Name.Trim(),
            SourceID = draft.SourceId,
            CalculationTypeID = canonical.CalculationTypeId,
            SumFieldID = draft.SumFieldId,
            GroupFieldID = draft.GroupFieldId,
            // נשמר טקסט התקופה כפי שהוא מוצג למשתמש (CTRL_CalculationDays.Name)
            DateRangeType = canonical.DateRangeType,
            IconCode = canonical.IconCode,
            // "הצגת הנתון במערכת הניהול והבקרה" — כיבוי משמעו שמירה מוסתרת
            IsActive = draft.DisplayInDashboard,
            // עד שיהיה מנגנון התחברות — נכתב "USER" קבוע; כאן יוחלף במזהה המשתמש המחובר
            CreatedBy = _user.Id ?? MetricConstants.FallbackUserName,
            CreatedDate = _timeProvider.GetLocalNow().DateTime,
            DetailFields = BuildDetailFields(draft.DetailFieldIds)
        };
    }

    /// <summary>שדות הפירוט לפי סדר התצוגה — בלי כפילויות</summary>
    private static List<MetricDetailField> BuildDetailFields(IEnumerable<int> fieldIds) =>
        fieldIds
            .Distinct()
            .Select((fieldId, index) => new MetricDetailField
            {
                FieldID = fieldId,
                DisplayOrder = index + 1
            })
            .ToList();
}
