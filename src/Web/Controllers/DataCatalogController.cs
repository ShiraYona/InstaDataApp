using InstaDataApp.Application.Modules.DataCatalog.Queries;
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
    public async Task<ActionResult<List<Metric>>> Get(CancellationToken cancellationToken) =>
        Ok(await _sender.Send(new GetMetricsQuery(), cancellationToken));
}
