using BEQSAN.Application;
using BEQSAN.Infrastructure;
using BEQSAN.Worker;
using Serilog;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddSerilog((services, configuration) =>
{
    configuration
        .ReadFrom.Configuration(builder.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext();
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHostedService<KeepAliveWorker>();

var host = builder.Build();

await host.Services.InitializeDatabaseAsync().ConfigureAwait(false);
await host.RunAsync().ConfigureAwait(false);
