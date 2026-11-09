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

    DbSet<DataSource> DataSources { get; }

    DbSet<DataSourceField> DataSourceFields { get; }

    DbSet<Metric> Metrics { get; }

    DbSet<MetricDetailField> MetricDetailFields { get; }

    /// <summary>טבלאות עזר — CTRL_ICON / CTRL_CalculationDays / CTRL_CalculationTypes</summary>
    DbSet<CardIcon> CardIcons { get; }

    DbSet<CalculationPeriod> CalculationPeriods { get; }

    DbSet<CalculationTypeDefinition> CalculationTypes { get; }

    DbSet<UserDisplaySettings> UserDisplaySettings { get; }
    DbSet<UserMetricSetting> UserMetricSettings { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
