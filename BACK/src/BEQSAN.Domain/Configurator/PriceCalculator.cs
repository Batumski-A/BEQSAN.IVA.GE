using BEQSAN.Domain.Catalog;
using BEQSAN.Domain.Common;

namespace BEQSAN.Domain.Configurator;

/// <summary>
/// Pure pricing function — no I/O, no time, no randomness. Same inputs
/// always produce the same breakdown. Per ADR-0002, money lives in
/// int minor units (tetri) throughout; decimal is used only for
/// intermediate area math, then cast back to long at every boundary.
///
/// Phase 1: material × area + 18% VAT. Future slices add glass / color /
/// accessory / region lines without changing the public shape — handlers
/// just compose more PriceLine entries.
/// </summary>
public static class PriceCalculator
{
    public const decimal VatRate = 0.18m;        // Georgia standard VAT
    public const int MinDimensionCm = 30;
    public const int MaxDimensionCm = 400;

    public static Result<PriceBreakdown> Compute(Material material, int widthCm, int heightCm)
    {
        if (material is null)
        {
            return Result.Failure<PriceBreakdown>(MaterialErrors.NotFound);
        }

        if (widthCm is < MinDimensionCm or > MaxDimensionCm)
        {
            return Result.Failure<PriceBreakdown>(PriceErrors.WidthOutOfRange);
        }

        if (heightCm is < MinDimensionCm or > MaxDimensionCm)
        {
            return Result.Failure<PriceBreakdown>(PriceErrors.HeightOutOfRange);
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
        $"სიგანე უნდა იყოს {PriceCalculator.MinDimensionCm}-{PriceCalculator.MaxDimensionCm} სმ შორის.",
        field: "widthCm");

    public static readonly Error HeightOutOfRange = Error.Validation(
        "configurator.dimensions.heightOutOfRange",
        $"სიმაღლე უნდა იყოს {PriceCalculator.MinDimensionCm}-{PriceCalculator.MaxDimensionCm} სმ შორის.",
        field: "heightCm");
}
