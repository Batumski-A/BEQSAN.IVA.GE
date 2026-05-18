using BEQSAN.Application.Social.Contracts;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.Social;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace BEQSAN.Application.Social.Ai;

public sealed record DraftCaptionCommand(string Topic, string? Tonality)
    : IRequest<Result<DraftCaptionResponse>>;

public sealed record DraftCaptionResponse(string Caption);

internal sealed class DraftCaptionValidator : AbstractValidator<DraftCaptionCommand>
{
    public DraftCaptionValidator()
    {
        RuleFor(x => x.Topic).NotEmpty().MaximumLength(280);
    }
}

internal sealed class DraftCaptionHandler(
    IAiAssistService ai,
    ILogger<DraftCaptionHandler> logger)
    : IRequestHandler<DraftCaptionCommand, Result<DraftCaptionResponse>>
{
    public async Task<Result<DraftCaptionResponse>> Handle(DraftCaptionCommand cmd, CancellationToken ct)
    {
        try
        {
            var caption = await ai.DraftCaptionAsync(cmd.Topic, cmd.Tonality, ct).ConfigureAwait(false);
            return Result.Success(new DraftCaptionResponse(caption.Trim()));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI caption draft failed");
            return Result.Failure<DraftCaptionResponse>(SocialErrors.AiAssistFailure.WithMetadata("reason", ex.Message));
        }
    }
}
