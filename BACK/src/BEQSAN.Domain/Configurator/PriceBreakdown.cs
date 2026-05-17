namespace BEQSAN.Domain.Configurator;

/// <summary>
/// Result of a price computation. AreaSqm is the exact computed area
/// (4 decimal places); lines hold each pricing contribution in tetri;
/// TotalMinor is their sum. Currency is the ISO-style code.
/// </summary>
public sealed record PriceBreakdown(
    decimal AreaSqm,
    IReadOnlyList<PriceLine> Lines,
    long TotalMinor,
    string Currency);
