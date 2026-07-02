using BEQSAN.Application.Common.Abstractions;
using BEQSAN.Domain.Common;
using MediatR;

namespace BEQSAN.Application.Configurator.SaveSnapshot;

internal sealed class SaveSnapshotHandler(IStorageService storage)
    : IRequestHandler<SaveSnapshotCommand, Result<SnapshotDto>>
{
    private const int MaxDecodedBytes = 4 * 1024 * 1024; // 4 MB decoded

    /// <summary>
    /// Base64 inflates 4:3, so any payload longer than this (+ padding slack)
    /// cannot decode under <see cref="MaxDecodedBytes"/>.
    /// </summary>
    private const long MaxBase64PayloadChars = (MaxDecodedBytes / 3L * 4L) + 4L;

    // Route prefixes the Api layer serves stored files / share pages under.
    // Application knowing an Api route is a pragmatic tradeoff — the same call
    // the catalog already makes for gallery/hero ImageUrl strings, which are
    // stored and returned as ready-to-use paths rather than abstract keys.
    private const string PublicFilesPrefix = "/api/v1/files/";
    private const string SharePrefix = "/api/v1/share/";

    private static readonly (string Prefix, string Extension, string ContentType)[] SupportedFormats =
    [
        ("data:image/png;base64,", "png", "image/png"),
        ("data:image/jpeg;base64,", "jpg", "image/jpeg"),
    ];

    private readonly IStorageService _storage = storage;

    public async Task<Result<SnapshotDto>> Handle(SaveSnapshotCommand request, CancellationToken ct)
    {
        // Must match ^data:image/(png|jpeg);base64,<payload> — ordinal prefix
        // comparison against the allow-list is equivalent to (and cheaper than)
        // a regex here.
        var format = Array.FindIndex(
            SupportedFormats,
            f => request.ImageDataUrl.StartsWith(f.Prefix, StringComparison.Ordinal));
        if (format < 0)
        {
            return Result.Failure<SnapshotDto>(SnapshotErrors.FormatInvalid);
        }

        var (prefix, extension, contentType) = SupportedFormats[format];
        var payload = request.ImageDataUrl[prefix.Length..];

        // Cheap pre-check before allocating the decode buffer.
        if (payload.Length > MaxBase64PayloadChars)
        {
            return Result.Failure<SnapshotDto>(SnapshotErrors.TooLarge);
        }

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(payload);
        }
        catch (FormatException)
        {
            return Result.Failure<SnapshotDto>(SnapshotErrors.Base64Invalid);
        }

        if (bytes.Length == 0)
        {
            return Result.Failure<SnapshotDto>(SnapshotErrors.FormatInvalid);
        }

        if (bytes.Length > MaxDecodedBytes)
        {
            return Result.Failure<SnapshotDto>(SnapshotErrors.TooLarge);
        }

        await using var stream = new MemoryStream(bytes, writable: false);
        var storageKey = await _storage
            .SaveAsync(stream, $"drawing.{extension}", contentType, ct)
            .ConfigureAwait(false);

        return Result.Success(new SnapshotDto(
            PublicFilesPrefix + storageKey,
            SharePrefix + storageKey));
    }
}

internal static class SnapshotErrors
{
    public static readonly Error FormatInvalid = Error.Validation(
        "configurator.snapshot.formatInvalid",
        "სურათის ფორმატი არასწორია — მოსალოდნელია PNG ან JPEG data-URL.",
        field: "imageDataUrl");

    public static readonly Error Base64Invalid = Error.Validation(
        "configurator.snapshot.base64Invalid",
        "სურათის მონაცემები დაზიანებულია — base64 ვერ გაიშიფრა.",
        field: "imageDataUrl");

    public static readonly Error TooLarge = Error.BusinessRule(
        "configurator.snapshot.tooLarge",
        "სურათი ზედმეტად დიდია — მაქსიმუმ 4 მბ.");
}
