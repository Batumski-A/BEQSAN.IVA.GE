using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.Social;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Social.Ai;

public sealed record SuggestReplyCommand(Guid ThreadId) : IRequest<Result<SuggestReplyResponse>>;

public sealed record SuggestReplyResponse(string Suggestion);

internal sealed class SuggestReplyHandler(
    IInboxRepository inbox,
    IAiAssistService ai,
    ILogger<SuggestReplyHandler> logger)
    : IRequestHandler<SuggestReplyCommand, Result<SuggestReplyResponse>>
{
    private const int ContextWindow = 10;

    public async Task<Result<SuggestReplyResponse>> Handle(SuggestReplyCommand cmd, CancellationToken ct)
    {
        var thread = await inbox.GetThreadByIdAsync(cmd.ThreadId, ct).ConfigureAwait(false);
        if (thread is null)
        {
            return Result.Failure<SuggestReplyResponse>(SocialErrors.ThreadNotFound);
        }

        var messages = await inbox.ListMessagesAsync(cmd.ThreadId, ContextWindow, ct).ConfigureAwait(false);
        var lastCustomer = messages.LastOrDefault(m => m.Direction == InboxDirection.Inbound);
        if (lastCustomer is null)
        {
            return Result.Failure<SuggestReplyResponse>(SocialErrors.ThreadNotFound);
        }

        var turns = messages
            .OrderBy(m => m.AtUtc)
            .Select(m => new AiTurn(m.Direction == InboxDirection.Inbound, m.Text))
            .ToArray();

        try
        {
            var suggestion = await ai.SuggestReplyAsync(turns, lastCustomer.Text, ct).ConfigureAwait(false);
            return Result.Success(new SuggestReplyResponse(suggestion.Trim()));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI suggest reply failed");
            return Result.Failure<SuggestReplyResponse>(SocialErrors.AiAssistFailure.WithMetadata("reason", ex.Message));
        }
    }
}
