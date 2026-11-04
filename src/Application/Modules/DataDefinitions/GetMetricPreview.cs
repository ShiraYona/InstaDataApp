using InstaDataApp.Application.Common.Interfaces;

namespace InstaDataApp.Application.Modules.DataDefinitions;

/// <summary>
/// תצוגה מקדימה — מחזירה את השדות שיוצגו בכרטיס לפי ההגדרה,
/// בלי לשמור דבר. הערכים עצמם יגיעו מהרצת המקור (ראה TODO למטה).
/// </summary>
public record GetMetricPreviewQuery(MetricDraftDto Draft) : IRequest<PreviewResultDto>;

public class GetMetricPreviewQueryHandler : IRequestHandler<GetMetricPreviewQuery, PreviewResultDto>
{
    private readonly IApplicationDbContext _context;

    public GetMetricPreviewQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<PreviewResultDto> Handle(GetMetricPreviewQuery request, CancellationToken cancellationToken)
    {
        var draft = request.Draft;

        var fieldIds = draft.DetailFieldIds
            .Concat(new[] { draft.SumFieldId, draft.GroupFieldId }.OfType<int>())
            .Distinct()
            .ToList();

        var labels = await _context.DataSourceFields
            .Where(f => f.SourceID == draft.SourceId && fieldIds.Contains(f.FieldID))
            .ToDictionaryAsync(f => f.FieldID, f => f.DisplayName, cancellationToken);

        // TODO: להריץ את מקור הנתונים (SchemaName.ObjectName) עם סוג החישוב והקיבוץ
        // ולחשב את הערכים בפועל. בינתיים מחזירים את מבנה השורות בלבד.
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
