using BEQSAN.Application.Common.Persistence;
using BEQSAN.Domain.Admin;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Gallery;
using BEQSAN.Domain.Orders;
using BEQSAN.Domain.Social;
using BEQSAN.Domain.Warranties;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Infrastructure.Persistence;

public sealed class BeqsanDbContext(DbContextOptions<BeqsanDbContext> options)
    : DbContext(options), IBeqsanDbContext
{
    public DbSet<ProductType> ProductTypes => Set<ProductType>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<GlassType> GlassTypes => Set<GlassType>();
    public DbSet<ColorOption> ColorOptions => Set<ColorOption>();
    public DbSet<HandleStyle> HandleStyles => Set<HandleStyle>();
    public DbSet<LockType> LockTypes => Set<LockType>();
    public DbSet<BlindType> BlindTypes => Set<BlindType>();

    public DbSet<SocialAccount> SocialAccounts => Set<SocialAccount>();
    public DbSet<SocialPage> SocialPages => Set<SocialPage>();
    public DbSet<SocialPost> SocialPosts => Set<SocialPost>();
    public DbSet<InboxThread> InboxThreads => Set<InboxThread>();
    public DbSet<InboxMessage> InboxMessages => Set<InboxMessage>();

    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();

    public DbSet<Order> Orders => Set<Order>();

    public DbSet<Warranty> Warranties => Set<Warranty>();

    public DbSet<GalleryItem> GalleryItems => Set<GalleryItem>();

    public Task<bool> CanConnectAsync(CancellationToken ct = default) =>
        Database.CanConnectAsync(ct);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BeqsanDbContext).Assembly);
    }
}
