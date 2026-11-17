using InstaDataApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.UserDisplaySettings;


public record UpdateUserDisplayPeriodCommand(string UserId, int Days) : IRequest<bool>;

public class UpdateUserDisplayPeriodCommandHandler(IApplicationDbContext db, TimeProvider time)
    : IRequestHandler<UpdateUserDisplayPeriodCommand, bool>
{
    public async Task<bool> Handle(UpdateUserDisplayPeriodCommand request, CancellationToken ct)
    {
        var calculationDayId = await db.CalculationDays
            .AsNoTracking()
            .Where(x => x.Value == request.Days)
            .Select(x => (int?)x.Id)
            .FirstOrDefaultAsync(ct);

        if (calculationDayId is null)
        {
            return false;
        }

        var row = await db.UserDisplaySettings
            .FirstOrDefaultAsync(x => x.UserId == request.UserId, ct);

        var now = time.GetUtcNow().UtcDateTime;

        if (row is null)
        {
            row = new Domain.Entities.UserDisplaySettings
            {
                UserId = request.UserId,
                CardsPerRow = Domain.Entities.UserDisplaySettings.DefaultCardsPerRow,
                PeriodCalculation = calculationDayId,
                UpdatedDate = now,
            };
            db.UserDisplaySettings.Add(row);
        }
        else
        {
            row.PeriodCalculation = calculationDayId;
            row.UpdatedDate = now;
        }

        await db.SaveChangesAsync(ct);
        return true;
    }
}
