using InstaDataApp.Application.Common.Interfaces;

namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>אופרטור לתנאי סינון — כפי שמוצג ברשימה הנפתחת בטופס</summary>
public class FilterOperatorDto
{
    /// <summary>הקוד הקנוני (EQ / NE / GT / IN / IS_NULL …) — נשמר בעץ הסינון</summary>
    public string Code { get; init; } = string.Empty;

    public string Label { get; init; } = string.Empty;

    /// <summary>false = אין רכיב ערך לתנאי עם האופרטור הזה</summary>
    public bool NeedsValue { get; init; }

    /// <summary>true = בורר ערכים מרובה (IN / NOT_IN)</summary>
    public bool IsMultiValue { get; init; }
}

public record GetFilterOperatorsQuery : IRequest<List<FilterOperatorDto>>;

public class GetFilterOperatorsQueryHandler : IRequestHandler<GetFilterOperatorsQuery, List<FilterOperatorDto>>
{
    private readonly IApplicationDbContext _context;

    public GetFilterOperatorsQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<List<FilterOperatorDto>> Handle(
        GetFilterOperatorsQuery request,
        CancellationToken cancellationToken)
    {
        return await _context.FilterOperators
            .AsNoTracking()
            .Where(op => op.IsActive)
            .OrderBy(op => op.SortOrder)
            .ThenBy(op => op.ID)
            .Select(op => new FilterOperatorDto
            {
                Code = op.Nome,
                Label = op.Name,
                NeedsValue = op.NeedsValue,
                IsMultiValue = op.IsMultiValue
            })
            .ToListAsync(cancellationToken);
    }
}
