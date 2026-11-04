using InstaDataApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<DataSource> DataSources { get; }

    DbSet<DataSourceField> DataSourceFields { get; }

    DbSet<Metric> Metrics { get; }

    DbSet<MetricDetailField> MetricDetailFields { get; }

    /// <summary>טבלאות עזר — CTRL_CardIcons / CTRL_CalculationPeriods / CTRL_CalculationTypes</summary>
    DbSet<CardIcon> CardIcons { get; }

    DbSet<CalculationPeriod> CalculationPeriods { get; }

    DbSet<CalculationTypeDefinition> CalculationTypes { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
