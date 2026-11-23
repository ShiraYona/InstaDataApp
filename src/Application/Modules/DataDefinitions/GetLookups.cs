using InstaDataApp.Application.Common.Interfaces;

namespace InstaDataApp.Application.Modules.DataDefinitions;

public record GetCardIconsQuery : IRequest<List<LookupOptionDto>>;

public class GetCardIconsQueryHandler : IRequestHandler<GetCardIconsQuery, List<LookupOptionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCardIconsQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<List<LookupOptionDto>> Handle(GetCardIconsQuery request, CancellationToken cancellationToken)
    {
        return await _context.CardIcons
            .OrderBy(icon => icon.ID)
            .Select(icon => new LookupOptionDto
            {
                Value = icon.Name,
                Label = icon.Value,
                Icon = icon.IconClass
            })
            .ToListAsync(cancellationToken);
    }
}

public record GetDateRangeTypesQuery : IRequest<List<LookupOptionDto>>;

public class GetDateRangeTypesQueryHandler : IRequestHandler<GetDateRangeTypesQuery, List<LookupOptionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetDateRangeTypesQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<List<LookupOptionDto>> Handle(GetDateRangeTypesQuery request, CancellationToken cancellationToken)
    {
        var days = await _context.CalculationDays
            .OrderBy(period => period.Value)
            .Select(period => new LookupOptionDto
            {
                // מספר הימים כמחרוזת — זה הערך שנשמר במדד ונשלח חזרה בטופס
                Value = period.Value.ToString(),
                Label = period.Name
            })
            .ToListAsync(cancellationToken);

        // "לפי מסנן הלוח" — אפשרות שאינה במסד, בראש הרשימה (ברירת המחדל)
        days.Insert(0, new LookupOptionDto
        {
            Value = MetricConstants.DateRangeBoardFilter,
            Label = MetricConstants.DateRangeBoardFilterLabel
        });

        return days;
    }
}

public record GetCalculationTypesQuery : IRequest<List<LookupOptionDto>>;

public class GetCalculationTypesQueryHandler : IRequestHandler<GetCalculationTypesQuery, List<LookupOptionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCalculationTypesQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<List<LookupOptionDto>> Handle(
        GetCalculationTypesQuery request,
        CancellationToken cancellationToken)
    {
        var types = await _context.CalculationTypes
            .OrderBy(type => type.Id)
.Select(type => new LookupOptionDto
{
    Value = type.Id.ToString(),
    Label = type.Name + " (" + type.Value + ")",
    // אותו זיהוי של CalculationTypeMap.ToCode, כדי שהלקוח לא יפענח תוויות
    IsSum = type.Name.Trim().StartsWith("סכימ", StringComparison.Ordinal)
            || type.Value.Trim().Equals("SUM", StringComparison.OrdinalIgnoreCase)
})
            .ToListAsync(cancellationToken);

        return types;
    }
}

public static class CalculationTypeMap
{
    /// <summary>הופך את ה-Name מהקטלוג לקוד קנוני, לפי שם או לפי תווית</summary>
    public static string ToCode(string? name)
    {
        var normalized = (name ?? string.Empty).Trim();

        if (normalized.StartsWith("ספיר", StringComparison.Ordinal))
        {
            return MetricConstants.CalculationCount;
        }

        if (normalized.StartsWith("סכימ", StringComparison.Ordinal))
        {
            return MetricConstants.CalculationSum;
        }

        if (normalized.StartsWith("ערך ישיר", StringComparison.Ordinal))
        {
            return MetricConstants.CalculationDirect;
        }

        // ברירת מחדל: אם ה-Name הוא כבר קוד — הוא נשאר; אחרת DIRECT (בטוח)
        return MetricConstants.CalculationTypes.Contains(normalized)
            ? normalized
            : MetricConstants.CalculationDirect;
    }
}
