using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Application.Catalog.GetProductTypeDetail;

/// <summary>
/// Detail shape for a single ProductType — superset of the list DTO with
/// dimension constraints attached. Used by the FRONT to populate Step 3's
/// width/height bounds and by future detail pages.
/// </summary>
public sealed record ProductTypeDetailDto(
    Guid Id,
    string Slug,
    LocalizedText Name,
    LocalizedText ShortDescription,
    string HeroImageUrl,
    int SortOrder,
    DimensionConstraintsDto Constraints);

public sealed record DimensionConstraintsDto(
    int MinWidthCm,
    int MaxWidthCm,
    int MinHeightCm,
    int MaxHeightCm);
