using System.Globalization;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;
using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Domain.Configurator;

/// <summary>
/// Pure pricing function — no I/O, no time, no randomness. Same inputs
/// always produce the same breakdown.
///
/// Per ADR-0002: money is int minor units (tetri) at storage and transport;
/// decimal lives only in this calculator. Banker's rounding everywhere so
/// 0.5-tetri cases don't drift up systematically.
///
/// Composition (Step 5):
///   material_minor      = round(area × material.basePricePerSqmMinor)
///   for each pane p with paneArea = area × p.widthRatio:
///     opening_minor    += round(paneArea × material.basePricePerSqmMinor
///                                × SurchargeRate(p.openingType))
///                          → line "pane.{n}.opening.{type}" if > 0
///     glass_minor      += round(paneArea × glassType.SurchargePerSqmMinor)
///                          → line "pane.{n}.glass.{slug}" if > 0
///     for each distinct extra:
///       extra_minor    += round(paneArea × GlassExtraPricing.SurchargeMinor(extra))
///                          → line "pane.{n}.glass.extra.{name}"
///   mosquito_minor      = 8000 tetri × #(panes with HasMosquitoNet)
///   subtotal_minor      = material + opening + glass + extras + mosquito
///   vat_minor           = round(subtotal × 0.18)
///   total_minor         = subtotal + vat
///
/// Backwards compat:
///   - When <c>panes</c> is null or empty, a single full-width Fixed pane is
///     synthesized. Canaries #1 / #2 hold (753.31 / 832.61 GEL).
///   - When <c>availableGlassTypes</c> is null/empty, all glass math is
///     skipped. Canary #3 holds (1077.23 GEL) because the Step 4 commit was
///     written before glass landed and its tests don't pass a glass set.
///   - When <c>availableGlassTypes</c> is supplied, panes with
///     <see cref="ConfigurationPane.GlassTypeId"/> == <see cref="Guid.Empty"/>
///     are auto-resolved to the IsDefault glass type for that material so
///     callers don't need to know the material's default themselves.
/// </summary>
public static class PriceCalculator
{
    public const decimal VatRate = 0.18m;
    public const int AbsoluteMinDimensionCm = 30;
    public const int AbsoluteMaxDimensionCm = 800;

    /// <summary>Per-pane mosquito-net flat surcharge in tetri. Phase-2 accessory entity replaces.</summary>
    public const long MosquitoNetMinor = 8000L;

    public static decimal SurchargeRate(PaneOpeningType type) => type switch
    {
        PaneOpeningType.Fixed => 0.00m,
        PaneOpeningType.Casement => 0.08m,
        PaneOpeningType.Tilt => 0.10m,
        PaneOpeningType.TiltAndTurn => 0.18m,
        PaneOpeningType.Sliding => 0.12m,
        _ => 0.00m,
    };

    /// <summary>Inner-color surcharge applied at 60% of the inner option's flat
    /// surcharge — dual-color is cheaper than two full paint jobs because only
    /// the inner face is reworked from the baseline white.</summary>
    public const decimal InnerColorRate = 0.60m;

    /// <summary>Sill per-meter base rate in tetri (8 000 = 80 ₾/m). Phase-2
    /// admin tooling promotes this to a PricingRule row.</summary>
    public const long SillPerMeterMinor = 8000L;

    /// <summary>Tetri added on top of a blind's base + per-m² when the
    /// requested control is Electric.</summary>
    public const long BlindElectricControlSurchargeMinor = 4500L;

    /// <summary>Tetri added when the requested control is Remote (motor +
    /// handheld). Higher than Electric because the remote bundle includes
    /// a paired transmitter.</summary>
    public const long BlindRemoteControlSurchargeMinor = 8500L;

    public static Result<PriceBreakdown> Compute(
        ProductType productType,
        Material material,
        int widthCm,
        int heightCm,
        IReadOnlyList<ConfigurationPane>? panes = null,
        IReadOnlyDictionary<Guid, GlassType>? availableGlassTypes = null,
        ColorSelection? colorSelection = null,
        IReadOnlyDictionary<Guid, ColorOption>? availableColorOptions = null,
        AccessorySelection? accessories = null,
        AccessoryCatalog? accessoryCatalog = null)
    {
        if (productType is null)
        {
            return Result.Failure<PriceBreakdown>(ProductTypeErrors.NotFound);
        }

        if (material is null)
        {
            return Result.Failure<PriceBreakdown>(MaterialErrors.NotFound);
        }

        if (material.ProductTypeId != productType.Id)
        {
            return Result.Failure<PriceBreakdown>(MaterialErrors.NotInProductType);
        }

        var constraints = productType.GetConstraints();

        if (!constraints.IsWidthInRange(widthCm))
        {
            return Result.Failure<PriceBreakdown>(
                PriceErrors.WidthOutOfRange
                    .WithMetadata("min", constraints.MinWidthCm)
                    .WithMetadata("max", constraints.MaxWidthCm)
                    .WithMetadata("actual", widthCm));
        }

        if (!constraints.IsHeightInRange(heightCm))
        {
            return Result.Failure<PriceBreakdown>(
                PriceErrors.HeightOutOfRange
                    .WithMetadata("min", constraints.MinHeightCm)
                    .WithMetadata("max", constraints.MaxHeightCm)
                    .WithMetadata("actual", heightCm));
        }

        // Backcompat: empty / null panes → single full-width Fixed pane so Step 2/3
        // canaries (and the test-by-design omitted-panes flow) keep their numbers.
        IReadOnlyList<ConfigurationPane> baseline = panes is { Count: > 0 }
            ? panes
            : [new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false)];

        // Resolve "use the material's default glass" markers (Guid.Empty) when
        // the caller has supplied a compatible-types set. Without a set we
        // stay on the Step 4 code path — glass math is skipped entirely and
        // the legacy canaries (#1, #2, #3) hold byte-for-byte.
        GlassType? defaultGlass = null;
        IReadOnlyList<ConfigurationPane> effective;
        if (availableGlassTypes is { Count: > 0 })
        {
            defaultGlass = ResolveDefaultGlass(availableGlassTypes.Values);
            var resolved = new List<ConfigurationPane>(baseline.Count);
            foreach (var p in baseline)
            {
                if (p.GlassTypeId == Guid.Empty && defaultGlass is not null)
                {
                    resolved.Add(p with { GlassTypeId = defaultGlass.Id });
                }
                else
                {
                    resolved.Add(p);
                }
            }
            effective = resolved;
        }
        else
        {
            effective = baseline;
        }

        // Resolve "use material default color" when a color catalog is
        // supplied but the caller didn't pass a ColorSelection. This is the
        // Steps 1-5 back-compat path — request bodies without a `color`
        // object still produce the right price (default color is white-
        // ral9016 across all materials, surcharge 0, so earlier canaries
        // hold byte-for-byte).
        var effectiveColor = colorSelection;
        if (effectiveColor is null && availableColorOptions is { Count: > 0 })
        {
            var defaultColor = ResolveDefaultColor(availableColorOptions.Values);
            if (defaultColor is not null)
            {
                effectiveColor = new ColorSelection(defaultColor.Id);
            }
        }

        var layoutResult = LayoutValidator.Validate(
            productType, effective, availableGlassTypes,
            material, effectiveColor, availableColorOptions);
        if (layoutResult.IsFailure)
        {
            return Result.Failure<PriceBreakdown>(layoutResult.Errors);
        }

        // Step-7 accessory rules — null catalog means "no validator data,
        // skip the block" so Steps 1-6 callers stay byte-for-byte
        // identical. When the catalog is supplied, the validator runs
        // regardless of whether accessories is null (handles the door-
        // required-accessory cases).
        var effectiveCatalog = accessoryCatalog ?? AccessoryCatalog.Empty;
        if (!effectiveCatalog.IsEmpty || accessories is not null)
        {
            var accessoryResult = AccessoryValidator.Validate(
                productType, material, effective, accessories, effectiveCatalog);
            if (accessoryResult.IsFailure)
            {
                return Result.Failure<PriceBreakdown>(accessoryResult.Errors);
            }
        }

        var areaSqm = decimal.Round(
            (decimal)widthCm * heightCm / 10_000m,
            4,
            MidpointRounding.ToEven);

        var materialMinor = (long)decimal.Round(
            areaSqm * material.BasePricePerSqmMinor,
            0,
            MidpointRounding.ToEven);

        var lines = new List<PriceLine>(capacity: 2 + effective.Count + 1)
        {
            new("material", "მასალა", materialMinor),
        };

        var surchargeTotalMinor = 0L;
        foreach (var pane in effective.OrderBy(p => p.Position))
        {
            var rate = SurchargeRate(pane.OpeningType);
            if (rate <= 0m)
            {
                continue;
            }

            var paneMaterialDecimal = areaSqm * pane.WidthRatio * material.BasePricePerSqmMinor;
            var surchargeMinor = (long)decimal.Round(
                paneMaterialDecimal * rate,
                0,
                MidpointRounding.ToEven);

            if (surchargeMinor == 0)
            {
                continue;
            }

            surchargeTotalMinor += surchargeMinor;
            var typeToken = pane.OpeningType.ToString().ToLowerInvariant();
            var typeLabel = OpeningLabelKa(pane.OpeningType);
            lines.Add(new PriceLine(
                Code: $"pane.{pane.Position}.opening.{typeToken}",
                Label: string.Create(CultureInfo.InvariantCulture, $"პანელი {pane.Position} · {typeLabel}"),
                AmountMinor: surchargeMinor));
        }

        // Per-pane glass surcharge + extras. Skipped entirely when the
        // caller didn't pass an availableGlassTypes set (Step 4 path).
        var glassTotalMinor = 0L;
        var extrasTotalMinor = 0L;
        if (availableGlassTypes is { Count: > 0 })
        {
            foreach (var pane in effective.OrderBy(p => p.Position))
            {
                if (!availableGlassTypes.TryGetValue(pane.GlassTypeId, out var glass))
                {
                    continue;
                }

                var paneAreaSqm = areaSqm * pane.WidthRatio;

                if (glass.SurchargePerSqmMinor > 0)
                {
                    var glassSurchargeMinor = (long)decimal.Round(
                        paneAreaSqm * glass.SurchargePerSqmMinor,
                        0,
                        MidpointRounding.ToEven);
                    if (glassSurchargeMinor != 0)
                    {
                        glassTotalMinor += glassSurchargeMinor;
                        lines.Add(new PriceLine(
                            Code: $"pane.{pane.Position}.glass.{glass.Slug}",
                            Label: string.Create(CultureInfo.InvariantCulture, $"პანელი {pane.Position} · {GlassNameKa(glass)}"),
                            AmountMinor: glassSurchargeMinor));
                    }
                }

                foreach (var extra in pane.Extras.Distinct())
                {
                    var rateMinor = GlassExtraPricing.SurchargeMinor(extra);
                    if (rateMinor == 0)
                    {
                        continue;
                    }

                    var extraMinor = (long)decimal.Round(
                        paneAreaSqm * rateMinor,
                        0,
                        MidpointRounding.ToEven);
                    if (extraMinor == 0)
                    {
                        continue;
                    }

                    extrasTotalMinor += extraMinor;
                    var extraToken = extra.ToString().ToLowerInvariant();
                    lines.Add(new PriceLine(
                        Code: $"pane.{pane.Position}.glass.extra.{extraToken}",
                        Label: string.Create(CultureInfo.InvariantCulture, $"პანელი {pane.Position} · {ExtraLabelKa(extra)}"),
                        AmountMinor: extraMinor));
                }
            }
        }

        var mosquitoCount = effective.Count(p => p.HasMosquitoNet);
        var mosquitoMinor = mosquitoCount * MosquitoNetMinor;
        if (mosquitoMinor > 0)
        {
            lines.Add(new PriceLine("accessory.mosquito", "მწერების ბადე", mosquitoMinor));
        }

        // Color surcharge — flat per order (paint match + lamination film
        // prep is fixed setup cost; not material-proportional). Lines are
        // emitted only when surcharge > 0 so a default-white selection
        // doesn't add noise to the breakdown.
        var colorOuterMinor = 0L;
        var colorInnerMinor = 0L;
        if (effectiveColor is not null
            && availableColorOptions is { Count: > 0 }
            && availableColorOptions.TryGetValue(effectiveColor.OuterColorOptionId, out var outerColor))
        {
            colorOuterMinor = outerColor.SurchargeMinor;
            if (colorOuterMinor > 0)
            {
                lines.Add(new PriceLine(
                    Code: $"color.outer.{outerColor.Slug}",
                    Label: string.Create(CultureInfo.InvariantCulture, $"ფერი · {ColorNameKa(outerColor)}"),
                    AmountMinor: colorOuterMinor));
            }

            if (effectiveColor.InnerColorOptionId is { } innerId
                && innerId != effectiveColor.OuterColorOptionId
                && availableColorOptions.TryGetValue(innerId, out var innerColor))
            {
                colorInnerMinor = (long)decimal.Round(
                    innerColor.SurchargeMinor * InnerColorRate,
                    0,
                    MidpointRounding.ToEven);
                if (colorInnerMinor > 0)
                {
                    lines.Add(new PriceLine(
                        Code: $"color.inner.{innerColor.Slug}",
                        Label: string.Create(CultureInfo.InvariantCulture, $"შიდა ფერი · {ColorNameKa(innerColor)}"),
                        AmountMinor: colorInnerMinor));
                }
            }
        }

        // Step-7 accessory line items. Validator above already accepted
        // the selection (or rejected it). Lines are emitted only when
        // the calculated amount is > 0 to keep the breakdown clean for
        // skipped sections.
        var accessoryTotalMinor = 0L;
        if (accessories is not null && !effectiveCatalog.IsEmpty)
        {
            var openableCount = effective.Count(p => p.OpeningType != PaneOpeningType.Fixed);

            // Handle — per openable pane.
            if (accessories.HandleStyleId is { } handleId && openableCount > 0
                && effectiveCatalog.TryGetHandle(handleId) is { } handle)
            {
                var handleTotalMinor = (long)handle.SurchargePerPaneMinor * openableCount;
                if (handleTotalMinor > 0)
                {
                    accessoryTotalMinor += handleTotalMinor;
                    lines.Add(new PriceLine(
                        Code: $"accessory.handle.{handle.Slug}",
                        Label: string.Create(CultureInfo.InvariantCulture, $"სახელური · {LocalKa(handle.Name, handle.Slug)} × {openableCount}"),
                        AmountMinor: handleTotalMinor));
                }
            }

            // Lock — per openable pane.
            if (accessories.LockTypeId is { } lockId && openableCount > 0
                && effectiveCatalog.TryGetLock(lockId) is { } lockType)
            {
                var lockTotalMinor = (long)lockType.SurchargePerPaneMinor * openableCount;
                if (lockTotalMinor > 0)
                {
                    accessoryTotalMinor += lockTotalMinor;
                    lines.Add(new PriceLine(
                        Code: $"accessory.lock.{lockType.Slug}",
                        Label: string.Create(CultureInfo.InvariantCulture, $"საკეტი · {LocalKa(lockType.Name, lockType.Slug)} × {openableCount}"),
                        AmountMinor: lockTotalMinor));
                }
            }

            // Sill — linear-metre rate × multiplier (Both = 2×).
            if (accessories.Sill is { } sill)
            {
                var lengthCm = sill.CustomLengthCm ?? widthCm;
                var lengthM = lengthCm / 100m;
                var multiplier = sill.Position == SillPosition.Both ? 2m : 1m;
                var sillMinor = (long)decimal.Round(
                    lengthM * multiplier * SillPerMeterMinor,
                    0,
                    MidpointRounding.ToEven);
                if (sillMinor > 0)
                {
                    accessoryTotalMinor += sillMinor;
                    var posToken = sill.Position.ToString().ToLowerInvariant();
                    lines.Add(new PriceLine(
                        Code: $"accessory.sill.{posToken}",
                        Label: string.Create(CultureInfo.InvariantCulture, $"ფერთულა · {SillPositionLabelKa(sill.Position)} · {lengthM.ToString("F2", CultureInfo.InvariantCulture)}მ"),
                        AmountMinor: sillMinor));
                }
            }

            // Blind — base mounting + per-m² + control surcharge.
            if (accessories.Blind is { } blind
                && effectiveCatalog.TryGetBlind(blind.BlindTypeId) is { } blindType)
            {
                var blindAreaMinor = (long)decimal.Round(
                    areaSqm * blindType.SurchargePerSqmMinor,
                    0,
                    MidpointRounding.ToEven);
                var controlSurchargeMinor = blind.Control switch
                {
                    BlindControl.Electric => BlindElectricControlSurchargeMinor,
                    BlindControl.Remote => BlindRemoteControlSurchargeMinor,
                    BlindControl.Manual => 0L,
                    _ => 0L,
                };
                var blindTotalMinor = blindType.BaseMountingMinor + blindAreaMinor + controlSurchargeMinor;
                if (blindTotalMinor > 0)
                {
                    accessoryTotalMinor += blindTotalMinor;
                    lines.Add(new PriceLine(
                        Code: $"accessory.blind.{blindType.Slug}",
                        Label: string.Create(CultureInfo.InvariantCulture, $"ჟალუზი · {LocalKa(blindType.Name, blindType.Slug)}"),
                        AmountMinor: blindTotalMinor));
                }
            }
        }

        var subtotalMinor = materialMinor + surchargeTotalMinor + glassTotalMinor
            + extrasTotalMinor + mosquitoMinor + colorOuterMinor + colorInnerMinor
            + accessoryTotalMinor;
        var vatMinor = (long)decimal.Round(
            subtotalMinor * VatRate,
            0,
            MidpointRounding.ToEven);
        lines.Add(new PriceLine("vat", "დღგ (18%)", vatMinor));

        var totalMinor = subtotalMinor + vatMinor;

        return Result.Success(new PriceBreakdown(
            AreaSqm: areaSqm,
            Lines: lines,
            TotalMinor: totalMinor,
            Currency: material.Currency.ToString().ToUpperInvariant()));
    }

    private static string OpeningLabelKa(PaneOpeningType type) => type switch
    {
        PaneOpeningType.Fixed => "ყრუ",
        PaneOpeningType.Casement => "გასაღები",
        PaneOpeningType.Tilt => "დასაკეცი",
        PaneOpeningType.TiltAndTurn => "გასაღები + დასაკეცი",
        PaneOpeningType.Sliding => "სლაიდინგი",
        _ => "?",
    };

    private static string GlassNameKa(GlassType glass)
    {
        // Prefer the seeded LocalizedText.ka if present; fall back to the
        // slug so a half-seeded row still produces a legible line label.
        var ka = glass.Name.Ka;
        return string.IsNullOrWhiteSpace(ka) ? glass.Slug : ka;
    }

    private static string ExtraLabelKa(GlassExtra extra) => extra switch
    {
        GlassExtra.LowECoating => "Low-E საფარი",
        GlassExtra.Tempered => "დაკაჟებული",
        GlassExtra.Frosted => "მქრქალი",
        GlassExtra.Tinted => "ტონირებული",
        _ => "?",
    };

    private static GlassType? ResolveDefaultGlass(IEnumerable<GlassType> set)
    {
        // The seeder flags exactly one row per material as IsDefault. Defensive
        // fallback: the lowest-surcharge row if no default is flagged — keeps
        // pricing predictable even in mis-seeded environments.
        var defaults = set.Where(g => g.IsDefault).ToList();
        if (defaults.Count == 1)
        {
            return defaults[0];
        }
        return set.OrderBy(g => g.SurchargePerSqmMinor).ThenBy(g => g.SortOrder).FirstOrDefault();
    }

    private static ColorOption? ResolveDefaultColor(IEnumerable<ColorOption> set)
    {
        var defaults = set.Where(c => c.IsDefault).ToList();
        if (defaults.Count == 1)
        {
            return defaults[0];
        }
        // Defensive: lowest surcharge / earliest sort order. Excludes
        // ral-custom so a mis-seeded "everything's default" environment
        // doesn't auto-apply a 250 ₾ premium to every quote.
        return set
            .Where(c => c.Family != ColorFamily.RalCustom)
            .OrderBy(c => c.SurchargeMinor)
            .ThenBy(c => c.SortOrder)
            .FirstOrDefault();
    }

    private static string ColorNameKa(ColorOption color)
    {
        var ka = color.Name.Ka;
        return string.IsNullOrWhiteSpace(ka) ? color.Slug : ka;
    }

    private static string LocalKa(LocalizedText name, string slug)
    {
        var ka = name.Ka;
        return string.IsNullOrWhiteSpace(ka) ? slug : ka;
    }

    private static string SillPositionLabelKa(SillPosition pos) => pos switch
    {
        SillPosition.Inner => "შიდა",
        SillPosition.Outer => "გარეთა",
        SillPosition.Both => "ორივე",
        _ => "?",
    };
}

public static class PriceErrors
{
    public static readonly Error WidthOutOfRange = Error.Validation(
        "configurator.dimensions.widthOutOfRange",
        "სიგანე უნდა იყოს დაშვებულ ფარგლებში.",
        field: "widthCm");

    public static readonly Error HeightOutOfRange = Error.Validation(
        "configurator.dimensions.heightOutOfRange",
        "სიმაღლე უნდა იყოს დაშვებულ ფარგლებში.",
        field: "heightCm");
}
