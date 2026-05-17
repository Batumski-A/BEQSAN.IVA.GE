using System.Text.RegularExpressions;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Domain.Catalog;

/// <summary>
/// A frame color / finish option the customer can pick at configurator
/// Step 6. Color is a configuration-level decision (not per-pane) — the
/// frame is unified across mullions, sashes, and outer trim.
///
/// <para>
/// Compatibility is keyed by material via <c>material_color_compatibility</c>:
/// wood laminates only apply to PVC-laminated, RAL Custom is offered to
/// everything, and PVC-white sticks to neutrals. Exactly one row per
/// material is flagged <see cref="IsDefault"/> — the configurator
/// auto-selects it on Step 6 entry so the price preview is non-empty.
/// </para>
/// <para>
/// Per ADR-0002 amendment 2026-05-18 (Step 6): surcharge is <em>flat per
/// order</em>, not per m². Paint match / lamination film prep is largely
/// fixed setup cost; per-m² pricing would punish small windows
/// disproportionately. Roman-locked rates live in the seeder.
/// </para>
/// <para>
/// <see cref="ColorFamily.RalCustom"/> is a placeholder slug
/// (<c>ral-custom</c>) — the actual chosen hex + RAL code arrive in the
/// <see cref="BEQSAN.Domain.Configurator.ColorSelection.CustomRalHex"/> /
/// <see cref="BEQSAN.Domain.Configurator.ColorSelection.CustomRalCode"/>
/// fields when the user picks from the RAL palette modal.
/// </para>
/// </summary>
public sealed partial class ColorOption
{
    public Guid Id { get; init; }
    public string Slug { get; init; } = string.Empty;
    public LocalizedText Name { get; init; } = new();
    public LocalizedText ShortDescription { get; init; } = new();
    public ColorFamily Family { get; init; }

    /// <summary>
    /// Hex code (#RRGGBB) used by the FRONT swatch and the 3D scene's
    /// frame material. For <see cref="ColorFamily.WoodLaminate"/> this is
    /// a fallback solid color while the texture loads.
    /// </summary>
    public string HexCode { get; init; } = "#FFFFFF";

    /// <summary>
    /// Canonical RAL code (e.g. <c>"RAL 9016"</c>) for printed/admin
    /// reference; null for custom / non-RAL palette entries.
    /// </summary>
    public string? RalCode { get; init; }

    /// <summary>
    /// Public path to the wood-grain texture; required for
    /// <see cref="ColorFamily.WoodLaminate"/>, null otherwise.
    /// </summary>
    public string? WoodTextureUrl { get; init; }

    /// <summary>Tetri added once per order; not per-m². 0 for standard colors.</summary>
    public int SurchargeMinor { get; init; }

    public Currency Currency { get; init; } = Currency.Gel;

    /// <summary>Per-material baseline — typically white-ral9016.</summary>
    public bool IsDefault { get; init; }

    public int SortOrder { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAtUtc { get; init; }

    public static Result<ColorOption> Create(
        string? slug,
        LocalizedText name,
        LocalizedText shortDescription,
        ColorFamily family,
        string? hexCode,
        string? ralCode,
        string? woodTextureUrl,
        int surchargeMinor,
        Currency currency,
        int sortOrder,
        bool isDefault,
        bool isActive = true)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return Result.Failure<ColorOption>(ColorOptionErrors.SlugRequired);
        }

        var normalizedSlug = slug.Trim().ToLowerInvariant();
        if (!IsValidSlug(normalizedSlug))
        {
            return Result.Failure<ColorOption>(ColorOptionErrors.SlugInvalid);
        }

        if (string.IsNullOrWhiteSpace(hexCode) || !IsValidHex(hexCode))
        {
            return Result.Failure<ColorOption>(ColorOptionErrors.HexInvalid);
        }

        if (ralCode is not null && !IsValidRalCode(ralCode))
        {
            return Result.Failure<ColorOption>(ColorOptionErrors.RalCodeInvalid);
        }

        if (family == ColorFamily.WoodLaminate && string.IsNullOrWhiteSpace(woodTextureUrl))
        {
            return Result.Failure<ColorOption>(ColorOptionErrors.WoodTextureRequired);
        }

        if (family != ColorFamily.WoodLaminate && !string.IsNullOrWhiteSpace(woodTextureUrl))
        {
            return Result.Failure<ColorOption>(ColorOptionErrors.WoodTextureForbidden);
        }

        if (surchargeMinor < 0)
        {
            return Result.Failure<ColorOption>(ColorOptionErrors.SurchargeMustNotBeNegative);
        }

        return Result.Success(new ColorOption
        {
            Id = Guid.NewGuid(),
            Slug = normalizedSlug,
            Name = name,
            ShortDescription = shortDescription,
            Family = family,
            HexCode = hexCode.ToUpperInvariant(),
            RalCode = ralCode,
            WoodTextureUrl = woodTextureUrl,
            SurchargeMinor = surchargeMinor,
            Currency = currency,
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

    public static bool IsValidHex(string s) =>
        HexRegex().IsMatch(s);

    public static bool IsValidRalCode(string s) =>
        RalRegex().IsMatch(s);

    [GeneratedRegex("^#[0-9A-Fa-f]{6}$")]
    private static partial Regex HexRegex();

    [GeneratedRegex(@"^RAL\s\d{4}$")]
    private static partial Regex RalRegex();
}

/// <summary>
/// Family-level grouping used by the FRONT swatch grid. Standard is
/// included at zero surcharge; Premium / WoodLaminate / RalCustom have
/// progressively higher flat surcharges.
/// </summary>
public enum ColorFamily
{
    Standard = 0,
    Premium = 1,
    WoodLaminate = 2,
    RalCustom = 3,
}

public static class ColorOptionErrors
{
    public static readonly Error SlugRequired = Error.Validation(
        "colorOption.slug.required",
        "ფერის slug სავალდებულოა.",
        field: "slug");

    public static readonly Error SlugInvalid = Error.Validation(
        "colorOption.slug.invalid",
        "Slug უნდა შეიცავდეს მხოლოდ ლათინურ მცირე ასოებს, ციფრებს და დეფისებს (2-64 სიმბოლო).",
        field: "slug");

    public static readonly Error HexInvalid = Error.Validation(
        "colorOption.hex.invalid",
        "ფერის hex კოდი არასწორია — მაგ. #F4F4F4.",
        field: "hexCode");

    public static readonly Error RalCodeInvalid = Error.Validation(
        "colorOption.ralCode.invalid",
        "RAL კოდის ფორმატი არასწორია — მაგ. RAL 9016.",
        field: "ralCode");

    public static readonly Error WoodTextureRequired = Error.Validation(
        "colorOption.woodTexture.required",
        "ხის ფაქტურის ფერს ფაქტურის ფაილი უნდა მიეთითოს.",
        field: "woodTextureUrl");

    public static readonly Error WoodTextureForbidden = Error.Validation(
        "colorOption.woodTexture.forbidden",
        "ფაქტურის ფაილი მხოლოდ ხის ფაქტურის ფერებისთვის.",
        field: "woodTextureUrl");

    public static readonly Error SurchargeMustNotBeNegative = Error.Validation(
        "colorOption.surcharge.negative",
        "ფერის დანამატის ფასი არ შეიძლება იყოს უარყოფითი.",
        field: "surchargeMinor");

    public static readonly Error NotFound = Error.NotFound(
        "colorOption.notFound",
        "მითითებული ფერი ვერ მოიძებნა.");
}
