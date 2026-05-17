using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Application.Catalog.GetProductTypes;

/// <summary>
/// Public-API shape for a catalog entry. Wire-stable — changes here are
/// breaking changes for FRONT codegen.
/// </summary>
public sealed record ProductTypeDto(
    Guid Id,
    string Slug,
    LocalizedText Name,
    LocalizedText ShortDescription,
    string HeroImageUrl,
    int SortOrder);
