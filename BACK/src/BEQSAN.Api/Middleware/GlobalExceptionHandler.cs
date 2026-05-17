using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace BEQSAN.Api.Middleware;

internal sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger = logger;

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var correlationId = httpContext.Items.TryGetValue("X-Correlation-Id", out var corr)
            ? corr?.ToString()
            : null;

        _logger.LogError(
            exception,
            "Unhandled exception during request {Method} {Path} (correlationId={CorrelationId})",
            httpContext.Request.Method,
            httpContext.Request.Path,
            correlationId);

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Type = "https://beqsan.iva.ge/errors/failure",
            Title = "internal.error",
            Detail = "გავიდა მცირე ხარვეზი ჩვენს მხარეზე. სცადე თავიდან, თუ პრობლემა გრძელდება — დაგვიკავშირდი.",
        };
        problem.Extensions["correlationId"] = correlationId;

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken).ConfigureAwait(false);
        return true;
    }
}
