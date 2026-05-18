using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.Social;
using MediatR;

namespace BEQSAN.Application.Social.Inbox;

public sealed record GetThreadMessagesQuery(Guid ThreadId, int Limit = 100)
    : IRequest<Result<ThreadMessagesDto>>;

public sealed record ThreadMessagesDto(
    Guid ThreadId,
    InboxChannel Channel,
    string ParticipantName,
    IReadOnlyList<InboxMessageDto> Messages);

public sealed record InboxMessageDto(
    Guid Id,
    InboxDirection Direction,
    string AuthorName,
    string Text,
    string? AttachmentUrl,
    DateTime AtUtc);

internal sealed class GetThreadMessagesHandler(
    IInboxRepository inbox)
    : IRequestHandler<GetThreadMessagesQuery, Result<ThreadMessagesDto>>
{
    public async Task<Result<ThreadMessagesDto>> Handle(GetThreadMessagesQuery req, CancellationToken ct)
    {
        var thread = await inbox.GetThreadByIdAsync(req.ThreadId, ct).ConfigureAwait(false);
        if (thread is null)
        {
            return Result.Failure<ThreadMessagesDto>(SocialErrors.ThreadNotFound);
        }
        var messages = await inbox.ListMessagesAsync(req.ThreadId, req.Limit, ct).ConfigureAwait(false);
        thread.MarkRead();
        return Result.Success(new ThreadMessagesDto(
            thread.Id,
            thread.Channel,
            thread.ParticipantName,
            messages.Select(m => new InboxMessageDto(m.Id, m.Direction, m.AuthorName, m.Text, m.AttachmentUrl, m.AtUtc))
                .ToArray()));
    }
}
