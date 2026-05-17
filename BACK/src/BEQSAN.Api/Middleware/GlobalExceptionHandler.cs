using BEQSAN.Api.Common;
using Microsoft.AspNetCore.Diagnostics;

namespace BEQSAN.Api.Middleware;

internal sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    private const string InternalErrorCode = "internal.error";
    private const string InternalErrorMessage =
        "გავიდა მცირე ხარვეზი ჩვენს მხარეზე. სცადე თავიდან, თუ პრობლემა გრძელდება — დაგვიკავშირდი.";

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

        // Wire shape matches every other endpoint — clients can rely on { isSuccess, value, errors }
        // for every 5xx, not just for handler-returned Result<T> failures.
        var envelope = ApiResponse<object>.Failure(
        [
            new ApiError(InternalErrorCode, InternalErrorMessage, Field: null),
        ]);

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsJsonAsync(envelope, cancellationToken).ConfigureAwait(false);
        return true;
    }
}
