using InstaDataApp.Domain.Entities;
using System.Reflection;
using InstaDataApp.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace InstaDataApp.Infrastructure.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options), IApplicationDbContext
{
        public DbSet<CtrlMetric> CtrlMetrics => Set<CtrlMetric>();
    public DbSet<CtrlDataSource> CtrlDataSources => Set<CtrlDataSource>();
    public DbSet<CtrlDataSourceField> CtrlDataSourceFields => Set<CtrlDataSourceField>();
    public DbSet<CtrlDataSourceParameter> CtrlDataSourceParameters => Set<CtrlDataSourceParameter>();
    public DbSet<CtrlMetricDetailField> CtrlMetricDetailFields => Set<CtrlMetricDetailField>();
    public DbSet<CtrlPayment> CtrlPayments => Set<CtrlPayment>();
    public DbSet<CtrlFine> CtrlFines => Set<CtrlFine>();
    public DbSet<CtrlClaim> CtrlClaims => Set<CtrlClaim>();
    public DbSet<CtrlCalculationType> CtrlCalculationTypes => Set<CtrlCalculationType>();
    public DbSet<CtrlIcon> CtrlIcons => Set<CtrlIcon>();

    public DbSet<UserDisplaySettings> UserDisplaySettings => Set<UserDisplaySettings>();
    public DbSet<UserMetricSetting> UserMetricSettings => Set<UserMetricSetting>();
    public DbSet<Metric> Metrics => Set<Metric>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
