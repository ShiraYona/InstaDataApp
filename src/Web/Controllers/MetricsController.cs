using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Common.Models;
using InstaDataApp.Application.Modules.Metrics.Queries.GetActiveMetrics;
using InstaDataApp.Application.Modules.Metrics.Queries.GetMetricDetails;
using InstaDataApp.Web.Services;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace InstaDataApp.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MetricsController(
    ISender sender,
    IWebHostEnvironment environment,
    IApplicationDbContext context,
    IUser currentUser) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(List<MetricCardDto>), StatusCodes.Status200OK)]
    [AllowAnonymous]
public Task<List<MetricCardDto>> GetActiveMetrics(
    [FromQuery] string? metricName, [FromQuery] DateOnly? fromDate, [FromQuery] DateOnly? toDate, CancellationToken cancellationToken)
{
    return sender.Send(
        new GetActiveMetricsQuery(metricName, fromDate, toDate, currentUser.Id),
        cancellationToken);
}

// //שליפת כל הפרמטרים
// public async Task<ActionResult<List<MetricCardDto>>> Get(
//     [FromQuery] string? metricName, [FromQuery] int? days, CancellationToken ct)
// {
//     var cards = await sender.Send(new GetActiveMetricsQuery(metricName, days), ct);
//     return Ok(cards);
// }

    [HttpGet("payments")]
    [ProducesResponseType(typeof(List<PaymentDto>), StatusCodes.Status200OK)]
    [AllowAnonymous]
    public Task<List<PaymentDto>> GetPayments(CancellationToken cancellationToken)
    {
        return context.CtrlPayments
            .AsNoTracking()
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => new PaymentDto
            {
                PaymentId = p.PaymentID,
                PaymentDate = p.PaymentDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                PayerName = p.PayerName,
                PaymentsCount = p.PaymentsCount,
                FullPayment = p.FullPayment,
                PaymentDepartment = p.PaymentDepartment
            })
            .ToListAsync(cancellationToken);
    }

    [HttpGet("fines")]
    [ProducesResponseType(typeof(List<FineDto>), StatusCodes.Status200OK)]
    [AllowAnonymous]
    public Task<List<FineDto>> GetFines(CancellationToken cancellationToken)
    {
        return context.CtrlFines
            .AsNoTracking()
            .OrderByDescending(f => f.FineDate)
            .Select(f => new FineDto
            {
                FineId = f.FineID,
                PayerName = f.PayerName,
                FineDate = f.FineDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                FineReason = f.FineReason,
                FineAmount = f.FineAmount,
                IsPaid = f.IsPaid
            })
            .ToListAsync(cancellationToken);
    }

    [HttpGet("claims")]
    [ProducesResponseType(typeof(List<ClaimDto>), StatusCodes.Status200OK)]
    [AllowAnonymous]
    public Task<List<ClaimDto>> GetClaims(CancellationToken cancellationToken)
    {
        return context.CtrlClaims
            .AsNoTracking()
            .OrderByDescending(c => c.ClaimDate)
            .Select(c => new ClaimDto
            {
                ClaimId = c.ClaimID,
                ClaimDate = c.ClaimDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                ClaimantName = c.ClaimantName,
                ClaimDescription = c.ClaimDescription,
                ClaimAmount = c.ClaimAmount,
                ClaimantsCount = c.ClaimantsCount,
                ClaimDepartment = c.ClaimDepartment
            })
            .ToListAsync(cancellationToken);
    }
    [HttpGet("{key}/details")]
    [ProducesResponseType(typeof(MetricDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [AllowAnonymous]
    public async Task<ActionResult<MetricDetailDto>> GetDetails(
        string key, [FromQuery] string? groupValue, [FromQuery] int? sourceId,
        [FromQuery] string? search, CancellationToken ct)
    {
        var dto = await sender.Send(new GetMetricDetailsQuery(key, groupValue, sourceId, search), ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    /// <summary>
    /// ייצוא רשומות הפירוט ל-CSV לפי הסינון הפעיל (קיבוץ + חיפוש).
    /// הקובץ נוצר בצד השרת, עם העמודות המותרות להצגה בלבד, UTF-8 עם BOM.
    /// </summary>
    [HttpGet("{key}/details/export")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [AllowAnonymous]
    public async Task<IActionResult> ExportDetails(
        string key, [FromQuery] string? groupValue, [FromQuery] int? sourceId,
        [FromQuery] string? search, CancellationToken ct)
    {
        var dto = await sender.Send(
            new GetMetricDetailsQuery(key, groupValue, sourceId, search, MaxExportRows), ct);
        if (dto is null) return NotFound(new { message = "הנתון לא נמצא" });

        var bytes = DetailCsvBuilder.Build(dto);
        var fileName = DetailCsvBuilder.FileName(dto, key);
        return File(bytes, "text/csv; charset=utf-8", fileName);
    }

    private const int MaxExportRows = 100_000;
}
