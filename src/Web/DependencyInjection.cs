using Azure.Identity;
using InstaDataApp.Web.Services;
using Microsoft.AspNetCore.Diagnostics.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace InstaDataApp.Web;

public static class DependencyInjection
{
    public static IServiceCollection AddWebServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        // אזהרת SecurityWarning: הזרוע של תצוגת פרטי ה-DB נטענת במכוון רק בסביבת Development.
        // בלי התנאי הזה, בסביבת Production ההרצה הייתה נכשלת בזריקת חריגה בזמן הבנייה.
        if (environment.IsDevelopment())
        {
            services.AddDatabaseDeveloperPageExceptionFilter();
        }

        services.AddScoped<IUser, CurrentUser>();
        services.AddHttpContextAccessor();

        services.AddHealthChecks()
            .AddDbContextCheck<ApplicationDbContext>();

        services.AddExceptionHandler<CustomExceptionHandler>();
        services.AddProblemDetails();

        services.AddRazorPages();

        services.AddControllers();

        // Customise default API behaviour
        services.Configure<ApiBehaviorOptions>(options =>
            options.SuppressModelStateInvalidFilter = true);

        services.AddEndpointsApiExplorer();

        services.AddOpenApiDocument(configure =>
        {
            configure.Title = "InstaDataApp API";
        });

        return services;
    }

    public static void AddKeyVaultIfConfigured(this IConfigurationBuilder builder, IConfiguration configuration)
    {
        var vaultUri = configuration["AZURE_KEY_VAULT_ENDPOINT"];

        if (string.IsNullOrWhiteSpace(vaultUri))
        {
            return;
        }

        builder.AddAzureKeyVault(
            new Uri(vaultUri),
            new DefaultAzureCredential());
    }
}
