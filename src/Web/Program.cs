using InstaDataApp.Application;
using InstaDataApp.Infrastructure;
using InstaDataApp.Infrastructure.Data;
using InstaDataApp.Web;
using InstaDataApp.Web.Infrastructure;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

// Optional Azure Key Vault support (set AZURE_KEY_VAULT_ENDPOINT to enable).
builder.Configuration.AddKeyVaultIfConfigured(builder.Configuration);

builder.Host.UseSerilog((context, services, configuration) => configuration
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day));

builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddWebServices(builder.Configuration);

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

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = options.DefaultPolicy;
});

builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = null);

var app = builder.Build();

// Handle errors first, so the re-executed /Error request never falls into the
// Negotiate handler with an incomplete authentication context.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseSerilogRequestLogging();

app.UseHttpsRedirection();

// Static files (favicon.ico, SPA assets...) are served before authentication.
// Browsers request favicon.ico anonymously and in parallel with the page request;
// letting it reach Negotiate throws "An anonymous request was received in between
// authentication handshake requests."
app.UseStaticFiles();

app.UseCors("AllowAngular");

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

// Status-code re-execution runs AFTER authentication, so the fallback policy has
// already been applied once and does not re-enter the challenge loop.
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
