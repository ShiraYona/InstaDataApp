using InstaDataApp.Domain.Entities;
using System.Reflection;
using InstaDataApp.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

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
    public DbSet<CtrlFilterOperator> FilterOperators => Set<CtrlFilterOperator>();

    public DbSet<CardIcon> CardIcons => Set<CardIcon>();
    public DbSet<CalculationPeriod> CalculationDays => Set<CalculationPeriod>();

    public DbSet<UserDisplaySettings> UserDisplaySettings => Set<UserDisplaySettings>();
    public DbSet<UserMetricSetting> UserMetricSettings => Set<UserMetricSetting>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // טבלאות הקטלוג (CTRL_*) קיימות מראש — המיפוי שלהן נמצא ב-Configurations,
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
