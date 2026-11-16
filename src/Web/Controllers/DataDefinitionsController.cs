using InstaDataApp.Application.Modules.DataDefinitions;

namespace InstaDataApp.Web.Controllers;

/// <summary>
/// נתוני הבסיס עבור דיאלוג "הוספת נתון חדש", ושמירת הנתון עצמו.
/// </summary>
[Route("api/data-definitions")]
public class DataDefinitionsController : ControllerBase
{
    private readonly ISender _sender;

    public DataDefinitionsController(ISender sender) => _sender = sender;

    [HttpGet("sources")]
    public async Task<ActionResult<List<LookupOptionDto>>> GetSources(CancellationToken cancellationToken)
        => Ok(await _sender.Send(new GetDataSourcesQuery(), cancellationToken));

    [HttpGet("sources/{sourceId:int}")]
    public async Task<ActionResult<DataSourceDto>> GetSource(int sourceId, CancellationToken cancellationToken)
        => Ok(await _sender.Send(new GetDataSourceByIdQuery(sourceId), cancellationToken));

    [HttpGet("card-icons")]
    public async Task<ActionResult<List<LookupOptionDto>>> GetCardIcons(CancellationToken cancellationToken)
        => Ok(await _sender.Send(new GetCardIconsQuery(), cancellationToken));

    [HttpGet("calculation-periods")]
    public async Task<ActionResult<List<LookupOptionDto>>> GetCalculationPeriods(CancellationToken cancellationToken)
        => Ok(await _sender.Send(new GetDateRangeTypesQuery(), cancellationToken));

    [HttpGet("calculation-types")]
    public async Task<ActionResult<List<LookupOptionDto>>> GetCalculationTypes(CancellationToken cancellationToken)
        => Ok(await _sender.Send(new GetCalculationTypesQuery(), cancellationToken));

    /// <summary>התאריך לתצוגת "תאריך יצירה" — נקרא ברקע בפתיחת הדיאלוג</summary>
    [HttpGet("current-date")]
    public async Task<ActionResult<DateTime>> GetCurrentDate(CancellationToken cancellationToken)
        => Ok(await _sender.Send(new GetCurrentDateQuery(), cancellationToken));

    /// <summary>תצוגה מקדימה של הנתון — מחזיר את מבנה השורות, בלי לשמור דבר</summary>
    [HttpPost("preview")]
    public async Task<ActionResult<PreviewResultDto>> Preview([FromBody] MetricDraftDto draft, CancellationToken cancellationToken)
        => Ok(await _sender.Send(new GetMetricPreviewQuery(draft), cancellationToken));

    /// <summary>שמירת נתון חדש — מחזיר את ה-MetricID שנקבע</summary>
    [HttpPost]
    public async Task<ActionResult<int>> Create([FromBody] MetricDraftDto draft, CancellationToken cancellationToken)
        => Ok(await _sender.Send(new CreateMetricCommand(draft), cancellationToken));

}
