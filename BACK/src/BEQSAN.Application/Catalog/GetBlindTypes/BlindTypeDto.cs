using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Application.Catalog.GetBlindTypes;

public sealed record BlindTypeDto(
    Guid Id,
    string Slug,
    LocalizedText Name,
    LocalizedText ShortDescription,
    string Placement,
    bool SupportsElectric,
    int BaseMountingMinor,
    string BaseMountingDisplay,
    int SurchargePerSqmMinor,
    string SurchargePerSqmDisplay,
    string Currency,
    int SortOrder);
