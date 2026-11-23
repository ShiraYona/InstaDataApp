using InstaDataApp.Application.Common.Interfaces;

namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>
/// סמלי הכרטיס — נקראים מ-CTRL_ICON (ID / Value / IconClass).
/// ה-IconClass הוא האייקון וגם מה שנשמר ב-CTRL_Metrics.IconCode;
/// ה-Value הוא המילה המוצגת לצידו.
/// </summary>
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

/// <summary>
/// מספר הימים לחישוב — נקראים מ-CTRL_CalculationDays בלבד.
/// ה-Name הוא הטקסט שמוצג ("30 ימים"), וה-Value הוא מספר הימים (INT) —
/// הוא הערך שנשמר ב-CTRL_Metrics.DateRangeType, ולכן מוחזר כמחרוזת בטופס.
/// </summary>
/// <remarks>
/// "לפי מסנן הלוח" אינו מוצע יותר בטופס. הערך <c>DASHBOARD</c> נשאר חוקי בשמירה
/// (<see cref="MetricConstants.IsDashboard"/>) — נתונים קיימים שנשמרו כך ממשיכים לעבוד.
/// </remarks>
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

/// <summary>
/// סוגי החישוב — נקראים מ-CTRL_CalculationTypes.
/// הערך בטופס הוא ה-ID (מפתח לטבלה), כי הוא זה שנשמר ב-CTRL_Metrics.CalculationTypeID.
/// </summary>
public record GetCalculationTypesQuery : IRequest<List<LookupOptionDto>>;

public class GetCalculationTypesQueryHandler : IRequestHandler<GetCalculationTypesQuery, List<LookupOptionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCalculationTypesQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<List<LookupOptionDto>> Handle(
        GetCalculationTypesQuery request,
        CancellationToken cancellationToken)
    {
        var types = await _context.CtrlCalculationTypes
            .AsNoTracking()
            .OrderBy(type => type.ID)
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

/// <summary>
/// המרה בין שורת הקטלוג לבין הקוד הקנוני (COUNT / SUM / DIRECT).
/// הקוד אינו נשמר במדד — נשמר ה-ID — אך הוא משמש לזיהוי סוג החישוב בכל מקום שבו
/// צריך לדעת אם מדובר בסכימה (למשל החובה לבחור שדה סיכום).
/// </summary>
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
