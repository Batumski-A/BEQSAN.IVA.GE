using System.Text.Json;
using BEQSAN.Application.Social.Webhooks;
using BEQSAN.Domain.Social;
using BEQSAN.Infrastructure.Social;
using MediatR;
using Microsoft.Extensions.Options;

namespace BEQSAN.Api.Endpoints;

/// <summary>
/// Meta webhook receiver. <c>GET</c> verifies the subscription (responds with the
/// challenge); <c>POST</c> ingests events. NOT under the admin gate — Meta hits
/// these directly. Authentication is via the <c>hub.verify_token</c> handshake
/// and the standard <c>X-Hub-Signature-256</c> HMAC, which a follow-up will add
/// once the Meta App is approved and the secret is in place.
/// </summary>
public static class MetaWebhookEndpoints
{
    public static IEndpointRouteBuilder MapMetaWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/webhooks/meta").WithTags("Webhooks");

        group.MapGet("", (HttpRequest req, IOptions<SocialOptions> options) =>
            {
                var mode = req.Query["hub.mode"].ToString();
                var token = req.Query["hub.verify_token"].ToString();
                var challenge = req.Query["hub.challenge"].ToString();
                var expected = options.Value.Meta.WebhookVerifyToken;
                if (mode == "subscribe" && !string.IsNullOrEmpty(expected) && token == expected)
                {
                    return Results.Text(challenge);
                }
                return Results.Forbid();
            })
            .WithName("MetaWebhookVerify");

        group.MapPost("", async (
                HttpRequest req, ISender sender, ILogger<WebhookRouteMarker> logger, CancellationToken ct) =>
            {
                using var reader = new StreamReader(req.Body);
                var raw = await reader.ReadToEndAsync(ct).ConfigureAwait(false);
                logger.LogInformation("Meta webhook payload received ({Bytes} bytes)", raw.Length);

                var events = ParseEvents(raw, logger);
                if (events.Count == 0)
                {
                    return Results.Ok();
                }
                await sender.Send(new ReceiveMetaWebhookCommand(events), ct).ConfigureAwait(false);
                return Results.Ok();
            })
            .WithName("MetaWebhookReceive");

        return app;
    }

    private static List<WebhookEvent> ParseEvents(string raw, ILogger logger)
    {
        var list = new List<WebhookEvent>();
        try
        {
            using var doc = JsonDocument.Parse(raw);
            if (!doc.RootElement.TryGetProperty("entry", out var entryArr) || entryArr.ValueKind != JsonValueKind.Array)
            {
                return list;
            }
            foreach (var entry in entryArr.EnumerateArray())
            {
                var pageId = entry.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? string.Empty : string.Empty;

                if (entry.TryGetProperty("messaging", out var messagingArr) && messagingArr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var m in messagingArr.EnumerateArray())
                    {
                        var senderId = m.GetProperty("sender").GetProperty("id").GetString() ?? string.Empty;
                        if (!m.TryGetProperty("message", out var msgEl))
                        {
                            continue;
                        }
                        var text = msgEl.TryGetProperty("text", out var t) ? t.GetString() ?? string.Empty : string.Empty;
                        var mid = msgEl.TryGetProperty("mid", out var midEl) ? midEl.GetString() ?? Guid.NewGuid().ToString() : Guid.NewGuid().ToString();
                        var ts = m.TryGetProperty("timestamp", out var tsEl) && tsEl.TryGetInt64(out var tsMs)
                            ? DateTimeOffset.FromUnixTimeMilliseconds(tsMs).UtcDateTime
                            : DateTime.UtcNow;
                        list.Add(new WebhookEvent(
                            pageId, InboxChannel.FacebookMessenger, senderId, mid, senderId, string.Empty, text, null, ts));
                    }
                }

                if (entry.TryGetProperty("changes", out var changesArr) && changesArr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var c in changesArr.EnumerateArray())
                    {
                        var field = c.TryGetProperty("field", out var fEl) ? fEl.GetString() : null;
                        if (!c.TryGetProperty("value", out var v) || field != "feed")
                        {
                            continue;
                        }
                        var item = v.TryGetProperty("item", out var itemEl) ? itemEl.GetString() : null;
                        if (item != "comment")
                        {
                            continue;
                        }
                        var commentId = v.GetProperty("comment_id").GetString() ?? Guid.NewGuid().ToString();
                        var postId = v.TryGetProperty("post_id", out var pEl) ? pEl.GetString() ?? string.Empty : string.Empty;
                        var fromId = v.TryGetProperty("from", out var fromEl) && fromEl.TryGetProperty("id", out var fIdEl) ? fIdEl.GetString() ?? string.Empty : string.Empty;
                        var fromName = v.TryGetProperty("from", out var fromEl2) && fromEl2.TryGetProperty("name", out var fNameEl) ? fNameEl.GetString() ?? string.Empty : string.Empty;
                        var msg = v.TryGetProperty("message", out var mEl) ? mEl.GetString() ?? string.Empty : string.Empty;
                        var ts = v.TryGetProperty("created_time", out var ctEl) && ctEl.TryGetInt64(out var ctMs)
                            ? DateTimeOffset.FromUnixTimeSeconds(ctMs).UtcDateTime
                            : DateTime.UtcNow;
                        list.Add(new WebhookEvent(
                            pageId, InboxChannel.FacebookComment, postId, commentId, fromId, fromName, msg, null, ts));
                    }
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to parse Meta webhook payload");
        }
        return list;
    }

    private sealed class WebhookRouteMarker;
}
