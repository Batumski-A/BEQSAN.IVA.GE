using System.Diagnostics;
using System.Reflection;
using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Application.Common.Persistence;

namespace BEQSAN.Api.Endpoints;

public static class HealthEndpoints
{
    private static readonly DateTime StartedAt = DateTime.UtcNow;
    private static readonly string Version =
        Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "0.0.0";

    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/health").WithTags("Health");

        group.MapGet("", async (
                IBeqsanDbContext db,
                ICacheService cache,
                IStorageService storage,
                CancellationToken ct) =>
            {
                var dbProbe = await ProbeAsync(db.PingAsync, ct).ConfigureAwait(false);
                var cacheProbe = await ProbeAsync(cache.PingAsync, ct).ConfigureAwait(false);
                var storageProbe = await ProbeAsync(storage.PingAsync, ct).ConfigureAwait(false);

                var checks = new HealthChecks(dbProbe, cacheProbe, storageProbe);

                var aggregateStatus = AggregateStatus(checks);
                var commitSha = Environment.GetEnvironmentVariable("GIT_COMMIT_SHA") ?? "dev";
                var uptime = DateTime.UtcNow - StartedAt;

                var payload = new HealthResponse(
                    Status: aggregateStatus,
                    Version: Version,
                    CommitSha: commitSha,
                    UptimeSeconds: (long)uptime.TotalSeconds,
                    Checks: checks,
                    TimestampUtc: DateTime.UtcNow);

                return aggregateStatus == "down"
                    ? Results.Json(payload, statusCode: StatusCodes.Status503ServiceUnavailable)
                    : Results.Ok(payload);
            })
            .WithName("HealthCheck")
            .WithSummary("Liveness + dependency probes (DB, cache, storage) with latency");

        return app;
    }

    private static async Task<ProbeResult> ProbeAsync(
        Func<CancellationToken, Task<bool>> probe,
        CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var ok = await probe(ct).ConfigureAwait(false);
            sw.Stop();
            return new ProbeResult(ok ? "up" : "down", sw.ElapsedMilliseconds);
        }
        catch
        {
            sw.Stop();
            return new ProbeResult("down", sw.ElapsedMilliseconds);
        }
    }

    private static string AggregateStatus(HealthChecks checks)
    {
        if (checks.Db.Status == "down" || checks.Cache.Status == "down" || checks.Storage.Status == "down")
        {
            return "down";
        }

        if (checks.Db.Status == "degraded" || checks.Cache.Status == "degraded" || checks.Storage.Status == "degraded")
        {
            return "degraded";
        }

        return "ok";
    }
}

public sealed record HealthResponse(
    string Status,
    string Version,
    string CommitSha,
    long UptimeSeconds,
    HealthChecks Checks,
    DateTime TimestampUtc);

public sealed record HealthChecks(
    ProbeResult Db,
    ProbeResult Cache,
    ProbeResult Storage);

public sealed record ProbeResult(string Status, long LatencyMs);
