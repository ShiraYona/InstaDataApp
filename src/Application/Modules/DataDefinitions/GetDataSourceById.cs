using InstaDataApp.Application.Common.Exceptions;
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
        var source = await _context.CtrlDataSources
            .Where(s => s.SourceID == request.SourceId && s.IsActive)
            .Select(s => new DataSourceDto
            {
                SourceId = s.SourceID,
                Label = s.SourceName,
                SourceType = s.SourceType,
                // ROWS = מקור שמחזיר שורות; SCALAR = ערך סופי יחיד
                OutputType = s.OutputType,
                DateFieldId = s.DateFieldID,
                // פרמטרי ההרצה של הפרוצדורה — נבדקים כאן כדי שהטופס יידע שההגדרה תקינה
                HasDateParameters = ProcedureParameters.HasDateRangeParameters(
                    _context.CtrlDataSourceParameters.Where(p => p.SourceID == s.SourceID)),
                Fields = _context.CtrlDataSourceFields
                    .Where(f => f.SourceID == s.SourceID && f.IsActive)
                    .OrderBy(f => f.DisplayOrder)
                    .Select(f => new DataSourceFieldDto
                    {
                        FieldId = f.FieldID,
                        // ה-DDL מחייב DisplayName — הגיבוי הוא שם השדה הטכני
                        Label = f.DisplayName ?? f.FieldName,
                        FieldName = f.FieldName,
                        DataType = f.DataType,
                        IsSummable = f.IsSummable,
                        IsGroupable = f.IsGroupable,
                        IsFilterable = f.IsFilterable,
                        FilterInputType = f.FilterInputType,
                        ValueSource = f.ValueSource,
                        IsNullable = f.IsNullable
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        return source
            ?? throw new NotFoundException(nameof(Domain.Entities.CtrlDataSource), request.SourceId.ToString());
    }
}
