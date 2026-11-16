using InstaDataApp.Application.Common.Interfaces;

namespace InstaDataApp.Application.Modules.DataCatalog.Queries;

public record CalculationDayDto(int Id, string Name, int Value);

public record GetCalculationDaysQuery : IRequest<List<CalculationDayDto>>;

public class GetCalculationDaysQueryHandler : IRequestHandler<GetCalculationDaysQuery, List<CalculationDayDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCalculationDaysQueryHandler(IApplicationDbContext context) => _context = context;

    public Task<List<CalculationDayDto>> Handle(GetCalculationDaysQuery request, CancellationToken cancellationToken) =>
        _context.CalculationDays
            .AsNoTracking()
            .OrderBy(x => x.Value)
            .Select(x => new CalculationDayDto(x.Id, x.Name, x.Value))
            .ToListAsync(cancellationToken);
}
