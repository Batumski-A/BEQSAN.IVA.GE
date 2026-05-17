using BEQSAN.Application.Catalog.GetBlindTypes;
using BEQSAN.Application.Catalog.GetColorsByMaterial;
using BEQSAN.Application.Catalog.GetGlassTypesByMaterial;
using BEQSAN.Application.Catalog.GetHandleStyles;
using BEQSAN.Application.Catalog.GetLockTypes;
using BEQSAN.Application.Catalog.GetMaterialsByProductType;
using BEQSAN.Application.Catalog.GetProductTypes;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Application.Common.Persistence;
using BEQSAN.Infrastructure.Caching;
using BEQSAN.Infrastructure.Catalog;
using BEQSAN.Infrastructure.Persistence;
using BEQSAN.Infrastructure.Persistence.Seed;
using BEQSAN.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace BEQSAN.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Register Dapper handlers once at composition root — SQLite stores
        // GUIDs and DateTimes as TEXT, default Dapper mapping rejects those casts.
        SqliteDapperTypeHandlers.Register();

        services.Configure<DatabaseOptions>(configuration.GetSection(DatabaseOptions.SectionName));
        services.Configure<StorageOptions>(configuration.GetSection(StorageOptions.SectionName));

        // Resolve the connection string from IOptions at DbContext construction time
        // (NOT at registration time) so test-host config overrides win — the test
        // factory's ConfigureAppConfiguration runs after AddInfrastructure has already
        // registered the DbContext.
        services.AddDbContext<BeqsanDbContext>((sp, opts) =>
        {
            var dbOpts = sp.GetRequiredService<IOptions<DatabaseOptions>>().Value;
            opts.UseSqlite(dbOpts.ConnectionString);
            opts.UseSnakeCaseNamingConvention();
        });

        services.AddScoped<IBeqsanDbContext>(sp => sp.GetRequiredService<BeqsanDbContext>());
        services.AddScoped<IDbConnectionFactory, SqliteConnectionFactory>();

        services.AddMemoryCache();
        services.AddSingleton<ICacheService, MemoryCacheService>();

        services.AddSingleton<IStorageService, LocalFileStorage>();

        services.AddScoped<IProductTypeReader, ProductTypeDapperReader>();
        services.AddScoped<IProductTypeExistsCheck, ProductTypeExistsCheckDapper>();
        services.AddScoped<IMaterialReader, MaterialDapperReader>();
        services.AddScoped<IGlassTypeReader, GlassTypeDapperReader>();
        services.AddScoped<IColorOptionReader, ColorOptionDapperReader>();
        services.AddScoped<IHandleStyleReader, HandleStyleDapperReader>();
        services.AddScoped<ILockTypeReader, LockTypeDapperReader>();
        services.AddScoped<IBlindTypeReader, BlindTypeDapperReader>();

        return services;
    }

    /// <summary>
    /// Ensures the SQLite database file directory exists, applies migrations
    /// (or creates the schema from the model if none exist yet), and seeds
    /// idempotent reference data. Safe to call repeatedly.
    /// </summary>
    public static async Task InitializeDatabaseAsync(
        this IServiceProvider services,
        CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<BeqsanDbContext>();

        // SQLite needs the file's directory to exist before EF opens the file.
        var conn = ctx.Database.GetDbConnection();
        var connStr = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(conn.ConnectionString);
        var dataSource = connStr.DataSource;
        if (!string.IsNullOrWhiteSpace(dataSource) && dataSource != ":memory:")
        {
            var path = Path.IsPathRooted(dataSource)
                ? dataSource
                : Path.Combine(Directory.GetCurrentDirectory(), dataSource);
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }
        }

        // Apply migrations if any exist; otherwise create from the model.
        // EnsureCreatedAsync is a no-op once migrations are in play.
        var hasMigrations = (await ctx.Database.GetAppliedMigrationsAsync(ct).ConfigureAwait(false)).Any()
                            || (await ctx.Database.GetPendingMigrationsAsync(ct).ConfigureAwait(false)).Any();
        if (hasMigrations)
        {
            await ctx.Database.MigrateAsync(ct).ConfigureAwait(false);
        }
        else
        {
            await ctx.Database.EnsureCreatedAsync(ct).ConfigureAwait(false);
        }

        await ProductTypeSeeder.SeedAsync(ctx, ct).ConfigureAwait(false);
        await MaterialSeeder.SeedAsync(ctx, ct).ConfigureAwait(false);
        await GlassTypeSeeder.SeedAsync(ctx, ct).ConfigureAwait(false);
        await ColorOptionSeeder.SeedAsync(ctx, ct).ConfigureAwait(false);
        await AccessoryCatalogSeeder.SeedAsync(ctx, ct).ConfigureAwait(false);
    }
}
