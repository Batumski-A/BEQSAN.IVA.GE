using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Application.Catalog.GetGlassTypesByMaterial;

/// <summary>
/// Public-API shape for a GlassType available to a chosen Material. Wire-stable;
/// surcharge sent as int minor units plus an explicit display string so the
/// SPA never does decimal math on currency values (per ADR-0002).
/// <para>
/// <see cref="IsDefault"/> is the per-material baseline package — the FRONT
/// auto-selects this on Step 5 entry so the price preview is non-empty
/// immediately.
/// </para>
/// </summary>
public sealed record GlassTypeDto(
    Guid Id,
    string Slug,
    LocalizedText Name,
    LocalizedText ShortDescription,
    int PaneCount,
    int SurchargePerSqmMinor,
    string SurchargePerSqmDisplay,
    string Currency,
    decimal UValue,
    bool IsDefault,
    int SortOrder);
