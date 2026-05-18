using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.Social;
using MediatR;

namespace BEQSAN.Application.Social.Inbox;

public sealed record ListInboxQuery(int Limit = 50) : IRequest<Result<IReadOnlyList<InboxThreadDto>>>;

public sealed record InboxThreadDto(
    Guid Id,
    Guid PageId,
    string PageName,
    InboxChannel Channel,
    string ParticipantName,
    string LastMessagePreview,
    DateTime LastMessageAtUtc,
    bool HasUnread);

internal sealed class ListInboxHandler(
    IInboxRepository inbox,
    ISocialPageRepository pages)
    : IRequestHandler<ListInboxQuery, Result<IReadOnlyList<InboxThreadDto>>>
{
    public async Task<Result<IReadOnlyList<InboxThreadDto>>> Handle(ListInboxQuery req, CancellationToken ct)
    {
        var allPages = await pages.ListActiveAsync(ct).ConfigureAwait(false);
        if (allPages.Count == 0)
        {
            return Result.Success<IReadOnlyList<InboxThreadDto>>([]);
        }
        var pageMap = allPages.ToDictionary(p => p.Id, p => p.Name);
        var threads = await inbox.ListThreadsAsync(pageMap.Keys, req.Limit, ct).ConfigureAwait(false);

        var dto = threads.Select(t => new InboxThreadDto(
            t.Id,
            t.PageId,
            pageMap.TryGetValue(t.PageId, out var n) ? n : string.Empty,
            t.Channel,
            t.ParticipantName,
            t.LastMessagePreview,
            t.LastMessageAtUtc,
            t.HasUnread)).ToArray();

        return Result.Success<IReadOnlyList<InboxThreadDto>>(dto);
    }
}
