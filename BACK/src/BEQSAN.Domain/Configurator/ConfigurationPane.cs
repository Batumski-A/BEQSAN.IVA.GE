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
/// </para>
/// </summary>
public sealed record ConfigurationPane(
    int Position,
    decimal WidthRatio,
    PaneOpeningType OpeningType,
    HingeSide? HingeSide,
    bool HasMosquitoNet);
