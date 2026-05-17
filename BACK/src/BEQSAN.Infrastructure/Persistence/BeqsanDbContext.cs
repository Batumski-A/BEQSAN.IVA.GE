using BEQSAN.Application.Common.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Infrastructure.Persistence;

public sealed class BeqsanDbContext(DbContextOptions<BeqsanDbContext> options)
    : DbContext(options), IBeqsanDbContext
{
    // DbSet<T> properties will be added here as Domain entities are introduced
    // (e.g. Order, Configuration, ProductType, Customer).

    public Task<bool> CanConnectAsync(CancellationToken ct = default) =>
        Database.CanConnectAsync(ct);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BeqsanDbContext).Assembly);
    }
}
