using InstaDataApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.DataCatalog.Commands;


public record SetMetricActiveCommand(int MetricId, bool IsActive) : IRequest<bool>;

public class SetMetricActiveCommandHandler : IRequestHandler<SetMetricActiveCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public SetMetricActiveCommandHandler(IApplicationDbContext context) => _context = context;

    public async Task<bool> Handle(SetMetricActiveCommand request, CancellationToken cancellationToken)
    {
        var metric = await _context.CtrlMetrics
            .FirstOrDefaultAsync(m => m.MetricID == request.MetricId, cancellationToken);

        if (metric is null)
            return false;

        metric.IsActive = request.IsActive;
        metric.UpdatedDate = DateTime.UtcNow;
        // UpdatedBy: עדיין אין שם משתמש זמין (IUser.Id הוא GUID, לא שם).
        // יושלם כשיוגדר מקור השם.

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
