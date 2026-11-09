using System.Reflection;
using InstaDataApp.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace InstaDataApp.Infrastructure.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser>(options), IApplicationDbContext
{
    public DbSet<UserDisplaySettings> UserDisplaySettings => Set<UserDisplaySettings>();
    public DbSet<UserMetricSetting> UserMetricSettings => Set<UserMetricSetting>();
    public DbSet<Metric> Metrics => Set<Metric>();
    public DbSet<CalculationDay> CalculationDays => Set<CalculationDay>();


    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
