namespace BEQSAN.Domain.Configurator;

/// <summary>
/// Configuration-level installation decision picked at Step 8. Pricing is
/// zone-based (Roman-locked) for Phase 1 — per-km dynamic pricing is
/// Phase-2 work if/when real demand justifies it.
///
/// <para>
/// <see cref="Region"/> drives the surcharge via
/// <see cref="InstallationPricing.SurchargeMinor"/>. Batumi is free
/// (within ~30 km radius), Other → we quote manually after a phone
/// call and surface that intent via <see cref="InstallationPricing.RequiresManualQuote"/>.
/// </para>
/// <para>
/// <see cref="CityHint"/> is an optional free-text breadcrumb for the
/// crew — "Batumi, Khimshiashvili 7" — kept null when the customer
/// hasn't typed anything; only meaningful when paired with
/// <see cref="InstallationRegion.Other"/>.
/// </para>
/// </summary>
public sealed record InstallationOption(
    InstallationRegion Region,
    string? CityHint = null);

public enum InstallationRegion
{
    /// <summary>Batumi + 30 km — free.</summary>
    Batumi = 0,

    /// <summary>Kobuleti, Khelvachauri, Khulo — +100 ₾.</summary>
    KobuletiCoast = 1,

    /// <summary>Ozurgeti, Lanchkhuti, Chokhatauri — +150 ₾.</summary>
    Guria = 2,

    /// <summary>Kutaisi, Tskaltubo, Samtredia — +220 ₾.</summary>
    Imereti = 3,

    /// <summary>Zugdidi, Senaki, Poti — +280 ₾.</summary>
    Samegrelo = 4,

    /// <summary>Tbilisi, Rustavi, anything not on the coast — +400 ₾.</summary>
    EastGeorgia = 5,

    /// <summary>Anything else — Roman calls within an hour and quotes manually.</summary>
    Other = 6,
}

/// <summary>
/// Pure pricing table for installation zones. Roman-locked Phase-1 rates;
/// Phase-2 admin tooling moves these to a per-region PricingRule entity
/// the same way Step-6/7 surcharges will migrate.
/// </summary>
public static class InstallationPricing
{
    public const int KobuletiCoastMinor = 10_000; // 100 ₾
    public const int GuriaMinor = 15_000;          // 150 ₾
    public const int ImeretiMinor = 22_000;        // 220 ₾
    public const int SamegreloMinor = 28_000;      // 280 ₾
    public const int EastGeorgiaMinor = 40_000;    // 400 ₾

    public static int SurchargeMinor(InstallationRegion region) => region switch
    {
        InstallationRegion.Batumi => 0,
        InstallationRegion.KobuletiCoast => KobuletiCoastMinor,
        InstallationRegion.Guria => GuriaMinor,
        InstallationRegion.Imereti => ImeretiMinor,
        InstallationRegion.Samegrelo => SamegreloMinor,
        InstallationRegion.EastGeorgia => EastGeorgiaMinor,
        InstallationRegion.Other => 0, // quoted manually — no auto-line
        _ => 0,
    };

    /// <summary>
    /// True when the chosen region falls outside the standard zone table
    /// and Roman handles the quote on the phone. The
    /// <see cref="PriceCalculator"/> still emits a zero-amount line so the
    /// FRONT can render the "we'll call you" affordance.
    /// </summary>
    public static bool RequiresManualQuote(InstallationRegion region) =>
        region == InstallationRegion.Other;
}
