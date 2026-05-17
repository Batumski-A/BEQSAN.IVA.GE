using BEQSAN.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BEQSAN.IntegrationTests;

/// <summary>
/// Per-instance SQLite-backed test factory. Each factory gets its own
/// temp .db file (deleted on dispose) so:
///   - EF Core (DbContext) and Dapper (IDbConnectionFactory) both open
///     connections to the SAME database — :memory: would fork them.
///   - Migration + seed run on InitializeAsync once per factory.
///   - Tests using the same IClassFixture share state (deterministic seed
///     means rows are stable); tests that need isolation create their own
///     factory inside the test body.
/// </summary>
public sealed class BeqsanWebAppFactory : WebApplicationFactory<BEQSAN.Api.Program>, IAsyncLifetime
{
    private readonly string _dbPath = Path.Combine(
        Path.GetTempPath(),
        $"beqsan-test-{Guid.NewGuid():N}.db");

    private readonly string _storageRoot = Path.Combine(
        Path.GetTempPath(),
        "beqsan-tests",
        Guid.NewGuid().ToString("N"));

    public async Task InitializeAsync()
    {
        // The production app calls InitializeDatabaseAsync() in Program.cs after
        // app.Build() and before app.RunAsync(). WebApplicationFactory never reaches
        // RunAsync, so we trigger migration + seed manually here. Services is lazy-built
        // on first access — this is the first.
        await Services.InitializeDatabaseAsync().ConfigureAwait(false);
    }

    public new Task DisposeAsync()
    {
        try
        {
            base.DisposeAsync().AsTask().Wait();
        }
        finally
        {
            TryDelete(_dbPath);
            TryDelete(_dbPath + "-wal");
            TryDelete(_dbPath + "-shm");
            if (Directory.Exists(_storageRoot))
            {
                try { Directory.Delete(_storageRoot, recursive: true); } catch { }
            }
        }
        return Task.CompletedTask;
    }

    private static void TryDelete(string path)
    {
        try { if (File.Exists(path)) File.Delete(path); } catch { }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        var connectionString = $"Data Source={_dbPath};Foreign Keys=True";

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:ConnectionString"] = connectionString,
                ["Storage:LocalRoot"] = _storageRoot,
            });
        });
    }
}

/// <summary>
/// Lookup-extension used by tests when they need to swap an Infrastructure
/// service for a stub. Keeps the swap idiom short at the call site.
/// </summary>
internal static class TestServiceExtensions
{
    public static void Replace<TService>(this IServiceCollection services, TService instance)
        where TService : class
    {
        var existing = services.SingleOrDefault(d => d.ServiceType == typeof(TService));
        if (existing is not null)
        {
            services.Remove(existing);
        }

        services.AddSingleton(instance);
    }
}
