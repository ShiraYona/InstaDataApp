using InstaDataApp.Infrastructure.Data.Interceptors;

namespace InstaDataApp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
        services.AddScoped<ISaveChangesInterceptor, DispatchDomainEventsInterceptor>();

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.AddInterceptors(sp.GetServices<ISaveChangesInterceptor>());
            options.UseSqlServer(connectionString);
        });

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        services.AddIdentityCore<ApplicationUser>(options => options.SignIn.RequireConfirmedAccount = true)
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        services.AddScoped<IIdentityService, IdentityService>();

        // "היום" של המערכת נקבע לפי התאריך בישראל, ולא לפי אזור הזמן של השרת —
        // תקופות החישוב הן ימים קלנדריים מקומיים. אם אזור הזמן אינו מוכר במערכת,
        // נשארים על שעון המכונה.
        var israelTimeZone = InstaDataApp.Application.Common.ZonedTimeProvider.TryFindIsraelTimeZone();
        services.AddSingleton<TimeProvider>(israelTimeZone is null
            ? TimeProvider.System
            : new InstaDataApp.Application.Common.ZonedTimeProvider(israelTimeZone));

        services.AddAuthorizationBuilder()
            .AddPolicy(InstaDataApp.Domain.Constants.Policies.CanPurge, policy => policy.RequireRole(InstaDataApp.Domain.Constants.Roles.Administrator));

        return services;
    }
}
