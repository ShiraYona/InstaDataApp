using InstaDataApp.Application.Modules.DataCatalog.Commands;
using InstaDataApp.Application.Modules.DataCatalog.Queries;
using InstaDataApp.Application.Modules.DataDefinitions;
using InstaDataApp.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InstaDataApp.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class DataCatalogController : ControllerBase
{
    private readonly ISender _sender;

    public DataCatalogController(ISender sender) => _sender = sender;

    [HttpGet]
    public async Task<ActionResult<List<MetricListItemDto>>> Get(CancellationToken cancellationToken) =>
        Ok(await _sender.Send(new GetMetricsQuery(), cancellationToken));


    /// <summary>עדכון נתון קיים — מעדכן את השורה, לא יוצר חדשה</summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] MetricDraftDto draft,
        CancellationToken cancellationToken)
    {
        var updated = await _sender.Send(new UpdateMetricCommand(id, draft), cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpPut("{id:int}/active")]
    public async Task<IActionResult> SetActive(
        int id,
        [FromBody] SetMetricActiveRequest body,
        CancellationToken cancellationToken)
    {
        var updated = await _sender.Send(new SetMetricActiveCommand(id, body.IsActive), cancellationToken);
        return updated ? NoContent() : NotFound();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var deleted = await _sender.Send(new DeleteMetricCommand(id), cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("calculation-days")]
    public async Task<ActionResult<List<CalculationDayDto>>> GetCalculationDays(CancellationToken cancellationToken) =>
        Ok(await _sender.Send(new GetCalculationDaysQuery(), cancellationToken));


}

public record SetMetricActiveRequest(bool IsActive);

