using BEQSAN.Domain.Common;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Domain.Catalog;

/// <summary>
/// A blind / shutter option the customer can pick at configurator Step 7.
/// Pricing is <em>base mounting + per-m² of frame area</em> — the mounting
/// fee covers the bracketry + electrical (if any) and doesn't scale with
/// size; the per-m² part scales with the curtain itself.
///
/// <para>
/// <see cref="Placement"/> separates External (mounted on the façade) from
/// Internal (rolled or pleated behind the frame). External requires solid
/// upper anchor + power feed for electric variants; for now Phase-1 ships
/// external only for window / sliding / panoramic. Compatibility table
/// enforces the matrix.
/// </para>
/// <para>
/// <see cref="SupportsElectric"/> gates the control choice — manual-only
/// types reject Electric/Remote at the validator. The motor / remote
/// surcharge is applied by <see cref="Configurator.PriceCalculator"/>
/// on top of the base + per-m² total.
/// </para>
/// </summary>
public sealed class BlindType
{
    public Guid Id { get; init; }
    public string Slug { get; init; } = string.Empty;
    public LocalizedText Name { get; init; } = new();
    public LocalizedText ShortDescription { get; init; } = new();
    public BlindPlacement Placement { get; init; }
    public bool SupportsElectric { get; init; }

    /// <summary>Flat mounting fee in tetri. 18000 = 180 ₾.</summary>
    public int BaseMountingMinor { get; init; }

    /// <summary>Tetri per m² of frame area.</summary>
    public int SurchargePerSqmMinor { get; init; }

    public Currency Currency { get; init; } = Currency.Gel;
    public int SortOrder { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAtUtc { get; init; }

    public static Result<BlindType> Create(
        string? slug,
        LocalizedText name,
        LocalizedText shortDescription,
        BlindPlacement placement,
        bool supportsElectric,
        int baseMountingMinor,
        int surchargePerSqmMinor,
        Currency currency,
        int sortOrder,
        bool isActive = true)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return Result.Failure<BlindType>(BlindTypeErrors.SlugRequired);
        }

        var normalizedSlug = slug.Trim().ToLowerInvariant();
        if (!CatalogSlugRules.IsValid(normalizedSlug))
        {
            return Result.Failure<BlindType>(BlindTypeErrors.SlugInvalid);
        }

        if (baseMountingMinor < 0 || surchargePerSqmMinor < 0)
        {
            return Result.Failure<BlindType>(BlindTypeErrors.SurchargeMustNotBeNegative);
        }

        return Result.Success(new BlindType
        {
            Id = Guid.NewGuid(),
            Slug = normalizedSlug,
            Name = name,
            ShortDescription = shortDescription,
            Placement = placement,
            SupportsElectric = supportsElectric,
            BaseMountingMinor = baseMountingMinor,
            SurchargePerSqmMinor = surchargePerSqmMinor,
            Currency = currency,
            SortOrder = sortOrder,
            IsActive = isActive,
            CreatedAtUtc = DateTime.UtcNow,
        });
    }
}

public enum BlindPlacement
{
    External = 0,
    Internal = 1,
}

public static class BlindTypeErrors
{
    public static readonly Error SlugRequired = Error.Validation(
        "blindType.slug.required",
        "ჟალუზის slug სავალდებულოა.",
        field: "slug");

    public static readonly Error SlugInvalid = Error.Validation(
        "blindType.slug.invalid",
        "Slug უნდა შეიცავდეს მხოლოდ ლათინურ მცირე ასოებს, ციფრებს და დეფისებს (2-64 სიმბოლო).",
        field: "slug");

    public static readonly Error SurchargeMustNotBeNegative = Error.Validation(
        "blindType.surcharge.negative",
        "ჟალუზის ფასი არ შეიძლება იყოს უარყოფითი.",
        field: "surchargeMinor");

    public static readonly Error NotFound = Error.NotFound(
        "blindType.notFound",
        "მითითებული ჟალუზი ვერ მოიძებნა.");
}
