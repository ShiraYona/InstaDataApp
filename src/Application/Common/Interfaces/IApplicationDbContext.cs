using InstaDataApp.Domain.Entities;

namespace InstaDataApp.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Metric> Metrics { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
