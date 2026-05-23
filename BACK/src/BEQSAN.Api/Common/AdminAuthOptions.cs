namespace BEQSAN.Api.Common;

/// <summary>
/// Phase-1 admin login credentials. Single admin account; values come from
/// configuration (env vars in prod, user-secrets in dev). On a correct
/// login the API echoes back <see cref="BEQSAN.Infrastructure.Social.SocialOptions.AdminToken"/>
/// so the SPA can reuse the existing <c>X-Admin-Token</c> middleware.
/// </summary>
public sealed class AdminAuthOptions
{
    public const string SectionName = "AdminAuth";

    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
