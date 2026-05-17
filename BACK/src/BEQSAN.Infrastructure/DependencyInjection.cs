using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Application.Common.Persistence;
using BEQSAN.Infrastructure.Caching;
using BEQSAN.Infrastructure.Persistence;
using BEQSAN.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BEQSAN.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<DatabaseOptions>(configuration.GetSection(DatabaseOptions.SectionName));
        services.Configure<StorageOptions>(configuration.GetSection(StorageOptions.SectionName));

        var dbOptions = configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>()
                        ?? new DatabaseOptions();

        services.AddDbContext<BeqsanDbContext>(opts =>
        {
            opts.UseSqlite(dbOptions.ConnectionString);
            opts.UseSnakeCaseNamingConvention();
        });

        services.AddScoped<IBeqsanDbContext>(sp => sp.GetRequiredService<BeqsanDbContext>());
        services.AddScoped<IDbConnectionFactory, SqliteConnectionFactory>();

        services.AddMemoryCache();
        services.AddSingleton<ICacheService, MemoryCacheService>();

        services.AddSingleton<IStorageService, LocalFileStorage>();

        return services;
    }

    /// <summary>
    /// Ensures the SQLite database file directory exists and applies any pending migrations.
    /// Safe to call repeatedly.
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

        await ctx.Database.EnsureCreatedAsync(ct).ConfigureAwait(false);
    }
}
