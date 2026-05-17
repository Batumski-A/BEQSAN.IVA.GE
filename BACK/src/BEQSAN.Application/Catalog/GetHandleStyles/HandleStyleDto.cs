using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Application.Catalog.GetHandleStyles;

public sealed record HandleStyleDto(
    Guid Id,
    string Slug,
    LocalizedText Name,
    LocalizedText ShortDescription,
    string Family,
    string? ImageUrl,
    int SurchargePerPaneMinor,
    string SurchargeDisplay,
    string Currency,
    bool IsDefault,
    int SortOrder);
