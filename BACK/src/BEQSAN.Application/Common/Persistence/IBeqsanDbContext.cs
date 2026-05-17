namespace BEQSAN.Application.Common.Persistence;

/// <summary>
/// Abstraction over the EF Core DbContext used by Application handlers.
/// DbSet&lt;T&gt; properties will be added here as Domain entities are introduced.
/// </summary>
public interface IBeqsanDbContext
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);

    Task<bool> CanConnectAsync(CancellationToken ct = default);
}
