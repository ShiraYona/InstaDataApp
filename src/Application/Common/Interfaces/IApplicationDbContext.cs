using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace InstaDataApp.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DatabaseFacade Database { get; }
    DbSet<CtrlMetric> CtrlMetrics { get; }
    DbSet<CtrlDataSource> CtrlDataSources { get; }
    DbSet<CtrlDataSourceField> CtrlDataSourceFields { get; }
    DbSet<CtrlDataSourceParameter> CtrlDataSourceParameters { get; }
    DbSet<CtrlMetricDetailField> CtrlMetricDetailFields { get; }
    DbSet<CtrlCalculationType> CtrlCalculationTypes { get; }
    DbSet<CtrlPayment> CtrlPayments { get; }
    DbSet<CtrlFine> CtrlFines { get; }
    DbSet<CtrlClaim> CtrlClaims { get; }
    DbSet<CtrlIcon> CtrlIcons { get; }

    DbSet<UserDisplaySettings> UserDisplaySettings { get; }
    DbSet<UserMetricSetting> UserMetricSettings { get; }
    DbSet<Metric> Metrics { get; }
   Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

}
