namespace BEQSAN.Domain.Configurator;

/// <summary>
/// Per-pane additive treatments layered on top of the chosen GlassType. They
/// stack — a customer can pick "triple-low-e" as the type and still ask for
/// tempered + tinted on the pane in front of a balcony.
///
/// Two treatments are mutually exclusive on the same pane:
/// <see cref="Frosted"/> and <see cref="Tinted"/> — one obscures, the other
/// shades; combining them serves no visible purpose and the validator
/// rejects it.
///
/// Pricing per m² of pane area is in <see cref="GlassExtraPricing.SurchargeMinor"/>.
/// Phase 2 moves these to an admin-editable PricingRule entity; for now
/// Roman locks the rates in code (see ADR-0002 amendment for Step 5).
/// </summary>
public enum GlassExtra
{
    /// <summary>ენერგო-ეფექტური საფარი — heat-reflective coating.</summary>
    LowECoating = 0,

    /// <summary>დაკაჟებული — safety-tempered glass.</summary>
    Tempered = 1,

    /// <summary>მქრქალი — etched / sandblasted for privacy.</summary>
    Frosted = 2,

    /// <summary>ტონირებული — bronze / grey tint, reduces solar gain.</summary>
    Tinted = 3,
}

/// <summary>
/// Pure pricing table for glass extras. Per-pane surcharge in tetri per
/// square metre of pane area. Roman-locked numbers; admin-editable in
/// Phase 2 via the PricingRule entity.
/// </summary>
public static class GlassExtraPricing
{
    public const int LowECoatingPerSqmMinor = 4500; // 45.00 ₾/m²
    public const int TemperedPerSqmMinor = 7000;    // 70.00 ₾/m²
    public const int FrostedPerSqmMinor = 3500;     // 35.00 ₾/m²
    public const int TintedPerSqmMinor = 4000;      // 40.00 ₾/m²

    public static int SurchargeMinor(GlassExtra extra) => extra switch
    {
        GlassExtra.LowECoating => LowECoatingPerSqmMinor,
        GlassExtra.Tempered => TemperedPerSqmMinor,
        GlassExtra.Frosted => FrostedPerSqmMinor,
        GlassExtra.Tinted => TintedPerSqmMinor,
        _ => 0,
    };
}
