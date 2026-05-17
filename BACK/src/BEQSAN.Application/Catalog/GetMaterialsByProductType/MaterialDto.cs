using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Application.Catalog.GetMaterialsByProductType;

/// <summary>
/// Public-API shape for a Material. Wire-stable — changes are breaking for codegen.
/// Family + ThermalRating sent as strings (camelCase) for FRONT readability;
/// price kept in minor units (tetri) with an explicit display string so the
/// client never has to do its own decimal math on currency values.
/// </summary>
public sealed record MaterialDto(
    Guid Id,
    Guid ProductTypeId,
    string Slug,
    LocalizedText Name,
    LocalizedText ShortDescription,
    string Family,
    string ThermalRating,
    long BasePricePerSqmMinor,
    string BasePricePerSqmDisplay,
    string Currency,
    int SortOrder);
