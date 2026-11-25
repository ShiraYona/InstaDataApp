using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Application.Modules.DataDefinitions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.UserDisplaySettings;


public record GetUserDisplayPeriodQuery(string UserId) : IRequest<int>;

public class GetUserDisplayPeriodQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetUserDisplayPeriodQuery, int>
{
    public const int DefaultPeriodDays = 30;

    public async Task<int> Handle(GetUserDisplayPeriodQuery request, CancellationToken ct)
    {
        var savedDays = await (
                from s in db.UserDisplaySettings.AsNoTracking()
                join c in db.CalculationDays.AsNoTracking() on s.PeriodCalculation equals c.Id
                where s.UserId == request.UserId
                select (int?)c.Value)
            .FirstOrDefaultAsync(ct);

        if (savedDays is not null)
        {
            return savedDays.Value;
        }

        var metricDefaults = await db.CtrlMetrics
            .AsNoTracking()
            .Where(m => m.IsActive)
            .Select(m => m.DateRangeType)
            .ToListAsync(ct);

        var defaultDays = metricDefaults
            .Select(value => MetricConstants.TryGetPeriodDays(value, out var d) ? d : (int?)null)
            .Where(d => d is not null)
            .GroupBy(d => d!.Value)
            .OrderByDescending(g => g.Count())
            .Select(g => (int?)g.Key)
            .FirstOrDefault();

        return defaultDays ?? DefaultPeriodDays;
    }
}
