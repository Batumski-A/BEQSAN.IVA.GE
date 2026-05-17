using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Application.Catalog.GetLockTypes;

public sealed record LockTypeDto(
    Guid Id,
    string Slug,
    LocalizedText Name,
    LocalizedText ShortDescription,
    string Grade,
    int SecurityRating,
    bool RequiresCasementOrTurn,
    int SurchargePerPaneMinor,
    string SurchargeDisplay,
    string Currency,
    bool IsDefault,
    int SortOrder);
