using BEQSAN.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BEQSAN.IntegrationTests;

public sealed class BeqsanWebAppFactory : WebApplicationFactory<BEQSAN.Api.Program>, IAsyncLifetime
{
    private SqliteConnection? _sharedConnection;

    public Task InitializeAsync()
    {
        // Shared in-memory SQLite — survives across DbContext instances for the test lifetime.
        _sharedConnection = new SqliteConnection("Data Source=:memory:");
        _sharedConnection.Open();
        return Task.CompletedTask;
    }

    public new Task DisposeAsync()
    {
        _sharedConnection?.Dispose();
        return base.DisposeAsync().AsTask();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:ConnectionString"] = "DataSource=:memory:",
                ["Storage:LocalRoot"] = Path.Combine(Path.GetTempPath(), "beqsan-tests", Guid.NewGuid().ToString("N")),
            });
        });

        builder.ConfigureServices(services =>
        {
            // Replace the registered DbContext with one bound to our shared in-memory connection.
            var dbContextDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<BeqsanDbContext>));
            if (dbContextDescriptor is not null)
            {
                services.Remove(dbContextDescriptor);
            }

            services.AddDbContext<BeqsanDbContext>(opts =>
            {
                opts.UseSqlite(_sharedConnection!);
            });
        });
    }
}
