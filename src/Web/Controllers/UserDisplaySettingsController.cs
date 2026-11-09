using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Modules.DisplaySettings;
using InstaDataApp.Application.Modules.UserDisplaySettings;
using InstaDataApp.Application.Modules.UserMetricSettings;
using InstaDataApp.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace InstaDataApp.Web.Controllers;

/// <summary>הגדרות התצוגה של המשתמש המחובר.</summary>
[ApiController]
[Route("api/user-display-settings")]
public class UserDisplaySettingsController(IMediator mediator, IUser currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DisplaySettingsDto>> Get(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(currentUser.Id))
        {
            return Unauthorized();
        }

        var userId = currentUser.Id!;
        return Ok(await mediator.Send(new GetUserDisplaySettingsQuery(userId), ct));
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<MetricSettingsDto>> GetMetrics(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(currentUser.Id))
        {
            return Unauthorized();
        }

        var userId = currentUser.Id!;
        return Ok(await mediator.Send(new GetUserMetricSettingsQuery(userId), ct));
    }

    [HttpPut]
    public async Task<IActionResult> Put([FromBody] SaveDisplaySettingsRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(currentUser.Id))
        {
            return Unauthorized();
        }

        if (!UserDisplaySettings.IsValidCardsPerRow(request.CardsPerRow))
        {
            ModelState.AddModelError(nameof(request.CardsPerRow), "הערך חייב להיות 2, 3 או 4.");
            return ValidationProblem(ModelState);
        }

        await mediator.Send(new UpdateUserDisplaySettingsCommand(currentUser.Id!, request.CardsPerRow), ct);
        return NoContent();
    }

    [HttpPut("metrics")]
    public async Task<IActionResult> PutMetrics(
        [FromBody] SaveMetricSettingsRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(currentUser.Id))
        {
            return Unauthorized();
        }

        if (request.Items is null || request.Items.Count == 0)
        {
            ModelState.AddModelError(nameof(request.Items), "יש לשלוח לפחות כרטיס אחד.");
            return ValidationProblem(ModelState);
        }

        await mediator.Send(
            new UpdateUserMetricSettingsCommand(currentUser.Id!, request.Items),
            ct);

        return NoContent();
    }
}

public record SaveDisplaySettingsRequest(int CardsPerRow);

public record SaveMetricSettingsRequest(IReadOnlyList<MetricSettingsItemDto> Items);
