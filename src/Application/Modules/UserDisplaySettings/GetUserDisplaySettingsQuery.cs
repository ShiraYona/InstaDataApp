using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.UserDisplaySettings;

public record GetUserDisplaySettingsQuery(string UserId) : IRequest<DisplaySettingsDto>;

public class GetUserDisplaySettingsQueryHandler(IApplicationDbContext db)
    : IRequestHandler<GetUserDisplaySettingsQuery, DisplaySettingsDto>
{
    public async Task<DisplaySettingsDto> Handle(
        GetUserDisplaySettingsQuery request, CancellationToken ct)
    {
        var row = await db.UserDisplaySettings
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == request.UserId, ct);

        var cardsPerRow = row is not null && Domain.Entities.UserDisplaySettings.IsValidCardsPerRow(row.CardsPerRow) ? row.CardsPerRow : Domain.Entities.UserDisplaySettings.DefaultCardsPerRow;
        return new DisplaySettingsDto(cardsPerRow);
    }
}
