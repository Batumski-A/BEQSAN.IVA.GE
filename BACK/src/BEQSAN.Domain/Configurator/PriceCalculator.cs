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
/// Phase 1: material × area + 18% VAT. Future slices add glass / color /
/// accessory / region lines by composing more <see cref="PriceLine"/> entries.
/// </summary>
public static class PriceCalculator
{
    public const decimal VatRate = 0.18m;
    public const int AbsoluteMinDimensionCm = 30;
    public const int AbsoluteMaxDimensionCm = 800; // per-product-type ranges are tighter

    public static Result<PriceBreakdown> Compute(
        ProductType productType,
        Material material,
        int widthCm,
        int heightCm)
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

        var areaSqm = decimal.Round(
            (decimal)widthCm * heightCm / 10_000m,
            4,
            MidpointRounding.ToEven);

        var materialMinor = (long)decimal.Round(
            areaSqm * material.BasePricePerSqmMinor,
            0,
            MidpointRounding.ToEven);

        var vatMinor = (long)decimal.Round(
            materialMinor * VatRate,
            0,
            MidpointRounding.ToEven);

        var totalMinor = materialMinor + vatMinor;

        var lines = new[]
        {
            new PriceLine("material", "მასალა", materialMinor),
            new PriceLine("vat", "დღგ (18%)", vatMinor),
        };

        return Result.Success(new PriceBreakdown(
            AreaSqm: areaSqm,
            Lines: lines,
            TotalMinor: totalMinor,
            Currency: material.Currency.ToString().ToUpperInvariant()));
    }
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
