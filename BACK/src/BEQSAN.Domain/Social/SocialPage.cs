namespace BEQSAN.Domain.Social;

/// <summary>
/// A Facebook Page (and its optional Instagram business account) connected via
/// <see cref="SocialAccount"/>. The page-scoped long-lived token is what we use
/// for all publish/inbox/comment calls — never the user token. <see cref="IgUserId"/>
/// is the Instagram business account id; if null, IG publishing is disabled for
/// this page.
/// </summary>
public sealed class SocialPage
{
    public Guid Id { get; init; }
    public Guid AccountId { get; init; }

    /// <summary>Meta page id (numeric string).</summary>
    public string MetaPageId { get; init; } = string.Empty;

    public string Name { get; private set; } = string.Empty;
    public string? IgUserId { get; private set; }
    public string? IgUsername { get; private set; }

    /// <summary>Encrypted page-scoped long-lived access token.</summary>
    public EncryptedToken PageToken { get; private set; } = default!;

    public DateTime ConnectedAtUtc { get; init; }
    public DateTime LastSyncedAtUtc { get; private set; }
    public bool IsActive { get; private set; }

    public static SocialPage Create(
        Guid accountId,
        string metaPageId,
        string name,
        EncryptedToken pageToken,
        string? igUserId,
        string? igUsername)
    {
        return new SocialPage
        {
            Id = Guid.NewGuid(),
            AccountId = accountId,
            MetaPageId = metaPageId,
            Name = name,
            PageToken = pageToken,
            IgUserId = igUserId,
            IgUsername = igUsername,
            ConnectedAtUtc = DateTime.UtcNow,
            LastSyncedAtUtc = DateTime.UtcNow,
            IsActive = true,
        };
    }

    public void Sync(string name, string? igUserId, string? igUsername, EncryptedToken pageToken)
    {
        Name = name;
        IgUserId = igUserId;
        IgUsername = igUsername;
        PageToken = pageToken;
        LastSyncedAtUtc = DateTime.UtcNow;
        IsActive = true;
    }

    public void Deactivate()
    {
        IsActive = false;
    }
}
