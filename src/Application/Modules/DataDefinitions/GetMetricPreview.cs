using InstaDataApp.Application.Common.Interfaces;

namespace InstaDataApp.Application.Modules.DataDefinitions;


public record GetMetricPreviewQuery(MetricDraftDto Draft) : IRequest<PreviewResultDto>;

public class GetMetricPreviewQueryHandler : IRequestHandler<GetMetricPreviewQuery, PreviewResultDto>
{
    private readonly IApplicationDbContext _context;

    public GetMetricPreviewQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<PreviewResultDto> Handle(GetMetricPreviewQuery request, CancellationToken cancellationToken)
    {
        var draft = request.Draft;

        await MetricDraftCheck.ValidateAsync(_context, draft, cancellationToken);

        var fieldIds = draft.DetailFieldIds
            .Concat(new[] { draft.SumFieldId, draft.GroupFieldId }.OfType<int>())
            .Distinct()
            .ToList();

        var labels = await _context.DataSourceFields
            .Where(f => f.SourceID == draft.SourceId && fieldIds.Contains(f.FieldID))
            .ToDictionaryAsync(f => f.FieldID, f => f.DisplayName, cancellationToken);

        var rows = draft.DetailFieldIds
            .Select((id, index) => new PreviewRowDto
            {
                Key = id.ToString(),
                Label = labels.TryGetValue(id, out var label) ? label : string.Empty,
                Value = 0
            })
            .ToList();

        return new PreviewResultDto { Rows = rows, Total = 0 };
    }
}
