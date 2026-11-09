using InstaDataApp.Application.Common.Interfaces;
using InstaDataApp.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Modules.DataCatalog.Queries;

public record GetMetricsQuery : IRequest<List<Metric>>;

public class GetMetricsQueryHandler : IRequestHandler<GetMetricsQuery, List<Metric>>
{
    private readonly IApplicationDbContext _context;

    public GetMetricsQueryHandler(IApplicationDbContext context) => _context = context;

    public Task<List<Metric>> Handle(GetMetricsQuery request, CancellationToken cancellationToken) =>
        _context.Metrics
            .AsNoTracking()
            .ToListAsync(cancellationToken);
}
