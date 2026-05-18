namespace BEQSAN.Domain.Social;

public enum SocialPostStatus
{
    Draft = 0,
    Publishing = 1,
    Published = 2,
    Failed = 3,
}

/// <summary>
/// Outbound publish record. One row per (page, platform) target — a single
/// composer submission that fans out to both FB + IG produces two rows that
/// share a <see cref="ComposerId"/>. <see cref="ExternalPostId"/> is the Meta
/// id we get back after publish (used to link comments + insights later).
/// </summary>
public sealed class SocialPost
{
    public Guid Id { get; init; }
    public Guid ComposerId { get; init; }
    public Guid PageId { get; init; }
    public SocialPlatform Platform { get; init; }
    public string Caption { get; init; } = string.Empty;
    public IReadOnlyList<string> ImageUrls { get; init; } = [];
    public SocialPostStatus Status { get; private set; }
    public string? ExternalPostId { get; private set; }
    public string? ExternalPermalink { get; private set; }
    public string? FailureReason { get; private set; }
    public DateTime CreatedAtUtc { get; init; }
    public DateTime? PublishedAtUtc { get; private set; }

    public static SocialPost Create(
        Guid composerId,
        Guid pageId,
        SocialPlatform platform,
        string caption,
        IReadOnlyList<string> imageUrls)
    {
        return new SocialPost
        {
            Id = Guid.NewGuid(),
            ComposerId = composerId,
            PageId = pageId,
            Platform = platform,
            Caption = caption,
            ImageUrls = imageUrls,
            Status = SocialPostStatus.Draft,
            CreatedAtUtc = DateTime.UtcNow,
        };
    }

    public void MarkPublishing() => Status = SocialPostStatus.Publishing;

    public void MarkPublished(string externalId, string? permalink)
    {
        Status = SocialPostStatus.Published;
        ExternalPostId = externalId;
        ExternalPermalink = permalink;
        PublishedAtUtc = DateTime.UtcNow;
    }

    public void MarkFailed(string reason)
    {
        Status = SocialPostStatus.Failed;
        FailureReason = reason;
    }
}
