using InstaDataApp.Application.Modules.DataDefinitions;

namespace InstaDataApp.Web.Controllers;

/// <summary>
/// נתוני הבסיס והשמירה עבור דיאלוג "הוספת נתון חדש".
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

    [HttpPost("preview")]
    public async Task<ActionResult<PreviewResultDto>> Preview(
        [FromBody] MetricDraftDto draft,
        CancellationToken cancellationToken)
        => Ok(await _sender.Send(new GetMetricPreviewQuery(draft), cancellationToken));

    [HttpPost]
    public async Task<ActionResult<int>> Create([FromBody] MetricDraftDto draft, CancellationToken cancellationToken)
    {
        var id = await _sender.Send(new CreateMetricCommand(draft), cancellationToken);

        // CreatedAtAction היה נכשל כאן: ActionNameSelector לא מוצא את GetSource
        // (הוא [HttpGet("sources/{sourceId}")] ולא נקודת קצה של המדד החדש).
        // מחזירים 201 עם מזהה המדד — מה שה-SPA צורך בפועל.
        return StatusCode(StatusCodes.Status201Created, id);
    }
}
