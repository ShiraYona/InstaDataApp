using InstaDataApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.DataCatalog.Commands;

public record DeleteMetricCommand(int MetricId) : IRequest<bool>;

public class DeleteMetricCommandHandler : IRequestHandler<DeleteMetricCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteMetricCommandHandler(IApplicationDbContext context) => _context = context;

    public async Task<bool> Handle(DeleteMetricCommand request, CancellationToken cancellationToken)
    {
        // שדות הפירוט חייבים להיכלל — ה-FK שלהם הוא NoAction, ובלעדיהם המחיקה נכשלת
        var metric = await _context.CtrlMetrics
            .Include(m => m.DetailFields)
            .FirstOrDefaultAsync(m => m.MetricID == request.MetricId, cancellationToken);

        if (metric is null)
            return false;

        _context.CtrlMetrics.Remove(metric);

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
