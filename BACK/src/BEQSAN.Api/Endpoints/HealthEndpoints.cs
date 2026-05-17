using System.Reflection;
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

        group.MapGet("", async (IBeqsanDbContext db, CancellationToken ct) =>
            {
                var commitSha = Environment.GetEnvironmentVariable("GIT_COMMIT_SHA") ?? "dev";
                var uptime = DateTime.UtcNow - StartedAt;

                bool dbOk;
                try
                {
                    dbOk = await db.CanConnectAsync(ct).ConfigureAwait(false);
                }
                catch
                {
                    dbOk = false;
                }

                var payload = new HealthResponse(
                    Status: dbOk ? "ok" : "degraded",
                    Version: Version,
                    CommitSha: commitSha,
                    UptimeSeconds: (long)uptime.TotalSeconds,
                    DbStatus: dbOk ? "up" : "down",
                    TimestampUtc: DateTime.UtcNow);

                return dbOk
                    ? Results.Ok(payload)
                    : Results.Json(payload, statusCode: StatusCodes.Status503ServiceUnavailable);
            })
            .WithName("HealthCheck")
            .WithSummary("Liveness + DB readiness probe");

        return app;
    }
}

public sealed record HealthResponse(
    string Status,
    string Version,
    string CommitSha,
    long UptimeSeconds,
    string DbStatus,
    DateTime TimestampUtc);
