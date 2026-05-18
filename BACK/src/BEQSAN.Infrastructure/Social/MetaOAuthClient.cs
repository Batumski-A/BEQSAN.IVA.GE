using System.Net.Http.Json;
using System.Text.Json.Serialization;
using BEQSAN.Application.Social.Contracts;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BEQSAN.Infrastructure.Social;

/// <summary>
/// Meta Graph OAuth flow. Modeled on social.iva.ge/backend/src/lib/meta.ts but
/// without the login-config-id branch — we use classic scope-based login until
/// the BEQSAN Meta App is approved for Login-for-Business. See ADR-0003.
/// </summary>
internal sealed class MetaOAuthClient(
    HttpClient http,
    IOptions<SocialOptions> options,
    ILogger<MetaOAuthClient> logger) : IMetaOAuthClient
{
    private readonly MetaOptions _meta = options.Value.Meta;
    private string GraphUrl => $"https://graph.facebook.com/{_meta.ApiVersion}";

    public string BuildAuthorizeUrl(string state)
    {
        var q = new Dictionary<string, string?>
        {
            ["client_id"] = _meta.AppId,
            ["redirect_uri"] = _meta.RedirectUri,
            ["state"] = state,
            ["response_type"] = "code",
            ["scope"] = _meta.Scope,
        };
        var query = string.Join('&', q.Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value ?? string.Empty)}"));
        return $"https://www.facebook.com/{_meta.ApiVersion}/dialog/oauth?{query}";
    }

    public async Task<MetaTokenResponse> ExchangeCodeAsync(string code, CancellationToken ct)
    {
        var url = $"{GraphUrl}/oauth/access_token" +
                  $"?client_id={Uri.EscapeDataString(_meta.AppId)}" +
                  $"&client_secret={Uri.EscapeDataString(_meta.AppSecret)}" +
                  $"&redirect_uri={Uri.EscapeDataString(_meta.RedirectUri)}" +
                  $"&code={Uri.EscapeDataString(code)}";
        var resp = await http.GetFromJsonAsync<TokenJson>(url, ct).ConfigureAwait(false)
                   ?? throw new InvalidOperationException("Meta returned empty token response");
        return new MetaTokenResponse(resp.AccessToken ?? string.Empty, resp.ExpiresIn ?? 3600);
    }

    public async Task<MetaTokenResponse> ExchangeForLongLivedAsync(string shortLivedToken, CancellationToken ct)
    {
        var url = $"{GraphUrl}/oauth/access_token" +
                  $"?grant_type=fb_exchange_token" +
                  $"&client_id={Uri.EscapeDataString(_meta.AppId)}" +
                  $"&client_secret={Uri.EscapeDataString(_meta.AppSecret)}" +
                  $"&fb_exchange_token={Uri.EscapeDataString(shortLivedToken)}";
        var resp = await http.GetFromJsonAsync<TokenJson>(url, ct).ConfigureAwait(false)
                   ?? throw new InvalidOperationException("Meta returned empty long-lived token response");
        return new MetaTokenResponse(resp.AccessToken ?? string.Empty, resp.ExpiresIn ?? 60L * 24 * 60 * 60);
    }

    public async Task<MetaUserProfile> GetUserProfileAsync(string accessToken, CancellationToken ct)
    {
        var url = $"{GraphUrl}/me?fields=id,name&access_token={Uri.EscapeDataString(accessToken)}";
        var resp = await http.GetFromJsonAsync<MeJson>(url, ct).ConfigureAwait(false)
                   ?? throw new InvalidOperationException("Meta /me returned empty");
        return new MetaUserProfile(resp.Id ?? string.Empty, resp.Name ?? string.Empty);
    }

    public async Task<IReadOnlyList<MetaPageDescriptor>> GetPagesAsync(string userAccessToken, CancellationToken ct)
    {
        var all = new List<MetaPageDescriptor>();
        var url = $"{GraphUrl}/me/accounts?fields=id,name,access_token,instagram_business_account{{id,username}}" +
                  $"&limit=100&access_token={Uri.EscapeDataString(userAccessToken)}";
        while (!string.IsNullOrEmpty(url))
        {
            var resp = await http.GetFromJsonAsync<PagesJson>(url, ct).ConfigureAwait(false);
            if (resp?.Data is null)
            {
                break;
            }
            foreach (var p in resp.Data)
            {
                if (string.IsNullOrEmpty(p.Id) || string.IsNullOrEmpty(p.AccessToken))
                {
                    continue;
                }
                all.Add(new MetaPageDescriptor(
                    p.Id, p.Name ?? string.Empty, p.AccessToken,
                    p.InstagramBusinessAccount?.Id,
                    p.InstagramBusinessAccount?.Username));
            }
            url = resp.Paging?.Next ?? string.Empty;
        }
        logger.LogInformation("Fetched {Count} Meta pages", all.Count);
        return all;
    }

    private sealed class TokenJson
    {
        [JsonPropertyName("access_token")] public string? AccessToken { get; set; }
        [JsonPropertyName("token_type")] public string? TokenType { get; set; }
        [JsonPropertyName("expires_in")] public long? ExpiresIn { get; set; }
    }

    private sealed class MeJson
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("name")] public string? Name { get; set; }
    }

    private sealed class PagesJson
    {
        [JsonPropertyName("data")] public List<PageJson>? Data { get; set; }
        [JsonPropertyName("paging")] public PagingJson? Paging { get; set; }
    }

    private sealed class PageJson
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("name")] public string? Name { get; set; }
        [JsonPropertyName("access_token")] public string? AccessToken { get; set; }
        [JsonPropertyName("instagram_business_account")] public IgBusinessJson? InstagramBusinessAccount { get; set; }
    }

    private sealed class IgBusinessJson
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("username")] public string? Username { get; set; }
    }

    private sealed class PagingJson
    {
        [JsonPropertyName("next")] public string? Next { get; set; }
    }
}
