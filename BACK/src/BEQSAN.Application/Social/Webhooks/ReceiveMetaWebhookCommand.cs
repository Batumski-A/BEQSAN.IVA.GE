using BEQSAN.Application.Common.Persistence;
using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.Social;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Social.Webhooks;

/// <summary>
/// Webhook fan-out from Meta. Payload is delivered as already-parsed records by
/// the API edge — the handler doesn't see raw JSON. Idempotent on
/// <see cref="WebhookEvent.ExternalMessageId"/> via <see cref="IInboxRepository.MessageExistsAsync"/>.
/// </summary>
public sealed record ReceiveMetaWebhookCommand(IReadOnlyList<WebhookEvent> Events) : IRequest<Result<int>>;

public sealed record WebhookEvent(
    string MetaPageId,
    InboxChannel Channel,
    string ExternalThreadId,
    string ExternalMessageId,
    string SenderId,
    string SenderName,
    string Text,
    string? AttachmentUrl,
    DateTime AtUtc);

internal sealed class ReceiveMetaWebhookHandler(
    ISocialPageRepository pages,
    IInboxRepository inbox,
    IBeqsanDbContext db,
    ILogger<ReceiveMetaWebhookHandler> logger)
    : IRequestHandler<ReceiveMetaWebhookCommand, Result<int>>
{
    public async Task<Result<int>> Handle(ReceiveMetaWebhookCommand cmd, CancellationToken ct)
    {
        var saved = 0;
        foreach (var evt in cmd.Events)
        {
            var page = await pages.GetByMetaPageIdAsync(evt.MetaPageId, ct).ConfigureAwait(false);
            if (page is null)
            {
                logger.LogWarning("Webhook for unknown page {MetaPageId}", evt.MetaPageId);
                continue;
            }
            if (await inbox.MessageExistsAsync(evt.ExternalMessageId, ct).ConfigureAwait(false))
            {
                continue;
            }

            var thread = await inbox.GetThreadByExternalIdAsync(page.Id, evt.ExternalThreadId, ct).ConfigureAwait(false);
            if (thread is null)
            {
                thread = InboxThread.Create(page.Id, evt.Channel, evt.ExternalThreadId, evt.SenderId, evt.SenderName);
                await inbox.AddThreadAsync(thread, ct).ConfigureAwait(false);
            }
            thread.RecordIncoming(evt.Text, evt.AtUtc, evt.SenderName);
            await inbox.UpdateThreadAsync(thread, ct).ConfigureAwait(false);

            var msg = InboxMessage.Create(
                thread.Id, page.Id, evt.ExternalMessageId,
                InboxDirection.Inbound, evt.SenderId, evt.SenderName,
                evt.Text, evt.AttachmentUrl, evt.AtUtc);
            await inbox.AddMessageAsync(msg, ct).ConfigureAwait(false);
            saved++;
        }
        if (saved > 0)
        {
            await db.SaveChangesAsync(ct).ConfigureAwait(false);
        }
        return Result.Success(saved);
    }
}
