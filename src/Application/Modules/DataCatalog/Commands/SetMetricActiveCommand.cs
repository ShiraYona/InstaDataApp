using InstaDataApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.DataCatalog.Commands;

/// <summary>
/// שינוי מצב פעיל / מושבת לנתון קיים.
/// מחזיר <c>false</c> אם הנתון לא נמצא — כדי שה-Controller יחזיר 404.
/// </summary>
public record SetMetricActiveCommand(int MetricId, bool IsActive) : IRequest<bool>;

public class SetMetricActiveCommandHandler : IRequestHandler<SetMetricActiveCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public SetMetricActiveCommandHandler(IApplicationDbContext context) => _context = context;

    public async Task<bool> Handle(SetMetricActiveCommand request, CancellationToken cancellationToken)
    {
        var metric = await _context.Metrics
            .FirstOrDefaultAsync(m => m.MetricId == request.MetricId, cancellationToken);

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
