namespace BEQSAN.Application.Social.Contracts;

/// <summary>
/// OAuth flow with Meta — build the consent URL, exchange the code, upgrade to
/// long-lived, discover pages + IG business accounts. No persistence concerns:
/// returns plain DTOs, the use-case handler turns them into Domain entities.
/// </summary>
public interface IMetaOAuthClient
{
    /// <summary>
    /// Build the dialog URL the admin will be redirected to. <paramref name="state"/>
    /// is a CSRF nonce we generate and verify on the callback.
    /// </summary>
    string BuildAuthorizeUrl(string state);

    Task<MetaTokenResponse> ExchangeCodeAsync(string code, CancellationToken ct);

    Task<MetaTokenResponse> ExchangeForLongLivedAsync(string shortLivedToken, CancellationToken ct);

    Task<MetaUserProfile> GetUserProfileAsync(string accessToken, CancellationToken ct);

    /// <summary>
    /// All pages the user has admin access to, with their page-scoped tokens and
    /// linked IG business account (if any).
    /// </summary>
    Task<IReadOnlyList<MetaPageDescriptor>> GetPagesAsync(string userAccessToken, CancellationToken ct);
}
