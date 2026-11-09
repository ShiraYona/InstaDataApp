using InstaDataApp.Application;
using InstaDataApp.Infrastructure;
using InstaDataApp.Infrastructure.Data;
using InstaDataApp.Web;
using InstaDataApp.Web.Infrastructure;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddKeyVaultIfConfigured(builder.Configuration);

builder.Host.UseSerilog((context, services, configuration) => configuration
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day));

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddWebServices(builder.Configuration, builder.Environment);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
        policy.WithOrigins("https://localhost:44447", "http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services
    .AddAuthentication(NegotiateDefaults.AuthenticationScheme)
    .AddNegotiate();

var launchProfile = Environment.GetEnvironmentVariable("DOTNET_LAUNCH_PROFILE");
var allowAnonymousInDevelopment = builder.Environment.IsDevelopment()
    && !string.Equals(launchProfile, "IIS Express", StringComparison.OrdinalIgnoreCase);

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = allowAnonymousInDevelopment
        ? new AuthorizationPolicyBuilder().RequireAssertion(_ => true).Build()
        : options.DefaultPolicy;
});

builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = null);

var app = builder.Build();

app.UseExceptionHandler();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseSerilogRequestLogging();

app.UseHttpsRedirection();


app.UseStaticFiles();

app.UseCors("AllowAngular");

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();


app.UseStatusCodePagesWithReExecute("/Error", "?code={0}");

app.MapHealthChecks("/health").AllowAnonymous();

app.UseOpenApi();
app.UseSwaggerUi(settings =>
{
    settings.Path = "/api";
    settings.DocumentPath = "/api/specification.json";
});

app.MapControllerRoute(
    name: "default",
    pattern: "{controller}/{action=Index}/{id?}");

app.MapRazorPages();

app.MapControllers();

app.MapFallbackToFile("index.html");

app.Run();

public partial class Program { }
