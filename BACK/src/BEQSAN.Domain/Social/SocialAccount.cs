namespace BEQSAN.Domain.Social;

/// <summary>
/// Meta user-level account connected by the workspace owner. Holds the long-lived
/// user access token. Pages and IG business accounts hang off this via
/// <see cref="SocialPage"/>. A workspace usually has 1-2 (one personal, one
/// business). Soft-delete via <see cref="DisconnectedAtUtc"/> — we keep historic
/// posts after a disconnect so audit lookups still work.
/// </summary>
public sealed class SocialAccount
{
    public Guid Id { get; init; }

    /// <summary>Meta user id (numeric string returned by /me).</summary>
    public string MetaUserId { get; init; } = string.Empty;

    /// <summary>Display name returned by /me.</summary>
    public string DisplayName { get; private set; } = string.Empty;

    /// <summary>Encrypted long-lived user access token.</summary>
    public EncryptedToken UserToken { get; private set; } = default!;

    public DateTime ConnectedAtUtc { get; init; }
    public DateTime? DisconnectedAtUtc { get; private set; }
    public DateTime LastRefreshedAtUtc { get; private set; }

    public bool IsActive => DisconnectedAtUtc is null;

    public static SocialAccount Create(
        string metaUserId,
        string displayName,
        EncryptedToken token)
    {
        return new SocialAccount
        {
            Id = Guid.NewGuid(),
            MetaUserId = metaUserId,
            DisplayName = displayName,
            UserToken = token,
            ConnectedAtUtc = DateTime.UtcNow,
            LastRefreshedAtUtc = DateTime.UtcNow,
        };
    }

    public void RefreshToken(EncryptedToken token)
    {
        UserToken = token;
        LastRefreshedAtUtc = DateTime.UtcNow;
    }

    public void Disconnect()
    {
        DisconnectedAtUtc = DateTime.UtcNow;
    }

    public void Rename(string displayName)
    {
        if (!string.IsNullOrWhiteSpace(displayName))
        {
            DisplayName = displayName;
        }
    }
}
