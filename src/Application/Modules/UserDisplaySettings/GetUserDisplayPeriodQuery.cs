using InstaDataApp.Application.Common.Interfaces;
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
        var days = await (
                from s in db.UserDisplaySettings.AsNoTracking()
                join c in db.CalculationDays.AsNoTracking() on s.PeriodCalculation equals c.Id
                where s.UserId == request.UserId
                select (int?)c.Value)
            .FirstOrDefaultAsync(ct);

        return days ?? DefaultPeriodDays;
    }
}
