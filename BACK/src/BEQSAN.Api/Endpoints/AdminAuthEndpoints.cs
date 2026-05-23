using BEQSAN.Api.Common;
using BEQSAN.Domain.Admin;
using BEQSAN.Infrastructure.Persistence;
using BEQSAN.Infrastructure.Security;
using BEQSAN.Infrastructure.Social;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BEQSAN.Api.Endpoints;

/// <summary>
/// Public admin auth endpoints — the only admin routes that bypass the
/// <see cref="Middleware.AdminTokenAuthMiddleware"/>:
/// <list type="bullet">
///   <item><c>GET  /api/v1/admin/auth/setup-status</c> — does an owner account exist yet?</item>
///   <item><c>POST /api/v1/admin/auth/setup</c> — create the first owner (one-shot).</item>
///   <item><c>POST /api/v1/admin/auth/login</c> — exchange credentials for the admin token.</item>
/// </list>
/// <para>
/// Phase 2 — first-install flow modeled after WordPress: the very first
/// admin self-registers and becomes the owner; subsequent users will be
/// created from inside the admin UI (Phase 3).
/// </para>
/// </summary>
public static class AdminAuthEndpoints
{
    public static IEndpointRouteBuilder MapAdminAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/auth").WithTags("AdminAuth");

        group.MapGet("setup-status", async (BeqsanDbContext db, CancellationToken ct) =>
        {
            var hasOwner = await db.AdminUsers
                .AsNoTracking()
                .AnyAsync(u => u.IsOwner, ct)
                .ConfigureAwait(false);

            return Results.Json(new
            {
                isSuccess = true,
                value = new { hasOwner },
            });
        })
        .WithName("AdminAuthSetupStatus")
        .WithSummary("Has the owner account been created yet?");

        group.MapPost("setup", async (
            [FromBody] SetupRequest body,
            BeqsanDbContext db,
            IOptions<SocialOptions> socialOptions,
            CancellationToken ct) =>
        {
            var token = socialOptions.Value.AdminToken;
            if (string.IsNullOrWhiteSpace(token))
            {
                return Fail(StatusCodes.Status503ServiceUnavailable, "auth.notConfigured",
                    "Admin token არ არის კონფიგურირებული.");
            }

            var existingOwner = await db.AdminUsers
                .AsNoTracking()
                .AnyAsync(u => u.IsOwner, ct)
                .ConfigureAwait(false);
            if (existingOwner)
            {
                return Fail(StatusCodes.Status409Conflict, "auth.alreadySetup",
                    "ადმინი უკვე არსებობს. შესვლის ფორმა გამოიყენე.");
            }

            var username = (body.Username ?? string.Empty).Trim();
            var password = body.Password ?? string.Empty;
            var displayName = string.IsNullOrWhiteSpace(body.DisplayName) ? username : body.DisplayName.Trim();

            if (username.Length is < 3 or > 64)
            {
                return Fail(StatusCodes.Status400BadRequest, "auth.usernameInvalid",
                    "მომხმარებლის სახელი უნდა იყოს 3-64 სიმბოლო.", "username");
            }
            if (password.Length < 8)
            {
                return Fail(StatusCodes.Status400BadRequest, "auth.passwordTooShort",
                    "პაროლი მინიმუმ 8 სიმბოლო უნდა იყოს.", "password");
            }
            if (password.Length > 256)
            {
                return Fail(StatusCodes.Status400BadRequest, "auth.passwordTooLong",
                    "პაროლი 256 სიმბოლოზე გრძელი არ შეიძლება იყოს.", "password");
            }

            var usernameTaken = await db.AdminUsers
                .AnyAsync(u => u.Username == username, ct)
                .ConfigureAwait(false);
            if (usernameTaken)
            {
                return Fail(StatusCodes.Status409Conflict, "auth.usernameTaken",
                    "ეს მომხმარებლის სახელი დაკავებულია.", "username");
            }

            var now = DateTime.UtcNow;
            var user = new AdminUser
            {
                Id = Guid.NewGuid(),
                Username = username,
                PasswordHash = PasswordHasher.Hash(password),
                DisplayName = displayName,
                IsOwner = true,
                CreatedAtUtc = now,
                LastLoginAtUtc = now,
            };
            db.AdminUsers.Add(user);
            await db.SaveChangesAsync(ct).ConfigureAwait(false);

            return Results.Json(new
            {
                isSuccess = true,
                value = new
                {
                    token,
                    username = user.Username,
                    displayName = user.DisplayName,
                    isOwner = user.IsOwner,
                },
            });
        })
        .WithName("AdminAuthSetup")
        .WithSummary("Create the first admin (owner). Only succeeds when no owner exists yet.");

        group.MapPost("login", async (
                [FromBody] LoginRequest body,
                BeqsanDbContext db,
                IOptions<AdminAuthOptions> authOptions,
                IOptions<SocialOptions> socialOptions,
                CancellationToken ct) =>
            {
                var token = socialOptions.Value.AdminToken;
                if (string.IsNullOrWhiteSpace(token))
                {
                    return Fail(StatusCodes.Status503ServiceUnavailable, "auth.notConfigured",
                        "ადმინისტრატორის ანგარიში არ არის კონფიგურირებული.");
                }

                var username = (body.Username ?? string.Empty).Trim();
                var password = body.Password ?? string.Empty;
                if (username.Length == 0 || password.Length == 0)
                {
                    return Fail(StatusCodes.Status401Unauthorized, "auth.invalidCredentials",
                        "მომხმარებელი ან პაროლი არასწორია.");
                }

                var user = await db.AdminUsers
                    .FirstOrDefaultAsync(u => u.Username == username, ct)
                    .ConfigureAwait(false);

                if (user is not null)
                {
                    if (!PasswordHasher.Verify(password, user.PasswordHash))
                    {
                        return Fail(StatusCodes.Status401Unauthorized, "auth.invalidCredentials",
                            "მომხმარებელი ან პაროლი არასწორია.");
                    }

                    user.LastLoginAtUtc = DateTime.UtcNow;
                    await db.SaveChangesAsync(ct).ConfigureAwait(false);

                    return Results.Json(new
                    {
                        isSuccess = true,
                        value = new
                        {
                            token,
                            username = user.Username,
                            displayName = user.DisplayName,
                            isOwner = user.IsOwner,
                        },
                    });
                }

                // Legacy env-var fallback — only honored when the DB has NO
                // admin users yet (transitional bridge for the existing
                // AdminAuth:Username / AdminAuth:Password setup).
                var dbEmpty = !await db.AdminUsers.AnyAsync(ct).ConfigureAwait(false);
                var auth = authOptions.Value;
                if (dbEmpty
                    && !string.IsNullOrWhiteSpace(auth.Username)
                    && !string.IsNullOrWhiteSpace(auth.Password)
                    && ConstantTimeEquals(username, auth.Username)
                    && ConstantTimeEquals(password, auth.Password))
                {
                    return Results.Json(new
                    {
                        isSuccess = true,
                        value = new
                        {
                            token,
                            username = auth.Username,
                            displayName = auth.Username,
                            isOwner = true,
                        },
                    });
                }

                return Fail(StatusCodes.Status401Unauthorized, "auth.invalidCredentials",
                    "მომხმარებელი ან პაროლი არასწორია.");
            })
            .WithName("AdminLogin")
            .WithSummary("Exchange username + password for the admin token.");

        return app;
    }

    private static IResult Fail(int status, string code, string message, string? field = null) =>
        Results.Json(new
        {
            isSuccess = false,
            errors = new[]
            {
                new { code, message, field },
            },
        }, statusCode: status);

    /// <summary>
    /// Length-independent constant-time string equality for the legacy
    /// env-var fallback. The DB-backed path uses FixedTimeEquals on the
    /// hash bytes inside <see cref="PasswordHasher.Verify"/>.
    /// </summary>
    private static bool ConstantTimeEquals(string a, string b)
    {
        var maxLen = Math.Max(a.Length, b.Length);
        var diff = a.Length ^ b.Length;
        for (var i = 0; i < maxLen; i++)
        {
            var ac = i < a.Length ? a[i] : (char)0;
            var bc = i < b.Length ? b[i] : (char)0;
            diff |= ac ^ bc;
        }
        return diff == 0;
    }

    public sealed record LoginRequest(string? Username, string? Password);
    public sealed record SetupRequest(string? Username, string? Password, string? DisplayName);
}
