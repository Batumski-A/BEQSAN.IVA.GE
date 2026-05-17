using BEQSAN.Domain.Common;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Domain.Catalog;

/// <summary>
/// A glass package the customer can pick per pane — single/double/triple/quadruple
/// layers, with optional pre-applied treatments (Low-E, tempered, frosted,
/// tinted). Availability is gated by the chosen material via the
/// <c>material_glass_compatibility</c> table — e.g. quadruple-Low-E is only
/// offered with aluminum-thermal profiles that can carry the weight.
///
/// One row per material family is flagged <see cref="IsDefault"/> so the
/// configurator can auto-select a sensible baseline when the user lands on
/// Step 5 — usually <c>double-standard</c>.
///
/// Per ADR-0002 amendment 2026-05-17 (Step 5): <see cref="SurchargePerSqmMinor"/>
/// is integer tetri above the material baseline; the default package carries 0.
/// Extra treatments applied on top of a glass type (e.g. tempering a
/// double-Low-E pane) live in <see cref="Configurator.GlassExtra"/>.
/// </summary>
public sealed class GlassType
{
    public Guid Id { get; init; }
    public string Slug { get; init; } = string.Empty;
    public LocalizedText Name { get; init; } = new();
    public LocalizedText ShortDescription { get; init; } = new();

    /// <summary>1..4 — number of glass sheets stacked in the unit.</summary>
    public int PaneCount { get; init; }

    /// <summary>
    /// Tetri / m² added on top of the material baseline. 0 means this is the
    /// per-material baseline package. Always integer; decimal only in the
    /// calculator (per ADR-0002).
    /// </summary>
    public int SurchargePerSqmMinor { get; init; }

    public Currency Currency { get; init; } = Currency.Gel;

    /// <summary>
    /// Thermal transmittance — W/(m²·K). Informational, used in marketing
    /// copy on the Step 5 card. Lower = better insulation.
    /// </summary>
    public decimal UValue { get; init; }

    public int SortOrder { get; init; }

    /// <summary>
    /// True for the per-material baseline. Exactly one row per material in
    /// <c>material_glass_compatibility</c> should be flagged default — the
    /// reader resolves it for the configurator's auto-select.
    /// </summary>
    public bool IsDefault { get; init; }

    public bool IsActive { get; init; }
    public DateTime CreatedAtUtc { get; init; }

    public static Result<GlassType> Create(
        string? slug,
        LocalizedText name,
        LocalizedText shortDescription,
        int paneCount,
        int surchargePerSqmMinor,
        Currency currency,
        decimal uValue,
        int sortOrder,
        bool isDefault,
        bool isActive = true)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return Result.Failure<GlassType>(GlassTypeErrors.SlugRequired);
        }

        var normalizedSlug = slug.Trim().ToLowerInvariant();
        if (!IsValidSlug(normalizedSlug))
        {
            return Result.Failure<GlassType>(GlassTypeErrors.SlugInvalid);
        }

        if (paneCount is < 1 or > 4)
        {
            return Result.Failure<GlassType>(GlassTypeErrors.PaneCountOutOfRange);
        }

        if (surchargePerSqmMinor < 0)
        {
            return Result.Failure<GlassType>(GlassTypeErrors.SurchargeMustNotBeNegative);
        }

        if (uValue is <= 0m or > 10m)
        {
            return Result.Failure<GlassType>(GlassTypeErrors.UValueOutOfRange);
        }

        return Result.Success(new GlassType
        {
            Id = Guid.NewGuid(),
            Slug = normalizedSlug,
            Name = name,
            ShortDescription = shortDescription,
            PaneCount = paneCount,
            SurchargePerSqmMinor = surchargePerSqmMinor,
            Currency = currency,
            UValue = uValue,
            SortOrder = sortOrder,
            IsDefault = isDefault,
            IsActive = isActive,
            CreatedAtUtc = DateTime.UtcNow,
        });
    }

    private static bool IsValidSlug(string slug)
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

public static class GlassTypeErrors
{
    public static readonly Error SlugRequired = Error.Validation(
        "glassType.slug.required",
        "მინის ტიპის slug სავალდებულოა.",
        field: "slug");

    public static readonly Error SlugInvalid = Error.Validation(
        "glassType.slug.invalid",
        "Slug უნდა შეიცავდეს მხოლოდ ლათინურ მცირე ასოებს, ციფრებს და დეფისებს (2-64 სიმბოლო).",
        field: "slug");

    public static readonly Error PaneCountOutOfRange = Error.Validation(
        "glassType.paneCount.outOfRange",
        "მინის ფენების რაოდენობა უნდა იყოს 1-4 შორის.",
        field: "paneCount");

    public static readonly Error SurchargeMustNotBeNegative = Error.Validation(
        "glassType.surcharge.negative",
        "მინის დანამატის ფასი არ შეიძლება იყოს უარყოფითი.",
        field: "surchargePerSqmMinor");

    public static readonly Error UValueOutOfRange = Error.Validation(
        "glassType.uValue.outOfRange",
        "U-მნიშვნელობა უნდა იყოს 0-10 დიაპაზონში.",
        field: "uValue");

    public static readonly Error NotFound = Error.NotFound(
        "glassType.notFound",
        "მითითებული მინის ტიპი ვერ მოიძებნა.");

    public static readonly Error NotCompatibleWithMaterial = Error.BusinessRule(
        "configurator.glass.notCompatibleWithMaterial",
        "ეს მინა ამ მასალაში არ მუშავდება.");
}
