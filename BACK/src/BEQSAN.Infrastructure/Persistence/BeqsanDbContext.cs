using BEQSAN.Application.Common.Persistence;
using BEQSAN.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Infrastructure.Persistence;

public sealed class BeqsanDbContext(DbContextOptions<BeqsanDbContext> options)
    : DbContext(options), IBeqsanDbContext
{
    public DbSet<ProductType> ProductTypes => Set<ProductType>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<GlassType> GlassTypes => Set<GlassType>();

    public Task<bool> CanConnectAsync(CancellationToken ct = default) =>
        Database.CanConnectAsync(ct);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BeqsanDbContext).Assembly);
    }
}
