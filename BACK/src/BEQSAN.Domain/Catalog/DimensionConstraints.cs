namespace BEQSAN.Domain.Catalog;

/// <summary>
/// Per-product-type allowed dimension range for the Configurator. Sourced from
/// the ProductType row (admin-editable in Phase 2); falls back to a slug-keyed
/// default for unknown / legacy slugs so the calculator can never NPE on a
/// missing range.
/// </summary>
public sealed record DimensionConstraints(
    int MinWidthCm,
    int MaxWidthCm,
    int MinHeightCm,
    int MaxHeightCm)
{
    public static readonly DimensionConstraints Default = new(30, 400, 30, 400);

    /// <summary>
    /// Slug-keyed market-realistic defaults used when seeding new product types and
    /// as a safety net when a row hasn't migrated yet. Final numbers are admin-locked
    /// per-row; this static map is the floor, not the contract.
    /// </summary>
    public static DimensionConstraints ForProductType(string? slug) =>
        (slug ?? string.Empty).ToLowerInvariant() switch
        {
            "window" => new(30, 300, 30, 250),
            "door" => new(60, 140, 180, 260),
            "sliding" => new(120, 600, 180, 280),
            "panoramic" => new(150, 800, 200, 350),
            "balcony" => new(80, 600, 80, 280),
            _ => Default,
        };

    public bool IsWidthInRange(int widthCm) => widthCm >= MinWidthCm && widthCm <= MaxWidthCm;
    public bool IsHeightInRange(int heightCm) => heightCm >= MinHeightCm && heightCm <= MaxHeightCm;
}
