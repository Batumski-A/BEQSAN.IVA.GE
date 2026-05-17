using BEQSAN.Domain.Common;

namespace BEQSAN.Domain.ValueObjects;

/// <summary>
/// Translated string with Georgian as the always-required primary and English/Russian optional.
/// Stored as JSON in SQLite (single TEXT column). The shape mirrors the FRONT i18next contract:
/// if en/ru is null, the UI falls back to ka.
/// </summary>
public sealed record LocalizedText
{
    public string Ka { get; init; }
    public string? En { get; init; }
    public string? Ru { get; init; }

    /// <summary>
    /// Parameterless constructor for System.Text.Json. Use <see cref="Create"/> for production code.
    /// </summary>
    public LocalizedText()
    {
        Ka = string.Empty;
    }

    private LocalizedText(string ka, string? en, string? ru)
    {
        Ka = ka;
        En = en;
        Ru = ru;
    }

    public static Result<LocalizedText> Create(string? ka, string? en = null, string? ru = null)
    {
        if (string.IsNullOrWhiteSpace(ka))
        {
            return Result.Failure<LocalizedText>(LocalizedTextErrors.KaRequired);
        }

        return Result.Success(new LocalizedText(
            ka: ka.Trim(),
            en: string.IsNullOrWhiteSpace(en) ? null : en.Trim(),
            ru: string.IsNullOrWhiteSpace(ru) ? null : ru.Trim()));
    }

    public string Resolve(string locale) => locale switch
    {
        "en" => En ?? Ka,
        "ru" => Ru ?? Ka,
        _ => Ka,
    };

    public override string ToString() => Ka;
}

public static class LocalizedTextErrors
{
    public static readonly Error KaRequired = Error.Validation(
        "localizedText.ka.required",
        "ქართული თარგმანი სავალდებულოა.",
        field: "ka");
}
