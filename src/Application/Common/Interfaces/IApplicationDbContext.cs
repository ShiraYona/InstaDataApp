namespace InstaDataApp.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    // Expose your module DbSets here, for example:
    // DbSet<Entity> Entities { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
