namespace BEQSAN.Application.Social.Contracts;

/// <summary>
/// Result of exchanging an OAuth code for a long-lived token. <see cref="ExpiresInSeconds"/>
/// is what Meta returns (typically ~5184000 = 60 days); the application layer turns
/// that into an absolute UTC timestamp before persisting.
/// </summary>
public sealed record MetaTokenResponse(string AccessToken, long ExpiresInSeconds);

public sealed record MetaUserProfile(string MetaUserId, string DisplayName);

public sealed record MetaPageDescriptor(
    string MetaPageId,
    string Name,
    string PageAccessToken,
    string? IgUserId,
    string? IgUsername);

public sealed record MetaPublishResult(string ExternalPostId, string? Permalink);

public sealed record MetaInboxComment(
    string ExternalCommentId,
    string FromUserId,
    string FromUserName,
    string Text,
    DateTime AtUtc,
    string? ParentCommentId);

public sealed record MetaInboxMessage(
    string ExternalMessageId,
    string FromUserId,
    string FromUserName,
    string Text,
    string? AttachmentUrl,
    DateTime AtUtc);

public sealed record MetaConversationDescriptor(
    string ExternalThreadId,
    string ParticipantId,
    string ParticipantName,
    DateTime UpdatedAtUtc);
