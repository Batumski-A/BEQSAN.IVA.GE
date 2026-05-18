using BEQSAN.Api.Common;
using BEQSAN.Application.Social.Accounts;
using BEQSAN.Application.Social.Ai;
using BEQSAN.Application.Social.Connect;
using BEQSAN.Application.Social.Inbox;
using BEQSAN.Application.Social.Posts;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace BEQSAN.Api.Endpoints;

/// <summary>
/// All under <c>/api/v1/admin/social/*</c> — gated by AdminTokenAuthMiddleware.
/// Two read endpoints (<c>accounts</c>, <c>inbox</c>) and the rest write/mutate.
/// </summary>
public static class SocialEndpoints
{
    public static IEndpointRouteBuilder MapSocialEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin/social").WithTags("Social");

        group.MapPost("connect", async (ISender sender, CancellationToken ct) =>
            {
                var result = await sender.Send(new StartConnectCommand(), ct).ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("StartConnect")
            .WithSummary("Start the Meta OAuth flow — returns the authorize URL the admin must visit");

        group.MapPost("connect/callback", async (
                [FromBody] CompleteConnectCommand body, ISender sender, CancellationToken ct) =>
            {
                var result = await sender.Send(body, ct).ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("CompleteConnect")
            .WithSummary("Complete the OAuth flow: exchanges code, fetches pages, persists encrypted tokens");

        group.MapGet("accounts", async (ISender sender, CancellationToken ct) =>
            {
                var result = await sender.Send(new ListAccountsQuery(), ct).ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("ListSocialAccounts")
            .WithSummary("Connected Meta accounts and their pages");

        group.MapDelete("accounts/{id:guid}", async (Guid id, ISender sender, CancellationToken ct) =>
            {
                var result = await sender.Send(new DisconnectAccountCommand(id), ct).ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("DisconnectSocialAccount");

        group.MapPost("posts", async (
                [FromBody] PublishPostCommand body, ISender sender, CancellationToken ct) =>
            {
                var result = await sender.Send(body, ct).ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("PublishPost")
            .WithSummary("Publish a post to one or more (page, platform) targets");

        group.MapGet("inbox", async (
                int? limit, ISender sender, CancellationToken ct) =>
            {
                var result = await sender.Send(new ListInboxQuery(limit ?? 50), ct).ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("ListInbox")
            .WithSummary("Unified inbox threads ordered by last message");

        group.MapGet("inbox/{threadId:guid}", async (
                Guid threadId, ISender sender, CancellationToken ct) =>
            {
                var result = await sender.Send(new GetThreadMessagesQuery(threadId), ct).ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("GetThreadMessages");

        group.MapPost("inbox/{threadId:guid}/reply", async (
                Guid threadId, [FromBody] ReplyBody body, ISender sender, CancellationToken ct) =>
            {
                var result = await sender.Send(new ReplyToThreadCommand(threadId, body.Text), ct).ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("ReplyToThread");

        group.MapPost("ai/caption", async (
                [FromBody] DraftCaptionCommand body, ISender sender, CancellationToken ct) =>
            {
                var result = await sender.Send(body, ct).ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("DraftCaption");

        group.MapPost("ai/reply", async (
                [FromBody] SuggestReplyCommand body, ISender sender, CancellationToken ct) =>
            {
                var result = await sender.Send(body, ct).ConfigureAwait(false);
                return result.ToHttpResult();
            })
            .WithName("SuggestReply");

        return app;
    }
}

public sealed record ReplyBody(string Text);
