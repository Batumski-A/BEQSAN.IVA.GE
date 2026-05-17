using BEQSAN.Domain.ValueObjects;

namespace BEQSAN.Application.Catalog.GetColorsByMaterial;

/// <summary>
/// Public-API shape for a ColorOption available to a chosen Material.
/// Family sent as a string for FRONT readability; surcharge in int minor
/// plus display string so the SPA never does currency math.
/// <para>
/// The <c>ral-custom</c> placeholder slug is filtered out of the list
/// endpoint (it's not browseable) — the FRONT triggers it via the RAL
/// palette modal and passes hex + code in the price request.
/// </para>
/// </summary>
public sealed record ColorOptionDto(
    Guid Id,
    string Slug,
    LocalizedText Name,
    LocalizedText ShortDescription,
    string Family,
    string HexCode,
    string? RalCode,
    string? WoodTextureUrl,
    int SurchargeMinor,
    string SurchargeDisplay,
    string Currency,
    bool IsDefault,
    int SortOrder);
