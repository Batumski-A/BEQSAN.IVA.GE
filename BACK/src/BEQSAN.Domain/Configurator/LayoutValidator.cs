using System.Globalization;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;

namespace BEQSAN.Domain.Configurator;

/// <summary>
/// Pure validation of a multi-pane layout against a product type. No I/O, no
/// time, no randomness — same inputs always produce the same Result. Used by
/// <see cref="PriceCalculator"/> before any pricing math runs.
///
/// Rules enforced (in this order, first failure wins so errors stay specific):
///   1. Pane count within slug-keyed [min, max] band.
///   2. Σ WidthRatio = 1.0 within 0.001 tolerance.
///   3. Positions form a complete 1..N sequence (no gaps, no duplicates).
///   4. Slug-specific rules:
///        door     — at most one Fixed pane (sidelight)
///        sliding  — every pane must be Sliding or Fixed
///   5. Hinge side matrix:
///        Casement / TiltAndTurn → HingeSide required
///        Fixed / Tilt / Sliding → HingeSide forbidden
///   6. Glass rules (only when an availableGlassTypes set is supplied):
///        - Each pane's GlassTypeId must be a key in the available set.
///        - Frosted + Tinted may not coexist on a single pane.
///   7. Color rules (only when a colorSelection is supplied):
///        - Outer color must be a key in the availableColorOptions set.
///        - Inner color (when supplied) must also be in the set.
///        - Dual-color (inner ≠ outer) is PVC-only.
///        - When the outer slug is <c>ral-custom</c>: CustomRalHex +
///          CustomRalCode must both be supplied and well-formed.
///   The optional params let Step 1-N call sites that don't yet know
///   about a rule family bypass it without breaking — every existing
///   canary keeps its number when called with null/omitted args.
/// </summary>
public static class LayoutValidator
{
    public static Result Validate(
        ProductType productType,
        IReadOnlyList<ConfigurationPane> panes,
        IReadOnlyDictionary<Guid, GlassType>? availableGlassTypes = null,
        Material? material = null,
        ColorSelection? colorSelection = null,
        IReadOnlyDictionary<Guid, ColorOption>? availableColorOptions = null)
    {
        if (productType is null)
        {
            return Result.Failure(ProductTypeErrors.NotFound);
        }

        if (panes is null || panes.Count == 0)
        {
            return Result.Failure(LayoutErrors.PanesRequired);
        }

        var (minPanes, maxPanes) = PaneCountRange(productType.Slug);
        if (panes.Count < minPanes || panes.Count > maxPanes)
        {
            return Result.Failure(
                LayoutErrors.PaneCountOutOfRange
                    .WithMetadata("min", minPanes)
                    .WithMetadata("max", maxPanes)
                    .WithMetadata("actual", panes.Count));
        }

        var ratioSum = panes.Sum(p => p.WidthRatio);
        if (Math.Abs(ratioSum - 1.0m) > 0.001m)
        {
            return Result.Failure(
                LayoutErrors.WidthRatioSum
                    .WithMetadata("expected", "1.000")
                    .WithMetadata(
                        "actual",
                        ratioSum.ToString("F3", CultureInfo.InvariantCulture)));
        }

        var expectedPositions = Enumerable.Range(1, panes.Count).ToHashSet();
        var actualPositions = panes.Select(p => p.Position).ToHashSet();
        if (!actualPositions.SetEquals(expectedPositions))
        {
            return Result.Failure(LayoutErrors.PositionsInvalid);
        }

        if (string.Equals(productType.Slug, "door", StringComparison.Ordinal))
        {
            var fixedCount = panes.Count(p => p.OpeningType == PaneOpeningType.Fixed);
            if (fixedCount > 1)
            {
                return Result.Failure(LayoutErrors.DoorTooManyFixed);
            }
        }

        if (string.Equals(productType.Slug, "sliding", StringComparison.Ordinal))
        {
            var illegal = panes.FirstOrDefault(p =>
                p.OpeningType is not (PaneOpeningType.Sliding or PaneOpeningType.Fixed));
            if (illegal is not null)
            {
                return Result.Failure(
                    LayoutErrors.SlidingInvalidOpening
                        .WithMetadata("position", illegal.Position)
                        .WithMetadata("got", illegal.OpeningType.ToString().ToLowerInvariant()));
            }
        }

        foreach (var pane in panes)
        {
            var needsHinge = pane.OpeningType is PaneOpeningType.Casement or PaneOpeningType.TiltAndTurn;
            if (needsHinge && pane.HingeSide is null)
            {
                return Result.Failure(
                    LayoutErrors.HingeRequired
                        .WithMetadata("position", pane.Position)
                        .WithMetadata("openingType", pane.OpeningType.ToString().ToLowerInvariant()));
            }

            if (!needsHinge && pane.HingeSide is not null)
            {
                return Result.Failure(
                    LayoutErrors.HingeForbidden
                        .WithMetadata("position", pane.Position)
                        .WithMetadata("openingType", pane.OpeningType.ToString().ToLowerInvariant()));
            }
        }

        // Glass rules — skipped entirely when the caller hasn't supplied a
        // compatible-types set (Step 4 tests + back-compat path). When the
        // set is present, every pane must reference a glass type from it,
        // and per-pane extras must not include the visually-conflicting
        // Frosted + Tinted pair.
        if (availableGlassTypes is { Count: > 0 })
        {
            foreach (var pane in panes)
            {
                if (pane.GlassTypeId == Guid.Empty)
                {
                    return Result.Failure(
                        LayoutErrors.GlassRequired
                            .WithMetadata("position", pane.Position));
                }

                if (!availableGlassTypes.ContainsKey(pane.GlassTypeId))
                {
                    return Result.Failure(
                        LayoutErrors.GlassNotCompatibleWithMaterial
                            .WithMetadata("position", pane.Position));
                }

                if (pane.Extras.Contains(GlassExtra.Frosted)
                    && pane.Extras.Contains(GlassExtra.Tinted))
                {
                    return Result.Failure(
                        LayoutErrors.GlassFrostedTintedConflict
                            .WithMetadata("position", pane.Position));
                }
            }
        }

        // Color rules — skipped when no colorSelection is supplied. The
        // calculator resolves the material's default color before passing
        // the selection in, so when this block runs we always have an
        // outer color id.
        if (colorSelection is not null)
        {
            if (availableColorOptions is null || availableColorOptions.Count == 0)
            {
                return Result.Failure(LayoutErrors.ColorCatalogMissing);
            }

            if (!availableColorOptions.TryGetValue(colorSelection.OuterColorOptionId, out var outerColor))
            {
                return Result.Failure(
                    LayoutErrors.ColorNotCompatibleWithMaterial
                        .WithMetadata("which", "outer"));
            }

            if (colorSelection.InnerColorOptionId is { } innerId
                && innerId != colorSelection.OuterColorOptionId)
            {
                if (!availableColorOptions.ContainsKey(innerId))
                {
                    return Result.Failure(
                        LayoutErrors.ColorNotCompatibleWithMaterial
                            .WithMetadata("which", "inner"));
                }

                // Dual-color is PVC-only — aluminum is single-pass painted.
                if (material is null || material.Family != MaterialFamily.Pvc)
                {
                    return Result.Failure(
                        LayoutErrors.ColorDualOnlyOnPvc
                            .WithMetadata(
                                "materialSlug",
                                material?.Slug ?? string.Empty));
                }
            }

            // RAL Custom requires hex + code on the request.
            if (string.Equals(outerColor.Slug, "ral-custom", StringComparison.Ordinal))
            {
                if (string.IsNullOrWhiteSpace(colorSelection.CustomRalHex)
                    || string.IsNullOrWhiteSpace(colorSelection.CustomRalCode))
                {
                    return Result.Failure(LayoutErrors.ColorRalCustomMissing);
                }

                if (!ColorOption.IsValidHex(colorSelection.CustomRalHex))
                {
                    return Result.Failure(
                        LayoutErrors.ColorRalCustomHexInvalid
                            .WithMetadata("got", colorSelection.CustomRalHex));
                }

                if (!ColorOption.IsValidRalCode(colorSelection.CustomRalCode))
                {
                    return Result.Failure(
                        LayoutErrors.ColorRalCustomCodeInvalid
                            .WithMetadata("got", colorSelection.CustomRalCode));
                }
            }
        }

        return Result.Success();
    }

    /// <summary>
    /// Slug-keyed pane-count band. ProductType.MinPaneCount / MaxPaneCount
    /// columns are Phase 2 admin work; until then the static table here is the
    /// source of truth, mirrored on the FRONT for the segmented control.
    /// </summary>
    public static (int Min, int Max) PaneCountRange(string? slug) =>
        (slug ?? string.Empty).ToLowerInvariant() switch
        {
            "window" => (1, 4),
            "door" => (1, 2),
            "sliding" => (2, 4),
            "panoramic" => (1, 6),
            "balcony" => (1, 8),
            _ => (1, 4),
        };
}

public static class LayoutErrors
{
    public static readonly Error PanesRequired = Error.Validation(
        "configurator.layout.panesRequired",
        "მინიმუმ ერთი პანელია სავალდებულო.",
        field: "panes");

    public static readonly Error PaneCountOutOfRange = Error.Validation(
        "configurator.layout.paneCount",
        "პანელების რაოდენობა დაშვებულ ფარგლებში უნდა იყოს.",
        field: "panes");

    public static readonly Error WidthRatioSum = Error.Validation(
        "configurator.layout.widthRatioSum",
        "პანელების სიგანე უნდა ჯამდებოდეს მთლიან სიგანემდე.",
        field: "panes");

    public static readonly Error PositionsInvalid = Error.Validation(
        "configurator.layout.positions",
        "პანელების ნომრები უნდა იყოს თანმიმდევრული 1-დან.",
        field: "panes");

    public static readonly Error DoorTooManyFixed = Error.Validation(
        "configurator.layout.door.tooManyFixed",
        "კარს მაქს. 1 ყრუ პანელი (გვერდითი) შეიძლება ჰქონდეს.",
        field: "panes");

    public static readonly Error SlidingInvalidOpening = Error.Validation(
        "configurator.layout.sliding.invalidOpening",
        "სლაიდინგ სისტემაში მხოლოდ ყრუ ან მცოცავი პანელია.",
        field: "panes");

    public static readonly Error HingeRequired = Error.Validation(
        "configurator.layout.pane.hingeRequired",
        "ამ პანელს მენტეშის მხარე უნდა მიეთითოს.",
        field: "panes");

    public static readonly Error HingeForbidden = Error.Validation(
        "configurator.layout.pane.hingeForbidden",
        "ამ პანელისთვის მენტეშის მხარე არ უნდა მიეთითოს.",
        field: "panes");

    public static readonly Error GlassRequired = Error.Validation(
        "configurator.glass.required",
        "პანელს მინის ტიპი არ აქვს არჩეული.",
        field: "panes");

    public static readonly Error GlassNotCompatibleWithMaterial = Error.BusinessRule(
        "configurator.glass.notCompatibleWithMaterial",
        "ეს მინა ამ მასალაში არ მუშავდება.") with
    { Field = "panes" };

    public static readonly Error GlassFrostedTintedConflict = Error.Validation(
        "configurator.glass.frostedTintedConflict",
        "მქრქალი და ტონირებული ერთად შეუძლებელია — ერთი აირჩიე.",
        field: "panes");

    public static readonly Error ColorCatalogMissing = Error.Validation(
        "configurator.color.catalogMissing",
        "ფერების კატალოგი ვერ ჩაიტვირთა.",
        field: "color");

    public static readonly Error ColorNotCompatibleWithMaterial = Error.BusinessRule(
        "configurator.color.notCompatibleWithMaterial",
        "ეს ფერი ამ მასალაში არ მუშავდება.") with
    { Field = "color" };

    public static readonly Error ColorDualOnlyOnPvc = Error.BusinessRule(
        "configurator.color.dualOnlyOnPvc",
        "ცალკე შიდა ფერი მხოლოდ PVC-ისთვის — ალუმინი ერთფეროვანი იწერება.") with
    { Field = "color" };

    public static readonly Error ColorRalCustomMissing = Error.Validation(
        "configurator.color.ralCustomMissing",
        "RAL პალიტრიდან ფერი არ აირჩა.",
        field: "color");

    public static readonly Error ColorRalCustomHexInvalid = Error.Validation(
        "configurator.color.ralCustomHexInvalid",
        "ფერის hex კოდი არასწორია.",
        field: "color");

    public static readonly Error ColorRalCustomCodeInvalid = Error.Validation(
        "configurator.color.ralCustomCodeInvalid",
        "RAL კოდის ფორმატი არასწორია — მაგ. RAL 9016.",
        field: "color");
}
