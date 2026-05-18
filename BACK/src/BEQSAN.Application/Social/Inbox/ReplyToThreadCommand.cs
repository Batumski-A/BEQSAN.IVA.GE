using BEQSAN.Application.Common.Persistence;
using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.Social;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Social.Inbox;

public sealed record ReplyToThreadCommand(Guid ThreadId, string Text)
    : IRequest<Result<ReplyToThreadResponse>>;

public sealed record ReplyToThreadResponse(Guid MessageId, string ExternalMessageId);

internal sealed class ReplyToThreadValidator : AbstractValidator<ReplyToThreadCommand>
{
    public ReplyToThreadValidator()
    {
        RuleFor(x => x.Text).NotEmpty()
            .WithErrorCode(SocialErrors.ReplyEmpty.Code)
            .WithMessage(SocialErrors.ReplyEmpty.Message);
    }
}

internal sealed class ReplyToThreadHandler(
    IInboxRepository inbox,
    ISocialPageRepository pages,
    IMetaGraphClient graph,
    Application.Common.Abstractions.ITokenCipher cipher,
    IBeqsanDbContext db,
    ILogger<ReplyToThreadHandler> logger)
    : IRequestHandler<ReplyToThreadCommand, Result<ReplyToThreadResponse>>
{
    public async Task<Result<ReplyToThreadResponse>> Handle(ReplyToThreadCommand cmd, CancellationToken ct)
    {
        var thread = await inbox.GetThreadByIdAsync(cmd.ThreadId, ct).ConfigureAwait(false);
        if (thread is null)
        {
            return Result.Failure<ReplyToThreadResponse>(SocialErrors.ThreadNotFound);
        }
        var page = await pages.GetByIdAsync(thread.PageId, ct).ConfigureAwait(false);
        if (page is null || !page.IsActive)
        {
            return Result.Failure<ReplyToThreadResponse>(SocialErrors.PageNotFound);
        }
        if (page.PageToken.IsExpired())
        {
            return Result.Failure<ReplyToThreadResponse>(SocialErrors.TokenExpired);
        }

        try
        {
            var token = cipher.Decrypt(page.PageToken);
            var externalId = thread.Channel is InboxChannel.FacebookComment or InboxChannel.InstagramComment
                ? await graph.ReplyToCommentAsync(token, thread.ExternalThreadId, cmd.Text, ct).ConfigureAwait(false)
                : await graph.SendMessageAsync(token, page.MetaPageId, thread.Channel, thread.ParticipantId, cmd.Text, ct).ConfigureAwait(false);

            var now = DateTime.UtcNow;
            var msg = InboxMessage.Create(
                thread.Id, page.Id, externalId,
                InboxDirection.Outbound,
                authorId: page.MetaPageId,
                authorName: page.Name,
                text: cmd.Text,
                attachmentUrl: null,
                atUtc: now);
            await inbox.AddMessageAsync(msg, ct).ConfigureAwait(false);
            thread.RecordOutgoing(cmd.Text, now);
            await inbox.UpdateThreadAsync(thread, ct).ConfigureAwait(false);
            await db.SaveChangesAsync(ct).ConfigureAwait(false);

            return Result.Success(new ReplyToThreadResponse(msg.Id, externalId));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to reply on thread {ThreadId}", thread.Id);
            return Result.Failure<ReplyToThreadResponse>(SocialErrors.MetaApiFailure.WithMetadata("reason", ex.Message));
        }
    }
}

