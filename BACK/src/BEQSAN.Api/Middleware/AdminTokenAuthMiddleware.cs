using BEQSAN.Infrastructure.Social;
using Microsoft.Extensions.Options;

namespace BEQSAN.Api.Middleware;

/// <summary>
/// Phase 0 admin gate — checks <c>X-Admin-Token</c> against
/// <c>Social:AdminToken</c> from configuration. Bypasses the public catalog and
/// configurator routes; only paths under <c>/api/v1/admin/</c> require the
/// header. Replaced by JWT-bearer auth once the auth feature ships
/// (see [docs/questions.md] entry: „admin auth: Phase 2 — proper JWT").
/// </summary>
public sealed class AdminTokenAuthMiddleware(RequestDelegate next, IOptions<SocialOptions> options)
{
    private const string HeaderName = "X-Admin-Token";
    private const string ProtectedPrefix = "/api/v1/admin/";

    /// <summary>
    /// Auth endpoints reachable without the admin token. The SPA needs
    /// these to (a) detect if the owner exists yet, (b) create the owner
    /// on first install, (c) exchange credentials for the token.
    /// </summary>
    private static readonly string[] PublicPaths =
    [
        "/api/v1/admin/auth/login",
        "/api/v1/admin/auth/setup",
        "/api/v1/admin/auth/setup-status",
    ];

    private readonly string _expected = options.Value.AdminToken ?? string.Empty;

    public async Task InvokeAsync(HttpContext ctx)
    {
        var path = ctx.Request.Path.Value ?? string.Empty;
        var isPublic = false;
        foreach (var p in PublicPaths)
        {
            if (path.Equals(p, StringComparison.OrdinalIgnoreCase))
            {
                isPublic = true;
                break;
            }
        }
        if (path.StartsWith(ProtectedPrefix, StringComparison.OrdinalIgnoreCase) && !isPublic)
        {
            if (string.IsNullOrEmpty(_expected))
            {
                ctx.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
                await ctx.Response.WriteAsJsonAsync(new
                {
                    isSuccess = false,
                    errors = new[]
                    {
                        new { code = "auth.adminToken.notConfigured", message = "Admin token არ არის კონფიგურირებული." },
                    },
                }).ConfigureAwait(false);
                return;
            }
            if (!ctx.Request.Headers.TryGetValue(HeaderName, out var provided) || provided != _expected)
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await ctx.Response.WriteAsJsonAsync(new
                {
                    isSuccess = false,
                    errors = new[]
                    {
                        new { code = "auth.adminToken.invalid", message = "ადმინისტრატორის ტოკენი ვერ მოწმდება." },
                    },
                }).ConfigureAwait(false);
                return;
            }
        }
        await next(ctx).ConfigureAwait(false);
    }
}
