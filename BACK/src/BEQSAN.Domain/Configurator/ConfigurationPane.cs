namespace BEQSAN.Domain.Configurator;

/// <summary>
/// A single pane in a multi-pane layout. Value-object record — equality is
/// structural so configurations can be compared and de-duped.
///
/// <para>
/// <see cref="Position"/> is 1-based, left-to-right.
/// <see cref="WidthRatio"/> is 0..1; LayoutValidator enforces that ratios across
/// panes sum to 1.0 within a 0.001 tolerance.
/// <see cref="HingeSide"/> is required for Casement and TiltAndTurn openings,
/// forbidden for Fixed / Tilt / Sliding.
/// <see cref="HasMosquitoNet"/> is a per-pane accessory toggle pricing-wise; the
/// full accessory catalog lands in Step 7.
/// <see cref="GlassTypeId"/> picks one of the GlassType packages compatible
/// with the chosen material. <see cref="Guid.Empty"/> means "let the server
/// pick the default for this material" — the backcompat path that keeps
/// canaries #1, #2, #3 valid (they default to <c>double-standard</c>).
/// <see cref="GlassExtras"/> are additive per-pane treatments on top of the
/// glass type. Frosted + Tinted is rejected by the validator.
/// </para>
/// </summary>
public sealed record ConfigurationPane(
    int Position,
    decimal WidthRatio,
    PaneOpeningType OpeningType,
    HingeSide? HingeSide,
    bool HasMosquitoNet,
    Guid GlassTypeId,
    IReadOnlyList<GlassExtra> GlassExtras)
{
    /// <summary>
    /// Backwards-compat constructor for Steps 1-4 call sites that don't yet
    /// know about glass. Equivalent to picking <see cref="Guid.Empty"/> +
    /// no extras — the calculator resolves this to "material default".
    /// </summary>
    public ConfigurationPane(
        int position,
        decimal widthRatio,
        PaneOpeningType openingType,
        HingeSide? hingeSide,
        bool hasMosquitoNet)
        : this(position, widthRatio, openingType, hingeSide, hasMosquitoNet, Guid.Empty, [])
    {
    }
}
