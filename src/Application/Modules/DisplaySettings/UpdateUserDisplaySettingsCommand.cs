using InstaDataApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.DisplaySettings;

/// <summary>שמירת מספר הכרטיסים בשורה. מבצע upsert.</summary>
public record UpdateUserDisplaySettingsCommand(string UserId, int CardsPerRow) : IRequest;

public class UpdateUserDisplaySettingsCommandHandler(IApplicationDbContext db, TimeProvider time)
    : IRequestHandler<UpdateUserDisplaySettingsCommand>
{
    public async Task Handle(UpdateUserDisplaySettingsCommand request, CancellationToken ct)
    {
        if (!Domain.Entities.UserDisplaySettings.IsValidCardsPerRow(request.CardsPerRow))
        {
            throw new ArgumentOutOfRangeException(
                nameof(request.CardsPerRow), "מספר הכרטיסים בשורה חייב להיות 2, 3 או 4.");
        }

        var row = await db.UserDisplaySettings
            .FirstOrDefaultAsync(x => x.UserId == request.UserId, ct);

        var now = time.GetUtcNow().UtcDateTime;

        if (row is null)
        {
            row = new Domain.Entities.UserDisplaySettings
            {
                UserId = request.UserId,
                CardsPerRow = request.CardsPerRow,
                UpdatedDate = now,
            };
            db.UserDisplaySettings.Add(row);
        }
        else
        {
            row.CardsPerRow = request.CardsPerRow;
            row.UpdatedDate = now;
        }

        await db.SaveChangesAsync(ct);
    }
}
