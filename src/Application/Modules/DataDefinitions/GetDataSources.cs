using InstaDataApp.Application.Common.Interfaces;

namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>רשימת מקורות הנתונים הפעילים — לרשימה הנפתחת בטופס.</summary>
public record GetDataSourcesQuery : IRequest<List<LookupOptionDto>>;

public class GetDataSourcesQueryHandler : IRequestHandler<GetDataSourcesQuery, List<LookupOptionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetDataSourcesQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<List<LookupOptionDto>> Handle(GetDataSourcesQuery request, CancellationToken cancellationToken)
    {
        var sources = await _context.DataSources
            .Where(s => s.IsActive)
            .OrderBy(s => s.SourceName)
            .ToListAsync(cancellationToken);

        // אין עמודת IconCode ב-CTRL_DataSources, ולכן המקור אינו נושא סמל.
        // Icon נשאר null, והתבנית מציגה את השורה בלי אייקון.
        return sources
            .Select(s => new LookupOptionDto
            {
                Value = s.SourceID.ToString(),
                Label = s.SourceName
            })
            .ToList();
    }
}
