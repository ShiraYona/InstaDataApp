using InstaDataApp.Application.Common.Interfaces;

namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>מקור נתונים יחד עם השדות הפעילים שלו.</summary>
public record GetDataSourceByIdQuery(int SourceId) : IRequest<DataSourceDto>;

public class GetDataSourceByIdQueryHandler : IRequestHandler<GetDataSourceByIdQuery, DataSourceDto>
{
    private readonly IApplicationDbContext _context;

    public GetDataSourceByIdQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<DataSourceDto> Handle(GetDataSourceByIdQuery request, CancellationToken cancellationToken)
    {
        var source = await _context.DataSources
            .Where(s => s.SourceID == request.SourceId)
            .Select(s => new
            {
                s.SourceID,
                s.SourceName,
                s.DateFieldID,
                s.IsActive,
                Fields = s.Fields
                    .Where(f => f.IsActive)
                    .OrderBy(f => f.DisplayOrder)
                    .Select(f => new DataSourceFieldDto
                    {
                        FieldId = f.FieldID,
                        Label = f.DisplayName,
                        DataType = f.DataType,
                        IsSummable = f.IsSummable,
                        IsGroupable = f.IsGroupable
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (source is null || !source.IsActive)
        {
            throw new NotFoundException(nameof(Domain.Entities.DataSource), request.SourceId.ToString());
        }

        return new DataSourceDto
        {
            SourceId = source.SourceID,
            Label = source.SourceName,
            DateFieldId = source.DateFieldID,
            Fields = source.Fields
        };
    }
}
