using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Common.Interfaces;

public interface IApplicationDbContext
{
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

    DbSet<CalculationDay> CalculationDays { get; }
    DbSet<CalculationType> CalculationTypes { get; }
}
