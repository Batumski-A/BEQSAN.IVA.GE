namespace BEQSAN.Domain.Social;

public enum InboxDirection
{
    Inbound = 1,
    Outbound = 2,
}

/// <summary>
/// One message inside an <see cref="InboxThread"/>. For comment-channel threads,
/// each <see cref="InboxMessage"/> is a comment (top-level or reply) on the
/// linked post. Meta-side id stays unique-per-page.
/// </summary>
public sealed class InboxMessage
{
    public Guid Id { get; init; }
    public Guid ThreadId { get; init; }
    public Guid PageId { get; init; }
    public string ExternalMessageId { get; init; } = string.Empty;
    public InboxDirection Direction { get; init; }
    public string AuthorId { get; init; } = string.Empty;
    public string AuthorName { get; init; } = string.Empty;
    public string Text { get; init; } = string.Empty;
    public string? AttachmentUrl { get; init; }
    public DateTime AtUtc { get; init; }
    public DateTime CreatedAtUtc { get; init; }

    public static InboxMessage Create(
        Guid threadId,
        Guid pageId,
        string externalMessageId,
        InboxDirection direction,
        string authorId,
        string authorName,
        string text,
        string? attachmentUrl,
        DateTime atUtc)
    {
        return new InboxMessage
        {
            Id = Guid.NewGuid(),
            ThreadId = threadId,
            PageId = pageId,
            ExternalMessageId = externalMessageId,
            Direction = direction,
            AuthorId = authorId,
            AuthorName = authorName,
            Text = text,
            AttachmentUrl = attachmentUrl,
            AtUtc = atUtc,
            CreatedAtUtc = DateTime.UtcNow,
        };
    }
}
