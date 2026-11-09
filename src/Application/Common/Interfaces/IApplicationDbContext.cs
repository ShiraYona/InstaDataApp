using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<UserDisplaySettings> UserDisplaySettings { get; }
    DbSet<UserMetricSetting> UserMetricSettings { get; }
    DbSet<Metric> Metrics { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);

    DbSet<CalculationDay> CalculationDays { get; }

}
