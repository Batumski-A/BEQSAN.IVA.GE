using FluentValidation;

namespace BEQSAN.Application.Configurator.SaveSnapshot;

/// <summary>
/// Cheap first-line checks only (presence, gross size, data-URL scheme).
/// The deep parse — exact mime allow-list, base64 decode, decoded-size
/// limit — runs in <see cref="SaveSnapshotHandler"/> where the payload
/// is actually decoded.
/// </summary>
internal sealed class SaveSnapshotValidator : AbstractValidator<SaveSnapshotCommand>
{
    /// <summary>
    /// ~8M chars of base64 decodes to ~6 MB — comfortably above the handler's
    /// 4 MB decoded limit, so this rule only guards against absurd payloads.
    /// </summary>
    private const int MaxDataUrlLength = 8_000_000;

    public SaveSnapshotValidator()
    {
        RuleFor(x => x.ImageDataUrl)
            .NotEmpty()
            .WithMessage("სურათი სავალდებულოა.")
            .MaximumLength(MaxDataUrlLength)
            .WithMessage("სურათი ზედმეტად დიდია.")
            .Must(v => v is not null && v.StartsWith("data:image/", StringComparison.Ordinal))
            .WithMessage("სურათის ფორმატი არასწორია — მოსალოდნელია data:image/... მისამართი.");
    }
}
