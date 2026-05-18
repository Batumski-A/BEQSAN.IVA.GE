using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Social;
using BEQSAN.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BEQSAN.Infrastructure.Social;

internal sealed class SocialAccountRepository(BeqsanDbContext db) : ISocialAccountRepository
{
    public Task<SocialAccount?> GetByMetaUserIdAsync(string metaUserId, CancellationToken ct) =>
        db.SocialAccounts.FirstOrDefaultAsync(a => a.MetaUserId == metaUserId, ct);

    public Task<SocialAccount?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.SocialAccounts.FirstOrDefaultAsync(a => a.Id == id, ct);

    public async Task<IReadOnlyList<SocialAccount>> ListActiveAsync(CancellationToken ct) =>
        await db.SocialAccounts.Where(a => a.DisconnectedAtUtc == null)
            .OrderByDescending(a => a.ConnectedAtUtc)
            .ToListAsync(ct).ConfigureAwait(false);

    public async Task AddAsync(SocialAccount account, CancellationToken ct)
    {
        await db.SocialAccounts.AddAsync(account, ct).ConfigureAwait(false);
    }

    public Task UpdateAsync(SocialAccount account, CancellationToken ct)
    {
        db.SocialAccounts.Update(account);
        return Task.CompletedTask;
    }
}

internal sealed class SocialPageRepository(BeqsanDbContext db) : ISocialPageRepository
{
    public Task<SocialPage?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.SocialPages.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<SocialPage?> GetByMetaPageIdAsync(string metaPageId, CancellationToken ct) =>
        db.SocialPages.FirstOrDefaultAsync(p => p.MetaPageId == metaPageId, ct);

    public async Task<IReadOnlyList<SocialPage>> ListForAccountAsync(Guid accountId, CancellationToken ct) =>
        await db.SocialPages.Where(p => p.AccountId == accountId)
            .OrderBy(p => p.Name)
            .ToListAsync(ct).ConfigureAwait(false);

    public async Task<IReadOnlyList<SocialPage>> ListActiveAsync(CancellationToken ct) =>
        await db.SocialPages.Where(p => p.IsActive)
            .OrderBy(p => p.Name)
            .ToListAsync(ct).ConfigureAwait(false);

    public async Task AddAsync(SocialPage page, CancellationToken ct)
    {
        await db.SocialPages.AddAsync(page, ct).ConfigureAwait(false);
    }

    public Task UpdateAsync(SocialPage page, CancellationToken ct)
    {
        db.SocialPages.Update(page);
        return Task.CompletedTask;
    }
}

internal sealed class SocialPostRepository(BeqsanDbContext db) : ISocialPostRepository
{
    public Task<SocialPost?> GetByIdAsync(Guid id, CancellationToken ct) =>
        db.SocialPosts.FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<IReadOnlyList<SocialPost>> ListRecentForPageAsync(Guid pageId, int limit, CancellationToken ct) =>
        await db.SocialPosts.Where(p => p.PageId == pageId)
            .OrderByDescending(p => p.CreatedAtUtc)
            .Take(limit)
            .ToListAsync(ct).ConfigureAwait(false);

    public async Task AddAsync(SocialPost post, CancellationToken ct)
    {
        await db.SocialPosts.AddAsync(post, ct).ConfigureAwait(false);
    }

    public Task UpdateAsync(SocialPost post, CancellationToken ct)
    {
        db.SocialPosts.Update(post);
        return Task.CompletedTask;
    }
}

internal sealed class InboxRepository(BeqsanDbContext db) : IInboxRepository
{
    public Task<InboxThread?> GetThreadByIdAsync(Guid id, CancellationToken ct) =>
        db.InboxThreads.FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<InboxThread?> GetThreadByExternalIdAsync(Guid pageId, string externalThreadId, CancellationToken ct) =>
        db.InboxThreads.FirstOrDefaultAsync(t => t.PageId == pageId && t.ExternalThreadId == externalThreadId, ct);

    public async Task<IReadOnlyList<InboxThread>> ListThreadsAsync(IReadOnlyCollection<Guid> pageIds, int limit, CancellationToken ct) =>
        await db.InboxThreads.Where(t => pageIds.Contains(t.PageId))
            .OrderByDescending(t => t.LastMessageAtUtc)
            .Take(limit)
            .ToListAsync(ct).ConfigureAwait(false);

    public async Task<IReadOnlyList<InboxMessage>> ListMessagesAsync(Guid threadId, int limit, CancellationToken ct) =>
        await db.InboxMessages.Where(m => m.ThreadId == threadId)
            .OrderByDescending(m => m.AtUtc)
            .Take(limit)
            .OrderBy(m => m.AtUtc)
            .ToListAsync(ct).ConfigureAwait(false);

    public async Task AddThreadAsync(InboxThread thread, CancellationToken ct)
    {
        await db.InboxThreads.AddAsync(thread, ct).ConfigureAwait(false);
    }

    public Task UpdateThreadAsync(InboxThread thread, CancellationToken ct)
    {
        db.InboxThreads.Update(thread);
        return Task.CompletedTask;
    }

    public async Task AddMessageAsync(InboxMessage message, CancellationToken ct)
    {
        await db.InboxMessages.AddAsync(message, ct).ConfigureAwait(false);
    }

    public Task<bool> MessageExistsAsync(string externalMessageId, CancellationToken ct) =>
        db.InboxMessages.AnyAsync(m => m.ExternalMessageId == externalMessageId, ct);
}
