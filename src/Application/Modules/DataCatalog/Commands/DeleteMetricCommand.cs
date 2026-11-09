using InstaDataApp.Application.Common.Interfaces;

namespace InstaDataApp.Application.Modules.DataCatalog.Commands;

public record DeleteMetricCommand(int MetricId) : IRequest<bool>;

public class DeleteMetricCommandHandler : IRequestHandler<DeleteMetricCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteMetricCommandHandler(IApplicationDbContext context) => _context = context;

    public async Task<bool> Handle(DeleteMetricCommand request, CancellationToken cancellationToken)
    {
        var metric = await _context.Metrics
            .FirstOrDefaultAsync(m => m.MetricId == request.MetricId, cancellationToken);

        if (metric is null)
            return false;

        _context.Metrics.Remove(metric);

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
