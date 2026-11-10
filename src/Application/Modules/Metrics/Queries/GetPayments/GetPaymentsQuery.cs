using InstaDataApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.Metrics.Queries.GetPayments;

public record GetPaymentsQuery : IRequest<List<PaymentDto>>;
public class PaymentDto
{
    public int PaymentId { get; set; }
    public string PaymentDate { get; set; } = string.Empty;
    public string PayerName { get; set; } = string.Empty;
    public int PaymentsCount { get; set; }
    public decimal FullPayment { get; set; }
    public string? PaymentDepartment { get; set; }
}

public class GetPaymentsQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetPaymentsQuery, List<PaymentDto>>
{
    public Task<List<PaymentDto>> Handle(GetPaymentsQuery request, CancellationToken cancellationToken) =>
        context.CtrlPayments
            .AsNoTracking()
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => new PaymentDto
            {
                PaymentId = p.PaymentID,
                PaymentDate = p.PaymentDate.ToString("yyyy-MM-dd"),
                PayerName = p.PayerName,
                PaymentsCount = p.PaymentsCount,
                FullPayment = p.FullPayment,
                PaymentDepartment = p.PaymentDepartment
            })
            .ToListAsync(cancellationToken);
}
