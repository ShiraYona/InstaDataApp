using Microsoft.EntityFrameworkCore.Design;

namespace InstaDataApp.Infrastructure.Data;

// Used by the EF Core tools (dotnet ef migrations add / update).
// Reads the same appsettings files the Web project uses, so migrations and the
// running application always target the same database.
public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        // Find the Web project folder by walking up from the compiled assembly
        // location (bin/Debug/net8.0 = 5 levels deep), so the result does not
        // depend on the directory the `dotnet ef` command is launched from.
        var webProjectDirectory = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Web");

        var configuration = new ConfigurationBuilder()
            .SetBasePath(webProjectDirectory)
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException(
                $"Connection string 'DefaultConnection' not found. Looked in: {webProjectDirectory}");

        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new ApplicationDbContext(optionsBuilder.Options);
    }
}