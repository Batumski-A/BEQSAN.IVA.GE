using BEQSAN.Domain.Common;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Domain.Catalog;

/// <summary>
/// A handle option the customer can pick at configurator Step 7. Surcharge
/// is <em>per openable pane</em> — a 2-pane Casement+Fixed window with the
/// "modern-aluminum" handle pays 1× the per-pane surcharge (only the
/// Casement pane gets a handle).
///
/// <para>
/// Family is a string enum kept loose (we don't carry an enum on the wire;
/// it shapes FRONT swatch grouping only). Compatibility with materials is
/// modeled via <c>material_handle_compatibility</c> — most handles work
/// across all materials; rare cases (e.g. premium-secustic) are ALU-only.
/// </para>
/// </summary>
public sealed class HandleStyle
{
    public Guid Id { get; init; }
    public string Slug { get; init; } = string.Empty;
    public LocalizedText Name { get; init; } = new();
    public LocalizedText ShortDescription { get; init; } = new();

    /// <summary>"modern" | "classic" | "premium" | "minimal".</summary>
    public string Family { get; init; } = "modern";

    /// <summary>Public path to the swatch / hero image; null until Phase 1.5.</summary>
    public string? ImageUrl { get; init; }

    /// <summary>Tetri per openable pane. 4500 = 45 ₾/pane.</summary>
    public int SurchargePerPaneMinor { get; init; }

    public Currency Currency { get; init; } = Currency.Gel;

    /// <summary>One default per family — Step-7 auto-select fallback.</summary>
    public bool IsDefault { get; init; }

    public int SortOrder { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAtUtc { get; init; }

    public static Result<HandleStyle> Create(
        string? slug,
        LocalizedText name,
        LocalizedText shortDescription,
        string? family,
        string? imageUrl,
        int surchargePerPaneMinor,
        Currency currency,
        int sortOrder,
        bool isDefault,
        bool isActive = true)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return Result.Failure<HandleStyle>(HandleStyleErrors.SlugRequired);
        }

        var normalizedSlug = slug.Trim().ToLowerInvariant();
        if (!CatalogSlugRules.IsValid(normalizedSlug))
        {
            return Result.Failure<HandleStyle>(HandleStyleErrors.SlugInvalid);
        }

        if (string.IsNullOrWhiteSpace(family) || !IsValidFamily(family))
        {
            return Result.Failure<HandleStyle>(HandleStyleErrors.FamilyInvalid);
        }

        if (surchargePerPaneMinor < 0)
        {
            return Result.Failure<HandleStyle>(HandleStyleErrors.SurchargeMustNotBeNegative);
        }

        return Result.Success(new HandleStyle
        {
            Id = Guid.NewGuid(),
            Slug = normalizedSlug,
            Name = name,
            ShortDescription = shortDescription,
            Family = family,
            ImageUrl = imageUrl,
            SurchargePerPaneMinor = surchargePerPaneMinor,
            Currency = currency,
            SortOrder = sortOrder,
            IsDefault = isDefault,
            IsActive = isActive,
            CreatedAtUtc = DateTime.UtcNow,
        });
    }

    private static bool IsValidFamily(string s) =>
        s is "modern" or "classic" or "premium" or "minimal";
}

public static class HandleStyleErrors
{
    public static readonly Error SlugRequired = Error.Validation(
        "handleStyle.slug.required",
        "სახელურის slug სავალდებულოა.",
        field: "slug");

    public static readonly Error SlugInvalid = Error.Validation(
        "handleStyle.slug.invalid",
        "Slug უნდა შეიცავდეს მხოლოდ ლათინურ მცირე ასოებს, ციფრებს და დეფისებს (2-64 სიმბოლო).",
        field: "slug");

    public static readonly Error FamilyInvalid = Error.Validation(
        "handleStyle.family.invalid",
        "სახელურის ოჯახი არასწორია.",
        field: "family");

    public static readonly Error SurchargeMustNotBeNegative = Error.Validation(
        "handleStyle.surcharge.negative",
        "სახელურის დანამატის ფასი არ შეიძლება იყოს უარყოფითი.",
        field: "surchargePerPaneMinor");

    public static readonly Error NotFound = Error.NotFound(
        "handleStyle.notFound",
        "მითითებული სახელური ვერ მოიძებნა.");
}

/// <summary>
/// Shared catalog slug validator — lowercase ASCII letters / digits /
/// hyphens, 2-64 characters, no leading/trailing hyphen. Used by every
/// catalog entity introduced from Step 5 onwards.
/// </summary>
internal static class CatalogSlugRules
{
    public static bool IsValid(string slug)
    {
        if (slug.Length is < 2 or > 64)
        {
            return false;
        }

        foreach (var c in slug)
        {
            var allowed = c is (>= 'a' and <= 'z') or (>= '0' and <= '9') or '-';
            if (!allowed)
            {
                return false;
            }
        }

        return slug[0] != '-' && slug[^1] != '-';
    }
}
