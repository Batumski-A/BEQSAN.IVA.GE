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
/// glass type. Frosted + Tinted is rejected by the validator. Null is
/// treated as empty by <see cref="Extras"/> so consumers don't have to
/// coalesce manually.
/// </para>
/// <para>
/// The last two params default so Steps 1-4 call sites that never knew
/// about glass still construct valid panes — pass
/// <c>(Position, WidthRatio, OpeningType, HingeSide, HasMosquitoNet)</c>
/// and the calculator resolves the rest from the material's default
/// glass package.
/// </para>
/// </summary>
public sealed record ConfigurationPane(
    int Position,
    decimal WidthRatio,
    PaneOpeningType OpeningType,
    HingeSide? HingeSide,
    bool HasMosquitoNet,
    Guid GlassTypeId = default,
    IReadOnlyList<GlassExtra>? GlassExtras = null,
    bool HasTransom = false,
    PaneOpeningType TransomOpeningType = PaneOpeningType.Fixed,
    HingeSide? TransomHingeSide = null,
    decimal TransomHeightRatio = 0.3m)
{
    /// <summary>
    /// Null-safe accessor for the extras list — consumers iterate this
    /// instead of <see cref="GlassExtras"/> directly so a pane built from
    /// the 5-arg backcompat constructor doesn't crash on NPE.
    /// </summary>
    public IReadOnlyList<GlassExtra> Extras => GlassExtras ?? [];
}
