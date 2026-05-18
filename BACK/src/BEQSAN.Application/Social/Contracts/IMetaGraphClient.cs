using BEQSAN.Domain.Social;

namespace BEQSAN.Application.Social.Contracts;

/// <summary>
/// Authenticated Meta Graph operations on behalf of a single page. The caller
/// passes the decrypted page-scoped token explicitly — this client doesn't
/// touch persistence and doesn't decide which page is active.
/// </summary>
public interface IMetaGraphClient
{
    Task<MetaPublishResult> PublishFacebookPostAsync(
        string pageAccessToken,
        string metaPageId,
        string caption,
        IReadOnlyList<string> imageUrls,
        CancellationToken ct);

    Task<MetaPublishResult> PublishInstagramPostAsync(
        string pageAccessToken,
        string igUserId,
        string caption,
        IReadOnlyList<string> imageUrls,
        CancellationToken ct);

    /// <summary>
    /// Page conversations (DMs) — pulled on demand or on a poll. The page-scoped
    /// token is required; messenger + IG share the endpoint via the `platform`
    /// query param.
    /// </summary>
    Task<IReadOnlyList<MetaConversationDescriptor>> ListConversationsAsync(
        string pageAccessToken,
        string metaPageId,
        InboxChannel channel,
        CancellationToken ct);

    Task<IReadOnlyList<MetaInboxMessage>> ListThreadMessagesAsync(
        string pageAccessToken,
        string externalThreadId,
        CancellationToken ct);

    Task<string> SendMessageAsync(
        string pageAccessToken,
        string metaPageId,
        InboxChannel channel,
        string recipientId,
        string text,
        CancellationToken ct);

    Task<IReadOnlyList<MetaInboxComment>> ListPostCommentsAsync(
        string pageAccessToken,
        string externalPostId,
        CancellationToken ct);

    Task<string> ReplyToCommentAsync(
        string pageAccessToken,
        string commentId,
        string text,
        CancellationToken ct);
}
