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
                // מחלקת האייקון היא הערך שנשמר ב-IconCode, והמילה לצידו היא התווית
                Value = icon.IconClass,
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
        return await _context.CalculationDays
            .OrderBy(period => period.Value)
            .Select(period => new LookupOptionDto
            {
                // מספר הימים כמחרוזת — זה הערך שנשמר במדד ונשלח חזרה בטופס
                Value = period.Value.ToString(),
                Label = period.Name
            })
            .ToListAsync(cancellationToken);
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

        // הקוד הקנוני (COUNT / SUM / DIRECT) נקבע כאן, כדי שהלקוח לא יסיק אותו מהתווית.
        return types
            .Select(type =>
            {
                var code = CalculationTypeMap.ToCode(type);
                return new LookupOptionDto
                {
                    Value = type.ID.ToString(),
                    Label = type.Name + " (" + type.Value + ")",
                    Code = code,
                    RequiresSumField = code == MetricConstants.CalculationSum
                };
            })
            .ToList();
    }
}

public static class CalculationTypeMap
{
    /// <summary>
    /// הופך שורת CTRL_CalculationTypes לקוד קנוני. העמודה Value היא המקור (COUNT / SUM),
    /// כפי שקוראים אותה גם הפרוצדורות ו-GetMetricDetails; ה-Name בעברית הוא גיבוי בלבד.
    /// </summary>
    public static string ToCode(Domain.Entities.CtrlCalculationType type)
    {
        var fromValue = Normalize(type.Value);
        if (fromValue is not null)
        {
            return fromValue;
        }

        return Normalize(type.Name) ?? MetricConstants.CalculationDirect;
    }

    private static string? Normalize(string? raw)
    {
        var normalized = (raw ?? string.Empty).Trim();

        if (MetricConstants.CalculationTypes.Contains(normalized, StringComparer.OrdinalIgnoreCase))
        {
            return normalized.ToUpperInvariant();
        }

        if (normalized.Contains("סכימ", StringComparison.Ordinal))
        {
            return MetricConstants.CalculationSum;
        }

        if (normalized.Contains("ספיר", StringComparison.Ordinal))
        {
            return MetricConstants.CalculationCount;
        }

        if (normalized.Contains("ערך ישיר", StringComparison.Ordinal))
        {
            return MetricConstants.CalculationDirect;
        }

        return null;
    }
}
