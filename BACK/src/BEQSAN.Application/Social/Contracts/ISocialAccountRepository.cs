using BEQSAN.Domain.Social;

namespace BEQSAN.Application.Social.Contracts;

/// <summary>
/// Persistence boundary for <see cref="SocialAccount"/> + the pages it owns.
/// Implementation lives in Infrastructure (EF Core, see ADR-0003). Application
/// handlers never touch DbContext directly.
/// </summary>
public interface ISocialAccountRepository
{
    Task<SocialAccount?> GetByMetaUserIdAsync(string metaUserId, CancellationToken ct);
    Task<SocialAccount?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<SocialAccount>> ListActiveAsync(CancellationToken ct);
    Task AddAsync(SocialAccount account, CancellationToken ct);
    Task UpdateAsync(SocialAccount account, CancellationToken ct);
}

public interface ISocialPageRepository
{
    Task<SocialPage?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<SocialPage?> GetByMetaPageIdAsync(string metaPageId, CancellationToken ct);
    Task<IReadOnlyList<SocialPage>> ListForAccountAsync(Guid accountId, CancellationToken ct);
    Task<IReadOnlyList<SocialPage>> ListActiveAsync(CancellationToken ct);
    Task AddAsync(SocialPage page, CancellationToken ct);
    Task UpdateAsync(SocialPage page, CancellationToken ct);
}

public interface ISocialPostRepository
{
    Task<SocialPost?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<SocialPost>> ListRecentForPageAsync(Guid pageId, int limit, CancellationToken ct);
    Task AddAsync(SocialPost post, CancellationToken ct);
    Task UpdateAsync(SocialPost post, CancellationToken ct);
}

public interface IInboxRepository
{
    Task<InboxThread?> GetThreadByIdAsync(Guid id, CancellationToken ct);
    Task<InboxThread?> GetThreadByExternalIdAsync(Guid pageId, string externalThreadId, CancellationToken ct);
    Task<IReadOnlyList<InboxThread>> ListThreadsAsync(IReadOnlyCollection<Guid> pageIds, int limit, CancellationToken ct);
    Task<IReadOnlyList<InboxMessage>> ListMessagesAsync(Guid threadId, int limit, CancellationToken ct);
    Task AddThreadAsync(InboxThread thread, CancellationToken ct);
    Task UpdateThreadAsync(InboxThread thread, CancellationToken ct);
    Task AddMessageAsync(InboxMessage message, CancellationToken ct);
    Task<bool> MessageExistsAsync(string externalMessageId, CancellationToken ct);
}
