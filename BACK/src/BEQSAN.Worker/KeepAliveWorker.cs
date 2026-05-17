namespace BEQSAN.Worker;

/// <summary>
/// Placeholder worker. Hangfire job hosting wires in here once we have background jobs
/// (SMS queue, AI requests, PDF generation, nightly DB backup).
/// </summary>
internal sealed partial class KeepAliveWorker(ILogger<KeepAliveWorker> logger) : BackgroundService
{
    private static readonly TimeSpan Heartbeat = TimeSpan.FromMinutes(5);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        LogStartup(logger);

        while (!stoppingToken.IsCancellationRequested)
        {
            LogHeartbeat(logger, DateTimeOffset.UtcNow);

            try
            {
                await Task.Delay(Heartbeat, stoppingToken).ConfigureAwait(false);
            }
            catch (TaskCanceledException)
            {
                // graceful shutdown
            }
        }
    }

    [LoggerMessage(EventId = 1, Level = LogLevel.Information, Message = "Worker started")]
    static partial void LogStartup(ILogger logger);

    [LoggerMessage(EventId = 2, Level = LogLevel.Debug, Message = "Worker heartbeat at {Timestamp:O}")]
    static partial void LogHeartbeat(ILogger logger, DateTimeOffset timestamp);
}
