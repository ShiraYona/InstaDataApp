using System.Reflection;
using InstaDataApp.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace InstaDataApp.Infrastructure.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options), IApplicationDbContext
{
    public DbSet<DataSource> DataSources => Set<DataSource>();

    public DbSet<DataSourceField> DataSourceFields => Set<DataSourceField>();

    public DbSet<Metric> Metrics => Set<Metric>();

    public DbSet<MetricDetailField> MetricDetailFields => Set<MetricDetailField>();

    public DbSet<CardIcon> CardIcons => Set<CardIcon>();

    public DbSet<CalculationPeriod> CalculationPeriods => Set<CalculationPeriod>();

    public DbSet<CalculationTypeDefinition> CalculationTypes => Set<CalculationTypeDefinition>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // טבלאות הקטלוג (CTRL_*) קיימות מראש — המיפוי שלהן נמצא ב-Configurations,
        // ואין להריץ Migrations עליהן.
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
