using System.Globalization;
using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;

namespace BEQSAN.Domain.Configurator;

/// <summary>
/// Pure pricing function — no I/O, no time, no randomness. Same inputs
/// always produce the same breakdown.
///
/// Per ADR-0002: money is int minor units (tetri) at storage and transport;
/// decimal lives only in this calculator. Banker's rounding everywhere so
/// 0.5-tetri cases don't drift up systematically.
///
/// Composition (Step 4):
///   material_minor      = round(area × material.basePricePerSqmMinor)
///   for each pane p:
///     surcharge_minor  += round(area × p.widthRatio × material.basePricePerSqmMinor
///                                × SurchargeRate(p.openingType))
///     line emitted under code "pane.{position}.opening.{type}" if surcharge > 0
///   mosquito_minor      = 8000 tetri × #(panes with HasMosquitoNet)
///   subtotal_minor      = material + surcharge + mosquito
///   vat_minor           = round(subtotal × 0.18)
///   total_minor         = subtotal + vat
///
/// Backwards compat: when <c>panes</c> is null or empty the
/// calculator synthesizes a single full-width Fixed pane. Step 2 + Step 3
/// regression canaries (753.31 and 832.61 GEL) preserve under this default.
///
/// Future slices add glass / color / accessory / region lines onto the
/// same shape.
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

    public static Result<PriceBreakdown> Compute(
        ProductType productType,
        Material material,
        int widthCm,
        int heightCm,
        IReadOnlyList<ConfigurationPane>? panes = null)
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
        IReadOnlyList<ConfigurationPane> effective = panes is { Count: > 0 }
            ? panes
            : [new ConfigurationPane(1, 1.0m, PaneOpeningType.Fixed, null, false)];

        var layoutResult = LayoutValidator.Validate(productType, effective);
        if (layoutResult.IsFailure)
        {
            return Result.Failure<PriceBreakdown>(layoutResult.Errors);
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

        var mosquitoCount = effective.Count(p => p.HasMosquitoNet);
        var mosquitoMinor = mosquitoCount * MosquitoNetMinor;
        if (mosquitoMinor > 0)
        {
            lines.Add(new PriceLine("accessory.mosquito", "მწერების ბადე", mosquitoMinor));
        }

        var subtotalMinor = materialMinor + surchargeTotalMinor + mosquitoMinor;
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
