using BEQSAN.Domain.Common;
using BEQSAN.Domain.Social;
using FluentValidation;
using MediatR;

namespace BEQSAN.Application.Social.Posts;

/// <summary>
/// Composer submission. <see cref="Targets"/> is one entry per (page, platform)
/// the admin ticked — we fan out into N <see cref="SocialPost"/> rows under a
/// shared composer id and publish them sequentially so a partial failure leaves
/// useful state (some published, some failed) rather than rolling back the world.
/// </summary>
public sealed record PublishPostCommand(
    string Caption,
    IReadOnlyList<string> ImageUrls,
    IReadOnlyList<PublishTarget> Targets) : IRequest<Result<PublishPostResponse>>;

public sealed record PublishTarget(Guid PageId, SocialPlatform Platform);

public sealed record PublishPostResponse(
    Guid ComposerId,
    IReadOnlyList<PublishedPostDto> Posts);

public sealed record PublishedPostDto(
    Guid Id,
    Guid PageId,
    SocialPlatform Platform,
    SocialPostStatus Status,
    string? ExternalPostId,
    string? Permalink,
    string? FailureReason);

internal sealed class PublishPostValidator : AbstractValidator<PublishPostCommand>
{
    public PublishPostValidator()
    {
        RuleFor(x => x.Caption).MaximumLength(2200)
            .WithErrorCode(SocialErrors.CaptionTooLong.Code)
            .WithMessage(SocialErrors.CaptionTooLong.Message);

        RuleFor(x => x.Targets).NotEmpty();

        RuleFor(x => x).Must(c => !string.IsNullOrWhiteSpace(c.Caption) || c.ImageUrls.Count > 0)
            .WithErrorCode(SocialErrors.CaptionRequired.Code)
            .WithMessage(SocialErrors.CaptionRequired.Message);

        RuleForEach(x => x.ImageUrls)
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out var u) && u.Scheme == Uri.UriSchemeHttps)
            .WithErrorCode(SocialErrors.ImageUrlInvalid.Code)
            .WithMessage(SocialErrors.ImageUrlInvalid.Message);
    }
}
