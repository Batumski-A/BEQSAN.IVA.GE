namespace BEQSAN.Domain.Social;

public enum InboxChannel
{
    /// <summary>Instagram direct message conversation.</summary>
    InstagramDm = 1,

    /// <summary>Facebook Messenger conversation.</summary>
    FacebookMessenger = 2,

    /// <summary>Comment thread under an Instagram post.</summary>
    InstagramComment = 3,

    /// <summary>Comment thread under a Facebook post.</summary>
    FacebookComment = 4,
}

/// <summary>
/// One conversation. For DMs that's a Messenger thread; for comments it's the
/// per-post comment list (we group all top-level comments + their replies into
/// a single thread keyed on the post). Last-message preview + unread flag are
/// denormalized off the message stream for cheap list rendering.
/// </summary>
public sealed class InboxThread
{
    public Guid Id { get; init; }
    public Guid PageId { get; init; }
    public InboxChannel Channel { get; init; }

    /// <summary>Meta-side stable id for the thread (conversation id or post id).</summary>
    public string ExternalThreadId { get; init; } = string.Empty;

    /// <summary>The customer's Meta-side user id (PSID or IGSID).</summary>
    public string ParticipantId { get; private set; } = string.Empty;
    public string ParticipantName { get; private set; } = string.Empty;

    public string LastMessagePreview { get; private set; } = string.Empty;
    public DateTime LastMessageAtUtc { get; private set; }
    public bool HasUnread { get; private set; }

    public DateTime CreatedAtUtc { get; init; }

    public static InboxThread Create(
        Guid pageId,
        InboxChannel channel,
        string externalThreadId,
        string participantId,
        string participantName)
    {
        var now = DateTime.UtcNow;
        return new InboxThread
        {
            Id = Guid.NewGuid(),
            PageId = pageId,
            Channel = channel,
            ExternalThreadId = externalThreadId,
            ParticipantId = participantId,
            ParticipantName = participantName,
            LastMessagePreview = string.Empty,
            LastMessageAtUtc = now,
            HasUnread = false,
            CreatedAtUtc = now,
        };
    }

    public void RecordIncoming(string preview, DateTime atUtc, string? participantName = null)
    {
        LastMessagePreview = Truncate(preview);
        LastMessageAtUtc = atUtc;
        HasUnread = true;
        if (!string.IsNullOrWhiteSpace(participantName))
        {
            ParticipantName = participantName;
        }
    }

    public void RecordOutgoing(string preview, DateTime atUtc)
    {
        LastMessagePreview = Truncate(preview);
        LastMessageAtUtc = atUtc;
        HasUnread = false;
    }

    public void MarkRead() => HasUnread = false;

    private static string Truncate(string s) => s.Length <= 140 ? s : s[..140];
}
