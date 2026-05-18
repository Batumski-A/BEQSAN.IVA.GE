using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Application.Common.Persistence;
using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.Social;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Social.Posts;

internal sealed class PublishPostHandler(
    ISocialPageRepository pages,
    ISocialPostRepository posts,
    IMetaGraphClient graph,
    ITokenCipher cipher,
    IBeqsanDbContext db,
    ILogger<PublishPostHandler> logger)
    : IRequestHandler<PublishPostCommand, Result<PublishPostResponse>>
{
    public async Task<Result<PublishPostResponse>> Handle(PublishPostCommand cmd, CancellationToken ct)
    {
        var composerId = Guid.NewGuid();
        var results = new List<PublishedPostDto>(cmd.Targets.Count);

        foreach (var target in cmd.Targets)
        {
            var page = await pages.GetByIdAsync(target.PageId, ct).ConfigureAwait(false);
            if (page is null)
            {
                results.Add(FailureDto(target, SocialErrors.PageNotFound.Message));
                continue;
            }

            if (target.Platform == SocialPlatform.Instagram &&
                (string.IsNullOrEmpty(page.IgUserId) || cmd.ImageUrls.Count == 0))
            {
                var reason = string.IsNullOrEmpty(page.IgUserId)
                    ? "Instagram business account არ არის გვერდთან დაკავშირებული."
                    : SocialErrors.InstagramRequiresImage.Message;
                results.Add(FailureDto(target, reason));
                continue;
            }

            if (page.PageToken.IsExpired())
            {
                results.Add(FailureDto(target, SocialErrors.TokenExpired.Message));
                continue;
            }

            var post = SocialPost.Create(composerId, page.Id, target.Platform, cmd.Caption, cmd.ImageUrls);
            await posts.AddAsync(post, ct).ConfigureAwait(false);
            post.MarkPublishing();

            try
            {
                var token = cipher.Decrypt(page.PageToken);
                var publishResult = target.Platform == SocialPlatform.Facebook
                    ? await graph.PublishFacebookPostAsync(token, page.MetaPageId, cmd.Caption, cmd.ImageUrls, ct).ConfigureAwait(false)
                    : await graph.PublishInstagramPostAsync(token, page.IgUserId!, cmd.Caption, cmd.ImageUrls, ct).ConfigureAwait(false);

                post.MarkPublished(publishResult.ExternalPostId, publishResult.Permalink);
                await posts.UpdateAsync(post, ct).ConfigureAwait(false);
                results.Add(new PublishedPostDto(post.Id, page.Id, target.Platform, post.Status, post.ExternalPostId, post.ExternalPermalink, null));
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Meta publish failed for {PageId} {Platform}", page.Id, target.Platform);
                post.MarkFailed(ex.Message);
                await posts.UpdateAsync(post, ct).ConfigureAwait(false);
                results.Add(new PublishedPostDto(post.Id, page.Id, target.Platform, post.Status, null, null, ex.Message));
            }
        }

        await db.SaveChangesAsync(ct).ConfigureAwait(false);
        return Result.Success(new PublishPostResponse(composerId, results));
    }

    private static PublishedPostDto FailureDto(PublishTarget target, string reason) =>
        new(Guid.Empty, target.PageId, target.Platform, SocialPostStatus.Failed, null, null, reason);
}
