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
    DbSet<CtrlFilterOperator> FilterOperators { get; }
    DbSet<CtrlPayment> CtrlPayments { get; }
    DbSet<CtrlFine> CtrlFines { get; }
    DbSet<CtrlClaim> CtrlClaims { get; }
        DbSet<CtrlTask> CtrlTasks { get; }
    DbSet<CtrlTaskComment> CtrlTaskComments { get; }
    DbSet<CtrlTaskHistory> CtrlTaskHistories { get; }
    DbSet<CtrlTaskView> CtrlTaskViews { get; }

    DbSet<CtrlIcon> CtrlIcons { get; }

    DbSet<UserDisplaySettings> UserDisplaySettings { get; }
    DbSet<UserMetricSetting> UserMetricSettings { get; }

    DbSet<CardIcon> CardIcons { get; }
    DbSet<CalculationPeriod> CalculationDays { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
