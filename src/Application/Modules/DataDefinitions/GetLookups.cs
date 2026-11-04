using InstaDataApp.Application.Common.Interfaces;

namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>
/// סמלי הכרטיס — נקראים מ-CTRL_Symbols (ID / Name / Value / IconClass).
/// ה-Name הוא מה שנשמר ב-CTRL_Metrics.IconCode;
/// ה-Value הוא המילה המוצגת, וה-IconClass הוא האייקון שלצידה.
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
                Value = icon.Name,
                Label = icon.Value,
                Icon = icon.IconClass
            })
            .ToListAsync(cancellationToken);
    }
}

/// <summary>
/// מספר הימים לחישוב — נקראים מ-CTRL_CalculationDays.
/// ה-Name הוא הטקסט שמוצג ("30 ימים"), וה-Value הוא מספר הימים (INT) —
/// הוא הערך שנשמר ב-CTRL_Metrics.DateRangeType, ולכן מוחזר כמחרוזת בטופס.
/// "לפי מסנן הלוח" אינו שורה בטבלה (אין לו מספר ימים) — הוא מתווסף כאן בקוד
/// בראש הרשימה, והוא ברירת המחדל בטופס.
/// </summary>
public record GetDateRangeTypesQuery : IRequest<List<LookupOptionDto>>;

public class GetDateRangeTypesQueryHandler : IRequestHandler<GetDateRangeTypesQuery, List<LookupOptionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetDateRangeTypesQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<List<LookupOptionDto>> Handle(GetDateRangeTypesQuery request, CancellationToken cancellationToken)
    {
        var days = await _context.CalculationPeriods
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

/// <summary>סוגי החישוב — נקראים מ-CTRL_CalculationTypes.</summary>
public record GetCalculationTypesQuery : IRequest<List<LookupOptionDto>>;

public class GetCalculationTypesQueryHandler : IRequestHandler<GetCalculationTypesQuery, List<LookupOptionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCalculationTypesQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<List<LookupOptionDto>> Handle(
        GetCalculationTypesQuery request,
        CancellationToken cancellationToken)
    {
        // התווית מוצגת כ"ספירת רשומות (COUNT)": Name ואחריו Value בסוגריים.
        // הערך (Value) נשאר ה-Name בלבד — הוא זה שנשמר ב-CTRL_Metrics.
        return await _context.CalculationTypes
            .OrderBy(type => type.ID)
            .Select(type => new LookupOptionDto
            {
                Value = type.Name,
                Label = type.Name + " (" + type.Value + ")"
            })
            .ToListAsync(cancellationToken);
    }
}
